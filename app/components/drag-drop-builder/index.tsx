'use client'

import {
   Download,
   Eye,
   GripVertical,
   Monitor,
   Redo2,
   Smartphone,
   Tablet,
   Undo2,
   Upload
} from "lucide-react";
import { SettingsPanel } from "./SettingsSidebar";
import { useState, useCallback, useRef, useEffect, useMemo } from "react";
import {
   Breakpoint,
   Block,
   ElementInfo,
   EditorDocument,
   Height,
   Width
} from "./type";
import {
   EDITOR_STYLES,
   NON_EDITABLE_TAGS,
   PAGE_PRESETS,
} from "./data";
import {
   applyPaginationMargin,
   generateXPath,
   isEditableElement,
   parseStyles,
   rafThrottle,
   resetPaginationStyling
} from "./utils";
import RichTextToolbar from "./RichEditorToolbar";
import { ElementsSidebar } from "./ElementsSidebar";
import { PageSizeSettings } from "./PageSizeSettings";
// html2pdf is imported dynamically to avoid "self is not defined" error during SSR

const INITIAL_CONTENT = /*html*/`<div class="content-flow" data-container="true"></div>`;

const generateDocId = () => `doc-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
const defaultPagePreset = PAGE_PRESETS.find(p => p.default)!;

export default function DragAndDropBuilder() {
   // Single document with continuous content (MS Word-like)
   const [editorDocument, setEditorDocument] = useState<EditorDocument>(() => ({
      id: generateDocId(),
      name: 'Untitled Document',
      pageWidth: defaultPagePreset.width,
      pageHeight: defaultPagePreset.height,
      content: INITIAL_CONTENT,
      pageFormat: defaultPagePreset?.key,
   }));

   // Calculated page count based on content height
   const [pageCount, setPageCount] = useState(1);

   // Selection state
   const [selectedXPath, setSelectedXPath] = useState<string | null>(null);
   const [breakpoint, setBreakpoint] = useState<Breakpoint>('desktop');
   const [draggedComponent, setDraggedComponent] = useState<Block | null>(null);
   const [isPreviewMode, setIsPreviewMode] = useState<boolean>(false);
   const [editorKey, setEditorKey] = useState<number>(0);

   // History for undo/redo
   const [history, setHistory] = useState<{ past: EditorDocument[]; future: EditorDocument[] }>({ past: [], future: [] });

   // Table size selector modal
   const [showTableModal, setShowTableModal] = useState(false);
   const [tableModalMode, setTableModalMode] = useState<'create' | 'resize'>('create');
   const [tableHover, setTableHover] = useState({ rows: 0, cols: 0 });

   const TABLE_GRID_ROWS = 8;
   const TABLE_GRID_COLS = 10;
   const TABLE_PLACEHOLDER_ID = 'table-placeholder-marker';

   // Generate table HTML
   const generateTableHtml = (rows: number, cols: number): string => {
      let tableHtml = '<div data-table-container="true" style="margin: 10px 0;">';
      tableHtml += '<table style="border-collapse: collapse; width: 100%;">';
      for (let r = 0; r < rows; r++) {
         tableHtml += '<tr>';
         for (let c = 0; c < cols; c++) {
            tableHtml += '<td style="border: 1px solid #ccc; padding: 8px; min-width: 50px;" contenteditable="true">&nbsp;</td>';
         }
         tableHtml += '</tr>';
      }
      tableHtml += '</table>';
      tableHtml += '</div>';
      return tableHtml;
   };

   // Insert table at the placeholder position
   const insertTableAtPosition = (rows: number, cols: number) => {
      const shadow = shadowRootRef.current;
      if (!shadow) return;

      const placeholder = shadow.querySelector(`#${TABLE_PLACEHOLDER_ID}`);
      if (!placeholder) return;

      const tableHtml = generateTableHtml(rows, cols);
      saveHistory();

      placeholder.insertAdjacentHTML('beforebegin', tableHtml);
      placeholder.remove();

      updateContentFromShadow();
      calculatePageBreaksRAF();
      setShowTableModal(false);
      setTableHover({ rows: 0, cols: 0 });
   };

   // Close table modal
   const closeTableModal = () => {
      const shadow = shadowRootRef.current;
      // Clean up placeholder if modal is cancelled (only in create mode)
      if (shadow && tableModalMode === 'create') {
         const placeholder = shadow.querySelector(`#${TABLE_PLACEHOLDER_ID}`);
         if (placeholder) {
            placeholder.remove();
            updateContentFromShadow();
         }
      }
      setShowTableModal(false);
      setTableHover({ rows: 0, cols: 0 });
   };

   // Refs
   const containerRef = useRef<HTMLDivElement | null>(null);
   const shadowRootRef = useRef<ShadowRoot | null>(null);
   const draggedElementRef = useRef<HTMLElement | null>(null);
   const [shadowReady, setShadowReady] = useState(false);

   // Callback ref for shadow DOM attachment
   const setContainerRef = useCallback((node: HTMLDivElement | null) => {
      if (node && !isPreviewMode) {
         containerRef.current = node;
         if (!node.shadowRoot) {
            shadowRootRef.current = node.attachShadow({ mode: 'open' });
         } else {
            shadowRootRef.current = node.shadowRoot;
         }
         setShadowReady(true);
      } else {
         containerRef.current = null;
         shadowRootRef.current = null;
         setShadowReady(false);
      }
   }, [isPreviewMode]);

   // Get selected element from shadow DOM
   const getSelectedElement = (): HTMLElement | null => {
      const shadow = shadowRootRef.current;
      if (!shadow || !selectedXPath) return null;

      return shadow.querySelector(`[data-xpath="${selectedXPath}"]`) as HTMLElement | null;
   };

   // Save history
   const saveHistory = useCallback(() => {
      setHistory(prev => ({
         past: [...prev.past.slice(-50), editorDocument],
         future: []
      }));
   }, [editorDocument]);

   // Undo
   const undo = useCallback(() => {
      setHistory(prev => {
         if (prev.past.length === 0) return prev;
         const newPast = [...prev.past];
         const previous = newPast.pop()!;
         const current = editorDocument;
         setEditorDocument(previous);
         return { past: newPast, future: [current, ...prev.future] };
      });
   }, [editorDocument]);

   // Redo
   const redo = useCallback(() => {
      setHistory(prev => {
         if (prev.future.length === 0) return prev;
         const [next, ...newFuture] = prev.future;
         const current = editorDocument;
         setEditorDocument(next);
         return { past: [...prev.past, current], future: newFuture };
      });
   }, [editorDocument]);

   // Change page size
   const changePageSize = useCallback(({ width, height }: { width: Width; height: Height }) => {
      saveHistory();
      setEditorDocument(prev => ({ ...prev, pageWidth: width, pageHeight: height }));
   }, [saveHistory]);

   // Extract content from shadow DOM and save to state
   const updateContentFromShadow = useCallback(() => {
      const shadow = shadowRootRef.current;
      if (!shadow) return;

      const contentFlow = shadow.querySelector('.content-flow');
      if (!contentFlow) return;

      const clone = contentFlow.cloneNode(true) as HTMLElement;

      // Clean editor attributes
      clone.querySelectorAll('[data-xpath]').forEach(el => {
         el.removeAttribute('data-xpath');
         el.removeAttribute('data-selected');
         el.removeAttribute('draggable');
      });
      clone.querySelectorAll('[contenteditable]').forEach(el => {
         el.removeAttribute('contenteditable');
      });
      clone.querySelectorAll('.element-toolbar').forEach(el => el.remove());
      clone.querySelectorAll('.drop-indicator').forEach(el => el.remove());
      clone.querySelectorAll('.page-break-spacer').forEach(el => el.remove());

      setEditorDocument(prev => ({ ...prev, content: clone.outerHTML }));
   }, []);

   // Calculate and display page breaks visually using overlay + margin approach
   const calculatePageBreaks = useCallback(() => {
      const shadow = shadowRootRef.current;
      if (!shadow) return;
      if (editorDocument?.pageHeight?.unit === "vh") return;

      const pagesContainer = shadow.querySelector(".pages-container") as HTMLElement | null;
      const contentFlow = shadow.querySelector(".content-flow") as HTMLElement | null;
      const pageOverlay = shadow.querySelector(".page-overlay") as HTMLElement | null;
      if (!pagesContainer || !contentFlow || !pageOverlay) return;

      const PAGE_H = editorDocument?.pageHeight?.value ?? 0;
      if (!PAGE_H) return;

      const PADDING = 40;
      const GAP = 20;
      const USABLE_H = PAGE_H - (PADDING * 2);

      // Blocks you paginate
      const blocks = Array.from(contentFlow.children).filter(el =>
         (el as HTMLElement).hasAttribute("data-xpath")
      ) as HTMLElement[];

      // 0) Cleanup ONLY what pagination added (do not nuke styles)
      pageOverlay.innerHTML = "";
      for (const el of blocks) resetPaginationStyling(el);

      if (blocks.length === 0) {
         setPageCount(1);
         pagesContainer.style.minHeight = `${PAGE_H}px`;
         return;
      }

      // 1) Measure once
      const flowRect = contentFlow.getBoundingClientRect();
      const metrics = blocks.map(el => {
         const r = el.getBoundingClientRect();
         return { el, top: r.top - flowRect.top, height: r.height };
      });

      // 2) Single scan, no drift
      let pageIndex = 1;
      let shift = 0;
      const gapTops: number[] = [];

      const pageBoxTop = (p: number) => (p - 1) * (PAGE_H + GAP);
      const pageContentTop = (p: number) => pageBoxTop(p) + PADDING;

      for (const m of metrics) {
         const simTop = m.top + shift;
         const usedInPage = simTop - pageContentTop(pageIndex);

         if (usedInPage + m.height > USABLE_H && usedInPage > 0) {
            const nextPage = pageIndex + 1;
            const targetTop = pageContentTop(nextPage);
            const add = targetTop - simTop;

            if (add > 0) {
               applyPaginationMargin(m.el, add);
               m.el.setAttribute("data-page-break-before", String(pageIndex));

               shift += add;
               gapTops.push(pageBoxTop(pageIndex) + PAGE_H);
               pageIndex = nextPage;
            }
         }
      }

      const totalPages = pageIndex;
      setPageCount(totalPages);

      // 3) Overlay
      if (gapTops.length) {
         const frag = document.createDocumentFragment();
         gapTops.forEach((top, idx) => {
            const gap = document.createElement("div");
            gap.className = "page-gap";
            gap.style.cssText = `
               position:absolute; left:0; width:100%;
               top:${top}px; height:${GAP}px;
               pointer-events:none;
               display:flex; align-items:center; justify-content:center;
            `;
            const label = document.createElement("div");
            label.className = "page-gap-label";
            label.textContent = `Page ${idx + 2}`;
            gap.appendChild(label);
            frag.appendChild(gap);
         });
         pageOverlay.appendChild(frag);
      }

      // 4) Height
      pagesContainer.style.minHeight = `${(totalPages * PAGE_H) + ((totalPages - 1) * GAP)}px`;

   }, [editorDocument?.pageHeight?.value, editorDocument?.pageHeight?.unit, setPageCount]);

   const calculatePageBreaksRAF = useMemo(() => rafThrottle(calculatePageBreaks), [calculatePageBreaks]);

   // Main render effect - renders content into shadow DOM
   useEffect(() => {
      if (isPreviewMode || !shadowReady) return;

      const shadow = shadowRootRef.current;
      if (!shadow) return;

      const pagePadding = 40;

      const EditorStyles = EDITOR_STYLES({
         currentPageHeight: {
            value: editorDocument?.pageHeight?.value,
            unit: editorDocument?.pageHeight?.unit
         }
      })

      const containerFlowMinHeight = `calc(${editorDocument.pageHeight?.value}${editorDocument.pageHeight?.unit} - ${pagePadding * 2}px) !important`

      // vh unit will be min-height and px unit will be height
      const pagesContainerHeight = editorDocument.pageHeight?.unit === 'vh' ?
         `min-height: ${editorDocument.pageHeight?.value}${editorDocument.pageHeight?.unit} !important`
         : `height: ${editorDocument.pageHeight?.value}${editorDocument.pageHeight?.unit} !important`

      shadow.innerHTML = /*html*/`
         <style>
            ${EditorStyles}

            .pages-wrapper {
               padding: 40px 20px 60px;
               min-height: 100%;
            }

            .document-header {
               width: ${editorDocument.pageWidth?.value}${editorDocument.pageWidth?.unit};
               margin: 0 auto 20px;
               font-size: 12px;
               color: #666;
               display: flex;
               gap: 16px;
            }

            .pages-container {
               position: relative;
               width: ${editorDocument.pageWidth?.value}${editorDocument.pageWidth?.unit};
               margin: 0 auto;
               ${pagesContainerHeight};
               background: white;
               box-shadow: 0 4px 20px rgba(0,0,0,0.15);
               border-radius: 2px;
            }

            .content-flow {
               position: relative;
               min-height: ${containerFlowMinHeight};
               padding: ${pagePadding}px;
               box-sizing: border-box;
            }

            /* Ensure all content elements respect boundaries */
            .content-flow > *:not(.page-break-spacer) {
               max-width: 100%;
               box-sizing: border-box;
            }

            .content-flow img {
               max-width: 100%;
               height: auto;
            }

            /* Empty state */
            .content-flow:empty::before,
            .content-flow:not(:has([data-xpath]))::before {
               content: "Drag elements here...";
               color: #9ca3af;
               font-style: italic;
               display: block;
            }

            /* Page overlay system - visual page indicators without DOM mutation */
            .page-overlay {
               position: absolute;
               top: 0;
               left: 0;
               right: 0;
               bottom: 0;
               pointer-events: none;
               z-index: 0;
            }

            .page-overlay .page {
               position: absolute;
               left: 0;
               right: 0;
               background: transparent;
               border-bottom: 1px dashed #e5e7eb;
            }

            .page-overlay .page-label {
               position: absolute;
               bottom: -12px;
               left: 50%;
               transform: translateX(-50%);
               font-size: 10px;
               color: #9ca3af;
               background: #f3f4f6;
               padding: 2px 12px;
               border-radius: 999px;
               white-space: nowrap;
            }

            .page-overlay .page-gap {
               position: absolute;
               left: 0px;
               box-shadow: rgba(0, 0, 0, 0.1) 0px 20px 20px -20px inset, rgba(0, 0, 0, 0.1) 0px -20px 20px -20px inset;
               display: flex;
               align-items: center;
               justify-content: center;
            }

            .page-overlay .page-gap-label {
               font-size: 11px;
               color: #6b7280;
            }
         </style>
         <div class="pages-wrapper">
            <div class="document-header">
               <span>${editorDocument.name}</span>
               <span style="color: #999;">${editorDocument.pageWidth?.value}${editorDocument.pageWidth?.unit} × ${editorDocument.pageHeight?.value}${editorDocument.pageHeight?.unit}</span>
               <span class="page-count" style="color: #22c55e; font-weight: 500;">1 page</span>
            </div>
            <div class="pages-container">
               <div class="page-overlay"></div>
               ${editorDocument.content}
            </div>
         </div>
      `;

      const pagesWrapper = shadow.querySelector('.pages-wrapper');
      const contentFlow = shadow.querySelector('.content-flow');
      if (!pagesWrapper || !contentFlow) return;

      // Setup elements for editing
      contentFlow.querySelectorAll('*').forEach(el => {
         el.removeAttribute('data-xpath');
         el.removeAttribute('data-selected');
         el.removeAttribute('contenteditable');
         el.removeAttribute('draggable');

         if (!NON_EDITABLE_TAGS.includes(el.tagName)) {
            el.setAttribute('data-editable', 'true');
         }
      });

      // Add XPath and toolbars
      const addXPathData = (el: Element): void => {
         if (el.nodeType !== 1) return;
         if (
            !NON_EDITABLE_TAGS.includes(el.tagName?.toUpperCase())
            && !el.classList.contains('pages-wrapper')
            && !el.classList.contains('pages-container')
            && !el.classList.contains('document-header')
            && !el.classList.contains('element-toolbar')
            && !el.classList.contains('page-break-spacer')
            && !el.closest('.page-break-spacer')
         ) {
            const xpath = generateXPath(el as HTMLElement, contentFlow as HTMLElement);
            el.setAttribute('data-xpath', xpath);

            const isColumnContainer = el.hasAttribute('data-column-container');
            const isTableContainer = el.hasAttribute('data-table-container');
            const shouldHaveToolbar = !el.hasAttribute('data-container') && !el.classList.contains('drop-zone');

            if (shouldHaveToolbar) {
               const toolbar = window.document.createElement('div');
               toolbar.className = isColumnContainer ? 'element-toolbar column-toolbar' : isTableContainer ? 'element-toolbar table-toolbar' : 'element-toolbar';
               toolbar.setAttribute('contenteditable', 'false');
               toolbar.innerHTML = /*html*/`
                  <button class="element-toolbar-btn" data-action="drag" title="Drag">
                     <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="9" cy="5" r="1"/><circle cx="9" cy="12" r="1"/><circle cx="9" cy="19" r="1"/><circle cx="15" cy="5" r="1"/><circle cx="15" cy="12" r="1"/><circle cx="15" cy="19" r="1"/></svg>
                  </button>
                  <button class="element-toolbar-btn" data-action="duplicate" title="Duplicate">
                     <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>
                  </button>
                  <button class="element-toolbar-btn" data-action="delete" title="Delete">
                     <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/></svg>
                  </button>
               `;
               el.insertBefore(toolbar, el.firstChild);

               if (!isColumnContainer && isEditableElement(el as HTMLElement)) {
                  el.setAttribute('contenteditable', 'true');
               }
            }
         }
         Array.from(el.children).forEach(child => {
            if (!child.classList.contains('element-toolbar')) {
               addXPathData(child);
            }
         });
      };

      addXPathData(contentFlow);

      // Calculate page breaks after render
      calculatePageBreaksRAF();

      // Click handler
      const handleClick = (e: Event) => {
         const mouseEvent = e as MouseEvent;
         const target = mouseEvent.target as HTMLElement;

         // Handle toolbar buttons
         const toolbarBtn = target.closest('.element-toolbar-btn');
         if (toolbarBtn) {
            mouseEvent.preventDefault();
            mouseEvent.stopPropagation();
            const action = toolbarBtn.getAttribute('data-action');
            const parentElement = toolbarBtn.closest('[data-xpath]');
            const xpath = parentElement?.getAttribute('data-xpath');

            if (xpath && action) {
               if (action === 'delete') {
                  const el = shadow.querySelector(`[data-xpath="${xpath}"]`) as HTMLElement;
                  if (el && !el.hasAttribute('data-container')) {
                     saveHistory();
                     el.remove();
                     updateContentFromShadow();
                     setSelectedXPath(null);
                     calculatePageBreaksRAF();
                  }
               } else if (action === 'duplicate') {
                  const el = shadow.querySelector(`[data-xpath="${xpath}"]`) as HTMLElement;
                  if (el && !el.hasAttribute('data-container')) {
                     saveHistory();
                     const clone = el.cloneNode(true) as HTMLElement;
                     clone.removeAttribute('data-xpath');
                     clone.removeAttribute('data-selected');
                     el.parentNode?.insertBefore(clone, el.nextSibling);
                     updateContentFromShadow();
                     calculatePageBreaksRAF();
                  }
               }
            }
            return;
         }

         if (target.closest('.element-toolbar')) return;

         // Handle drop-zone inside column container
         const parentColumnContainer = target.closest('[data-column-container="true"]') as HTMLElement;
         if (target.classList.contains('drop-zone') && parentColumnContainer) {
            const xpath = parentColumnContainer.getAttribute('data-xpath');
            if (xpath) {
               mouseEvent.preventDefault();
               mouseEvent.stopPropagation();
               setSelectedXPath(xpath);
            }
            return;
         }

         // Handle container clicks - deselect
         if (target.hasAttribute('data-container') ||
            target.classList.contains('drop-zone') ||
            target.classList.contains('drop-indicator') ||
            target.classList.contains('pages-wrapper') ||
            target.classList.contains('pages-container') ||
            target.classList.contains('page-break-spacer') ||
            target.closest('.page-break-spacer')) {
            setSelectedXPath(null);
            return;
         }

         if (target.hasAttribute('data-column-container')) {
            const xpath = target.getAttribute('data-xpath');
            if (xpath) {
               mouseEvent.preventDefault();
               mouseEvent.stopPropagation();
               setSelectedXPath(xpath);
            }
            return;
         }

         // Handle table container clicks - select the table container
         if (target.hasAttribute('data-table-container')) {
            const xpath = target.getAttribute('data-xpath');
            if (xpath) {
               mouseEvent.preventDefault();
               mouseEvent.stopPropagation();
               setSelectedXPath(xpath);
            }
            return;
         }

         // Handle clicks inside table (cells) - select parent table container
         const parentTableContainer = target.closest('[data-table-container="true"]') as HTMLElement;
         if (parentTableContainer && (target.tagName === 'TD' || target.tagName === 'TH' || target.tagName === 'TR' || target.tagName === 'TABLE')) {
            const xpath = parentTableContainer.getAttribute('data-xpath');
            if (xpath) {
               setSelectedXPath(xpath);
            }
            // Don't return - allow contenteditable to work
         }

         const elementWithXPath = target.closest('[data-xpath]') as HTMLElement;
         if (elementWithXPath && !elementWithXPath.classList.contains('element-toolbar')) {
            const xpath = elementWithXPath.getAttribute('data-xpath');
            if (xpath) {
               if (!elementWithXPath.hasAttribute('contenteditable')) {
                  mouseEvent.preventDefault();
               }
               mouseEvent.stopPropagation();
               setSelectedXPath(xpath);
            }
         }
      };

      // Blur handler - save and recalculate
      const handleBlur = (e: Event) => {
         const target = e.target as HTMLElement;
         if (target.hasAttribute('contenteditable') && target.hasAttribute('data-xpath')) {
            saveHistory();
            updateContentFromShadow();
            calculatePageBreaksRAF();
         }
      };

      // Paste handler
      const handlePaste = (e: ClipboardEvent) => {
         const target = e.target as HTMLElement;
         if (!target.hasAttribute('contenteditable')) return;

         e.preventDefault();
         const plainText = e.clipboardData?.getData('text/plain') || '';
         window.document.execCommand('insertText', false, plainText);
         saveHistory();
         updateContentFromShadow();
         calculatePageBreaksRAF();
      };

      // Input handler - live page recalculation
      const handleInput = () => {
         calculatePageBreaksRAF();
      };

      pagesWrapper.addEventListener('click', handleClick);
      pagesWrapper.addEventListener('paste', handlePaste as EventListener);
      pagesWrapper.addEventListener('focusout', handleBlur as EventListener);
      pagesWrapper.addEventListener('input', handleInput);

      // Setup drag handlers
      const allDragBtns = shadow.querySelectorAll('.element-toolbar-btn[data-action="drag"]');
      allDragBtns.forEach(dragBtn => {
         const el = dragBtn.closest('[data-xpath]') as HTMLElement;
         if (!el) return;

         (dragBtn as HTMLElement).draggable = true;
         dragBtn.addEventListener('dragstart', (e: Event) => {
            const dragEvent = e as DragEvent;
            dragEvent.stopPropagation();
            draggedElementRef.current = el;
            el.classList.add('dragging');
            if (dragEvent.dataTransfer) {
               dragEvent.dataTransfer.effectAllowed = 'move';
               dragEvent.dataTransfer.setData('text/plain', 'element');
            }
         });

         dragBtn.addEventListener('dragend', () => {
            if (draggedElementRef.current) {
               draggedElementRef.current.classList.remove('dragging');
               shadow.querySelectorAll('.drop-indicator').forEach(ind => ind.remove());
               shadow.querySelectorAll('.drag-over').forEach(zone => zone.classList.remove('drag-over'));
               draggedElementRef.current = null;
            }
         });
      });

      // Drag over handler
      const handleDragOver = (e: Event) => {
         const dragEvent = e as DragEvent;
         dragEvent.preventDefault();

         const target = dragEvent.target as HTMLElement;
         const dragged = draggedElementRef.current;

         if (!draggedComponent && !dragged) return;

         const calculateInsertionPoint = (container: HTMLElement, mouseY: number) => {
            const children = Array.from(
               container.querySelectorAll(':scope > [data-xpath]:not(.drop-zone):not(.drop-indicator)')
            ) as HTMLElement[];

            const validChildren = dragged
               ? children.filter(child => child !== dragged && !child.contains(dragged) && !dragged.contains(child))
               : children;

            if (validChildren.length === 0) {
               return { insertBefore: null, lastChild: null };
            }

            let insertBeforeElement: HTMLElement | null = null;
            for (const child of validChildren) {
               const rect = child.getBoundingClientRect();
               const centerY = rect.top + rect.height / 2;
               if (mouseY < centerY) {
                  insertBeforeElement = child;
                  break;
               }
            }

            return {
               insertBefore: insertBeforeElement,
               lastChild: validChildren[validChildren.length - 1]
            };
         };

         const placeIndicator = (container: HTMLElement, insertBefore: HTMLElement | null, lastChild: HTMLElement | null) => {
            shadow.querySelectorAll('.drag-over').forEach(z => z.classList.remove('drag-over'));
            shadow.querySelector('.drop-indicator')?.remove();

            if (!lastChild) {
               container.classList.add('drag-over');
               return;
            }

            const indicator = window.document.createElement('div');
            indicator.className = 'drop-indicator';

            if (insertBefore) {
               insertBefore.parentNode?.insertBefore(indicator, insertBefore);
            } else {
               lastChild.parentNode?.insertBefore(indicator, lastChild.nextSibling);
            }
         };

         // Check for drop-zone (column)
         const dropZone = target.closest('.drop-zone') as HTMLElement;
         if (dropZone) {
            const { insertBefore, lastChild } = calculateInsertionPoint(dropZone, dragEvent.clientY);
            placeIndicator(dropZone, insertBefore, lastChild);
            return;
         }

         // Check for content container
         const container = target.closest('[data-container="true"]') as HTMLElement;
         if (container) {
            const { insertBefore, lastChild } = calculateInsertionPoint(container, dragEvent.clientY);
            placeIndicator(container, insertBefore, lastChild);
         }
      };

      const handleDragLeave = (e: Event) => {
         const target = e.target as HTMLElement;
         if (target.classList.contains('drop-zone') || target.hasAttribute('data-container')) {
            target.classList.remove('drag-over');
         }
      };

      // Drop handler
      const handleDrop = (e: Event) => {
         const dragEvent = e as DragEvent;
         dragEvent.preventDefault();
         dragEvent.stopPropagation();

         const target = dragEvent.target as HTMLElement;
         const dragged = draggedElementRef.current;

         const dropIndicator = shadow.querySelector('.drop-indicator') as HTMLElement;
         shadow.querySelectorAll('.drag-over').forEach(zone => zone.classList.remove('drag-over'));

         if (dropIndicator) {
            // elements block
            if (draggedComponent) {
               // Check if it's a table block - insert placeholder and show modal
               if (draggedComponent.id === 'table') {
                  const placeholder = `<div id="${TABLE_PLACEHOLDER_ID}" style="display:none;"></div>`;
                  dropIndicator.insertAdjacentHTML('beforebegin', placeholder);
                  dropIndicator.remove();
                  // Save placeholder to content before state changes trigger re-render
                  updateContentFromShadow();
                  setDraggedComponent(null);
                  setTableModalMode('create');
                  // Use setTimeout to ensure state updates complete before showing modal
                  setTimeout(() => setShowTableModal(true), 0);
                  return;
               }

               saveHistory();
               dropIndicator.insertAdjacentHTML('beforebegin', draggedComponent.html);
               dropIndicator.remove();
               setDraggedComponent(null);
               updateContentFromShadow();
               calculatePageBreaksRAF();
               return;
            } else if (dragged) {
               // reordering elements
               dropIndicator.parentNode?.insertBefore(dragged, dropIndicator);
               dropIndicator.remove();
               dragged.classList.remove('dragging');
               draggedElementRef.current = null;

               // Recalculate XPath for the moved element and siblings to update selection
               const container = shadow.querySelector('.content-flow') as HTMLElement;

               if (container) {
                  // // Update XPath for all siblings to avoid conflicts
                  // const parent = dragged.parentElement;
                  // if (parent) {
                  //    Array.from(parent.children).forEach(child => {
                  //       if (child.hasAttribute('data-xpath')) {
                  //          const xpath = generateXPath(child as HTMLElement, container);
                  //          child.setAttribute('data-xpath', xpath);
                  //       }
                  //    });
                  // }
                  const newXPath = generateXPath(dragged, container);
                  setSelectedXPath(newXPath);
               }

               updateContentFromShadow();
               calculatePageBreaksRAF();

               return;
            }
         }

         shadow.querySelectorAll('.drop-indicator').forEach(ind => ind.remove());

         // Containers
         const dropZone = target.closest('.drop-zone, [data-container="true"]') as HTMLElement;

         if (dropZone) {
            if (draggedComponent) {
               // Check if it's a table block - insert placeholder and show modal
               if (draggedComponent.id === 'table') {
                  const placeholder = `<div id="${TABLE_PLACEHOLDER_ID}" style="display:none;"></div>`;
                  dropZone.insertAdjacentHTML('beforeend', placeholder);
                  // Save placeholder to content before state changes trigger re-render
                  updateContentFromShadow();
                  setDraggedComponent(null);
                  setTableModalMode('create');
                  // Use setTimeout to ensure state updates complete before showing modal
                  setTimeout(() => setShowTableModal(true), 0);
                  return;
               }

               saveHistory();
               dropZone.insertAdjacentHTML('beforeend', draggedComponent.html);
               setDraggedComponent(null);
               updateContentFromShadow();
               calculatePageBreaksRAF();

               return;
            } else if (dragged && !dropZone.contains(dragged)) {
               saveHistory();
               dropZone.appendChild(dragged);
               dragged.classList.remove('dragging');
               draggedElementRef.current = null;

               const container = shadow.querySelector('.content-flow') as HTMLElement;

               if (container) {
                  // Update XPath for all siblings to avoid conflicts
                  // const parent = dragged.parentElement;
                  // if (parent) {
                  //    Array.from(parent.children).forEach(child => {
                  //       if (child.hasAttribute('data-xpath')) {
                  //          const xpath = generateXPath(child as HTMLElement, container);
                  //          child.setAttribute('data-xpath', xpath);
                  //       }
                  //    });
                  // }
                  const newXPath = generateXPath(dragged, container);
                  setSelectedXPath(newXPath);
               }

               updateContentFromShadow();
               calculatePageBreaksRAF();

               return;
            }
         }

         if (dragged) {
            dragged.classList.remove('dragging');
            draggedElementRef.current = null;
         }
      };

      pagesWrapper.addEventListener('dragover', handleDragOver);
      pagesWrapper.addEventListener('dragleave', handleDragLeave);
      pagesWrapper.addEventListener('drop', handleDrop);

      // Prevent mousedown on action buttons from affecting contenteditable
      const actionBtns = shadow.querySelectorAll('.element-toolbar-btn[data-action="duplicate"], .element-toolbar-btn[data-action="delete"]');
      actionBtns.forEach(btn => {
         btn.addEventListener('mousedown', (e: Event) => {
            e.preventDefault();
            e.stopPropagation();
         });
      });

      return () => {
         pagesWrapper.removeEventListener('click', handleClick);
         pagesWrapper.removeEventListener('paste', handlePaste as EventListener);
         pagesWrapper.removeEventListener('focusout', handleBlur as EventListener);
         pagesWrapper.removeEventListener('input', handleInput);
         pagesWrapper.removeEventListener('dragover', handleDragOver);
         pagesWrapper.removeEventListener('dragleave', handleDragLeave);
         pagesWrapper.removeEventListener('drop', handleDrop);
      };
   }, [editorDocument, draggedComponent, saveHistory, updateContentFromShadow, calculatePageBreaksRAF, editorKey, isPreviewMode, shadowReady]);

   // Update selection highlight
   useEffect(() => {
      const shadow = shadowRootRef.current;
      if (!shadow) return;

      shadow.querySelectorAll('[data-selected]').forEach(el => el.removeAttribute('data-selected'));

      if (selectedXPath) {
         const el = shadow.querySelector(`[data-xpath="${selectedXPath}"]`);
         if (el) {
            el.setAttribute('data-selected', 'true');
            setSelectedXPath(selectedXPath);
         }
      }
   }, [selectedXPath, editorDocument]);

   // Element manipulation functions
   const updateContent = (value: string, isHtml: boolean = false): void => {
      const shadow = shadowRootRef.current;
      if (!selectedXPath || !shadow) return;

      const el = shadow.querySelector(`[data-xpath="${selectedXPath}"]`) as HTMLElement;
      if (el) {
         saveHistory();

         if (isHtml) {
            el.innerHTML = value;
            // Re-add toolbar
            const toolbar = window.document.createElement('div');
            toolbar.className = 'element-toolbar';
            toolbar.setAttribute('contenteditable', 'false');
            toolbar.innerHTML = /*html*/`
               <button class="element-toolbar-btn" data-action="drag" title="Drag">
                  <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="9" cy="5" r="1"/><circle cx="9" cy="12" r="1"/><circle cx="9" cy="19" r="1"/><circle cx="15" cy="5" r="1"/><circle cx="15" cy="12" r="1"/><circle cx="15" cy="19" r="1"/></svg>
               </button>
               <button class="element-toolbar-btn" data-action="duplicate" title="Duplicate">
                  <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>
               </button>
               <button class="element-toolbar-btn" data-action="delete" title="Delete">
                  <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/></svg>
               </button>
            `;
            el.insertBefore(toolbar, el.firstChild);
         } else if (el.tagName === 'IMG') {
            (el as HTMLImageElement).src = value;
         } else {
            el.textContent = value;
         }
         updateContentFromShadow();
         calculatePageBreaksRAF();
      }
   };

   const updateStyle = (prop: string, value: string, livePreview?: boolean): void => {
      const shadow = shadowRootRef.current;
      if (!selectedXPath || !shadow) return;

      const el = shadow.querySelector(`[data-xpath="${selectedXPath}"]`) as HTMLElement;
      if (el) {
         if (!livePreview) saveHistory();
         (el.style as any)[prop] = value;
         if (!livePreview) {
            updateContentFromShadow();
            calculatePageBreaksRAF();
         }
      }
   };

   const updateAttribute = (attr: string, value: string): void => {
      const shadow = shadowRootRef.current;
      if (!selectedXPath || !shadow) return;

      const el = shadow.querySelector(`[data-xpath="${selectedXPath}"]`) as HTMLElement;
      if (el) {
         saveHistory();
         el.setAttribute(attr, value);
         updateContentFromShadow();
      }
   };

   const updateInlineLink = (index: number, href: string): void => {
      const shadow = shadowRootRef.current;
      if (!selectedXPath || !shadow) return;

      const el = shadow.querySelector(`[data-xpath="${selectedXPath}"]`) as HTMLElement;
      if (el) {
         const links = el.querySelectorAll('a');
         if (links[index]) {
            saveHistory();
            links[index].setAttribute('href', href);
            links[index].setAttribute('target', '_blank');
            links[index].setAttribute('rel', 'noopener noreferrer');
            updateContentFromShadow();
         }
      }
   };

   const removeInlineLink = (index: number): void => {
      const shadow = shadowRootRef.current;
      if (!selectedXPath || !shadow) return;

      const el = shadow.querySelector(`[data-xpath="${selectedXPath}"]`) as HTMLElement;
      if (el) {
         const links = el.querySelectorAll('a');
         if (links[index]) {
            saveHistory();
            const link = links[index];
            const fragment = window.document.createDocumentFragment();
            while (link.firstChild) {
               fragment.appendChild(link.firstChild);
            }
            link.parentNode?.replaceChild(fragment, link);
            updateContentFromShadow();
         }
      }
   };

   const updateCustomCss = (css: string): void => {
      const shadow = shadowRootRef.current;
      if (!selectedXPath || !shadow) return;

      const el = shadow.querySelector(`[data-xpath="${selectedXPath}"]`) as HTMLElement;
      if (el) {
         saveHistory();
         el.setAttribute('style', css);
         updateContentFromShadow();
         calculatePageBreaksRAF();
      }
   };

   const deleteElement = (): void => {
      const shadow = shadowRootRef.current;
      if (!selectedXPath || !shadow) return;

      const el = shadow.querySelector(`[data-xpath="${selectedXPath}"]`) as HTMLElement;
      if (el && !el.hasAttribute('data-container')) {
         saveHistory();
         el.remove();
         updateContentFromShadow();
         setSelectedXPath(null);
         calculatePageBreaksRAF();
      }
   };

   const duplicateElement = useCallback(() => {
      const shadow = shadowRootRef.current;
      if (!selectedXPath || !shadow) return;

      const el = shadow.querySelector(`[data-xpath="${selectedXPath}"]`) as HTMLElement;
      if (el && !el.hasAttribute('data-container')) {
         saveHistory();
         const clone = el.cloneNode(true) as HTMLElement;
         clone.removeAttribute('data-xpath');
         clone.removeAttribute('data-selected');
         clone.removeAttribute('contenteditable');
         clone.querySelectorAll('.element-toolbar').forEach(t => t.remove());

         el.parentNode?.insertBefore(clone, el.nextSibling);
         updateContentFromShadow();
         calculatePageBreaksRAF()
      }
   }, [selectedXPath, saveHistory, updateContentFromShadow, calculatePageBreaksRAF]);

   // Table manipulation functions
   const addTableRow = useCallback((position: 'above' | 'below') => {
      const shadow = shadowRootRef.current;
      if (!selectedXPath || !shadow) return;

      const el = shadow.querySelector(`[data-xpath="${selectedXPath}"]`) as HTMLElement;
      if (!el) return;

      const table = el.tagName === 'TABLE' ? el as HTMLTableElement : el.closest('table') as HTMLTableElement;
      if (!table) return;

      const row = el.closest('tr') as HTMLTableRowElement;
      const rowIndex = row ? row.rowIndex : (position === 'above' ? 0 : table.rows.length - 1);
      const colCount = table.rows[0]?.cells.length || 1;

      saveHistory();

      const newRow = table.insertRow(position === 'above' ? rowIndex : rowIndex + 1);
      for (let i = 0; i < colCount; i++) {
         const cell = newRow.insertCell();
         cell.style.cssText = 'border: 1px solid #ccc; padding: 8px; min-width: 50px;';
         cell.setAttribute('contenteditable', 'true');
         cell.innerHTML = '&nbsp;';
      }

      updateContentFromShadow();
      calculatePageBreaksRAF();
   }, [selectedXPath, saveHistory, updateContentFromShadow, calculatePageBreaksRAF]);

   const addTableColumn = useCallback((position: 'left' | 'right') => {
      const shadow = shadowRootRef.current;
      if (!selectedXPath || !shadow) return;

      const el = shadow.querySelector(`[data-xpath="${selectedXPath}"]`) as HTMLElement;
      if (!el) return;

      const table = el.tagName === 'TABLE' ? el as HTMLTableElement : el.closest('table') as HTMLTableElement;
      if (!table) return;

      const cell = el.closest('td, th') as HTMLTableCellElement;
      const colIndex = cell ? cell.cellIndex : (position === 'left' ? 0 : (table.rows[0]?.cells.length || 1) - 1);

      saveHistory();

      for (let i = 0; i < table.rows.length; i++) {
         const newCell = table.rows[i].insertCell(position === 'left' ? colIndex : colIndex + 1);
         newCell.style.cssText = 'border: 1px solid #ccc; padding: 8px; min-width: 50px;';
         newCell.setAttribute('contenteditable', 'true');
         newCell.innerHTML = '&nbsp;';
      }

      updateContentFromShadow();
      calculatePageBreaksRAF();
   }, [selectedXPath, saveHistory, updateContentFromShadow, calculatePageBreaksRAF]);

   const deleteTableRow = useCallback(() => {
      const shadow = shadowRootRef.current;
      if (!selectedXPath || !shadow) return;

      const el = shadow.querySelector(`[data-xpath="${selectedXPath}"]`) as HTMLElement;
      if (!el) return;

      const table = el.tagName === 'TABLE' ? el as HTMLTableElement : el.closest('table') as HTMLTableElement;
      if (!table || table.rows.length <= 1) return;

      const row = el.closest('tr') as HTMLTableRowElement;
      if (!row) return;

      saveHistory();
      table.deleteRow(row.rowIndex);
      updateContentFromShadow();
      calculatePageBreaksRAF();
   }, [selectedXPath, saveHistory, updateContentFromShadow, calculatePageBreaksRAF]);

   const deleteTableColumn = useCallback(() => {
      const shadow = shadowRootRef.current;
      if (!selectedXPath || !shadow) return;

      const el = shadow.querySelector(`[data-xpath="${selectedXPath}"]`) as HTMLElement;
      if (!el) return;

      const table = el.tagName === 'TABLE' ? el as HTMLTableElement : el.closest('table') as HTMLTableElement;
      if (!table || !table.rows[0] || table.rows[0].cells.length <= 1) return;

      const cell = el.closest('td, th') as HTMLTableCellElement;
      if (!cell) return;

      const colIndex = cell.cellIndex;

      saveHistory();
      for (let i = 0; i < table.rows.length; i++) {
         if (table.rows[i].cells[colIndex]) {
            table.rows[i].deleteCell(colIndex);
         }
      }

      updateContentFromShadow();
      calculatePageBreaksRAF();
   }, [selectedXPath, saveHistory, updateContentFromShadow, calculatePageBreaksRAF]);

   const deleteTable = useCallback(() => {
      const shadow = shadowRootRef.current;
      if (!selectedXPath || !shadow) return;

      const el = shadow.querySelector(`[data-xpath="${selectedXPath}"]`) as HTMLElement;
      if (!el) return;

      const table = el.tagName === 'TABLE' ? el as HTMLTableElement : el.closest('table') as HTMLTableElement;
      if (!table) return;

      saveHistory();
      table.remove();
      setSelectedXPath(null);
      updateContentFromShadow();
      calculatePageBreaksRAF();
   }, [selectedXPath, saveHistory, updateContentFromShadow, calculatePageBreaksRAF]);

   // Resize existing table to new dimensions
   const resizeTable = useCallback((newRows: number, newCols: number) => {
      const shadow = shadowRootRef.current;
      if (!selectedXPath || !shadow) return;

      const el = shadow.querySelector(`[data-xpath="${selectedXPath}"]`) as HTMLElement;
      if (!el) return;

      const table = el.tagName === 'TABLE' ? el as HTMLTableElement : el.closest('table') as HTMLTableElement;
      if (!table) return;

      saveHistory();

      const currentRows = table.rows.length;
      const currentCols = table.rows[0]?.cells.length || 0;

      // Adjust rows
      if (newRows > currentRows) {
         // Add rows
         for (let i = currentRows; i < newRows; i++) {
            const newRow = table.insertRow();
            for (let j = 0; j < Math.max(currentCols, newCols); j++) {
               const cell = newRow.insertCell();
               cell.style.cssText = 'border: 1px solid #ccc; padding: 8px; min-width: 50px;';
               cell.setAttribute('contenteditable', 'true');
               cell.innerHTML = '&nbsp;';
            }
         }
      } else if (newRows < currentRows) {
         // Remove rows from the end
         for (let i = currentRows - 1; i >= newRows; i--) {
            table.deleteRow(i);
         }
      }

      // Adjust columns
      const updatedRows = table.rows.length;
      for (let i = 0; i < updatedRows; i++) {
         const row = table.rows[i];
         const currentColsInRow = row.cells.length;

         if (newCols > currentColsInRow) {
            // Add columns
            for (let j = currentColsInRow; j < newCols; j++) {
               const cell = row.insertCell();
               cell.style.cssText = 'border: 1px solid #ccc; padding: 8px; min-width: 50px;';
               cell.setAttribute('contenteditable', 'true');
               cell.innerHTML = '&nbsp;';
            }
         } else if (newCols < currentColsInRow) {
            // Remove columns from the end
            for (let j = currentColsInRow - 1; j >= newCols; j--) {
               row.deleteCell(j);
            }
         }
      }

      updateContentFromShadow();
      calculatePageBreaksRAF();
      setShowTableModal(false);
      setTableHover({ rows: 0, cols: 0 });
   }, [selectedXPath, saveHistory, updateContentFromShadow, calculatePageBreaksRAF]);

   // Open table size modal for resizing
   const openTableResizeModal = useCallback(() => {
      setTableModalMode('resize');
      setShowTableModal(true);
   }, []);

   const handleSidebarDragStart = (component: Block): void => {
      setDraggedComponent(component);
   };

   const handleSidebarDragEnd = (): void => {
      setDraggedComponent(null);
      const shadow = shadowRootRef.current;

      if (shadow) {
         shadow.querySelectorAll('.drag-over').forEach(zone => zone.classList.remove('drag-over'));
      }
   };

   // Rich text format handler
   const handleFormat = useCallback((command: string, value?: string) => {
      const shadow = shadowRootRef.current;
      if (!shadow) return;

      const selection = (shadow as any).getSelection?.() ?? window.document.getSelection();

      if (command === 'unlink') {
         let anchor: HTMLAnchorElement | null = null;

         if (selection && selection.rangeCount > 0) {
            const range = selection.getRangeAt(0);
            let node: Node | null = range.startContainer;

            while (node) {
               if (node.nodeType === Node.ELEMENT_NODE && (node as Element).tagName === 'A') {
                  anchor = node as HTMLAnchorElement;
                  break;
               }
               if (node === shadow || node === window.document.body || !node.parentNode) break;
               node = node.parentNode;
            }
         }

         if (!anchor && selectedXPath) {
            const selectedEl = shadow.querySelector(`[data-xpath="${selectedXPath}"]`);
            if (selectedEl) {
               anchor = selectedEl.tagName === 'A' ? selectedEl as HTMLAnchorElement : selectedEl.querySelector('a');
            }
         }

         if (anchor) {
            saveHistory();
            const fragment = window.document.createDocumentFragment();
            while (anchor.firstChild) {
               fragment.appendChild(anchor.firstChild);
            }
            anchor.parentNode?.replaceChild(fragment, anchor);
            updateContentFromShadow();
         }
         return;
      }

      if (!selection || selection.rangeCount === 0) return;

      if (command === 'fontSize' && value) {
         const range = selection.getRangeAt(0);
         if (!range.collapsed) {
            const span = window.document.createElement('span');
            span.style.fontSize = value;
            try {
               range.surroundContents(span);
               saveHistory();
               updateContentFromShadow();
            } catch {
               window.document.execCommand(command, false, value);
               updateContentFromShadow();
            }
         }
         return;
      }

      if (command === 'fontName' && value) {
         const range = selection.getRangeAt(0);
         if (!range.collapsed) {
            const span = window.document.createElement('span');
            span.style.fontFamily = value;
            try {
               range.surroundContents(span);
               saveHistory();
               updateContentFromShadow();
            } catch {
               window.document.execCommand(command, false, value);
               updateContentFromShadow();
            }
         }
         return;
      }

      if (['justifyLeft', 'justifyCenter', 'justifyRight', 'justifyFull'].includes(command)) return;
      if (command === 'foreColor') return;

      if (command === 'createLink' && value) {
         const range = selection.getRangeAt(0);
         if (!range.collapsed) {
            const anchor = window.document.createElement('a');
            anchor.href = value;
            anchor.target = '_blank';
            anchor.rel = 'noopener noreferrer';
            anchor.style.color = '#2563eb';
            anchor.style.textDecoration = 'underline';
            try {
               range.surroundContents(anchor);
               saveHistory();
               updateContentFromShadow();
            } catch {
               window.document.execCommand(command, false, value);
               updateContentFromShadow();
            }
         }
         return;
      }

      if (command === 'indent' || command === 'outdent') {
         const range = selection.getRangeAt(0);
         let blockElement: HTMLElement | null = null;
         let node: Node | null = range.startContainer;

         while (node) {
            if (node.nodeType === Node.ELEMENT_NODE) {
               const el = node as HTMLElement;
               const display = window.getComputedStyle(el).display;
               if (display === 'block' || display === 'list-item' || ['P', 'DIV', 'LI'].includes(el.tagName)) {
                  blockElement = el;
                  break;
               }
            }
            if (node === shadow || !node.parentNode) break;
            node = node.parentNode;
         }

         if (blockElement) {
            saveHistory();
            const currentMargin = parseInt(blockElement.style.marginLeft) || 0;
            const step = 20;
            blockElement.style.marginLeft = command === 'indent'
               ? `${currentMargin + step}px`
               : `${Math.max(0, currentMargin - step)}px`;
            updateContentFromShadow();
         }
         return;
      }

      // Handle insertHTML for table insertion
      if (command === 'insertHTML' && value) {
         const range = selection.getRangeAt(0);

         // Find the contenteditable element or content-flow container
         let insertTarget: HTMLElement | null = null;
         let node: Node | null = range.startContainer;

         while (node) {
            if (node.nodeType === Node.ELEMENT_NODE) {
               const el = node as HTMLElement;
               if (el.hasAttribute('contenteditable') || el.hasAttribute('data-container')) {
                  insertTarget = el;
                  break;
               }
            }
            if (node === shadow || !node.parentNode) break;
            node = node.parentNode;
         }

         // If no contenteditable found, insert into content-flow
         if (!insertTarget) {
            insertTarget = shadow.querySelector('.content-flow') as HTMLElement;
         }

         if (insertTarget) {
            saveHistory();

            // Create a temporary container to parse the HTML
            const temp = window.document.createElement('div');
            temp.innerHTML = value;

            // Insert at cursor position if inside contenteditable, otherwise append to container
            if (insertTarget.hasAttribute('contenteditable') && !range.collapsed) {
               range.deleteContents();
            }

            const frag = window.document.createDocumentFragment();
            while (temp.firstChild) {
               frag.appendChild(temp.firstChild);
            }

            if (insertTarget.hasAttribute('data-container')) {
               insertTarget.appendChild(frag);
            } else {
               range.insertNode(frag);
            }

            updateContentFromShadow();
            calculatePageBreaksRAF();
         }
         return;
      }

      window.document.execCommand(command, false, value);
      setTimeout(() => updateContentFromShadow(), 0);
   }, [updateContentFromShadow, saveHistory, selectedXPath]);

   // Clean content for export
   const cleanContent = (content: string): string => {
      const parser = new DOMParser();
      const doc = parser.parseFromString(`<div>${content}</div>`, 'text/html');
      const container = doc.body.firstElementChild;
      if (!container) return content;

      container.querySelectorAll('[data-xpath]').forEach(el => {
         el.removeAttribute('data-xpath');
         el.removeAttribute('data-selected');
         el.removeAttribute('draggable');
         el.removeAttribute('contenteditable');
      });
      container.querySelectorAll('.element-toolbar').forEach(el => el.remove());
      container.querySelectorAll('.page-break-spacer').forEach(el => el.remove());
      container.querySelectorAll('[data-editable]').forEach(el => el.removeAttribute('data-editable'));

      return container.innerHTML;
   };

   // Export
   const exportHTML = () => {
      const cleanedContent = cleanContent(editorDocument.content);

      const fullHtml = /*html*/`
         <!DOCTYPE html>
            <html>
               <head>
                  <meta charset="UTF-8">
                  <meta name="viewport" content="width=device-width, initial-scale=1.0">
                  <title>${editorDocument.name}</title>
                  <style>
                     * { box-sizing: border-box; }
                        body { margin: 0; padding: 20px; font-family: system-ui, sans-serif; background: #f5f5f5; }
                        .document {
                           width: ${editorDocument.pageWidth}px;
                           margin: 0 auto;
                           background: white;
                           box-shadow: 0 2px 8px rgba(0,0,0,0.1);
                           min-height: ${editorDocument.pageHeight}px;
                        }
                        @media print {
                           .document { box-shadow: none; margin: 0; }
                        }
                     </style>
                  </head>
                  <body>
                     <div class="document">${cleanedContent}</div>
                  </body>
               </html>
`;

      const blob = new Blob([fullHtml], { type: 'text/html' });
      const url = URL.createObjectURL(blob);
      const a = window.document.createElement('a');
      a.href = url;
      a.download = `${editorDocument.name.replace(/\s+/g, '-').toLowerCase()}.html`;
      a.click();
      URL.revokeObjectURL(url);
   };

   type ExportDoc = {
      name: string;
      content: string; // full HTML string of your editor root snapshot
      engine?: "chromium" | "firefox" | "webkit";
   };


   /**
    * Collect CSS from the live editor shadow root (style tags + stylesheet links).
    * This is what makes font-size/line-height/etc match.
    */
   function collectShadowStyles(shadow: ShadowRoot): { inlineCss: string; linkHrefs: string[] } {
      const inlineCss: string[] = [];
      const linkHrefs: string[] = [];

      shadow.querySelectorAll("style").forEach((s) => {
         inlineCss.push(s.textContent || "");
      });

      shadow.querySelectorAll<HTMLLinkElement>('link[rel="stylesheet"]').forEach((l) => {
         if (l.href) linkHrefs.push(l.href);
      });

      return { inlineCss: inlineCss.join("\n\n"), linkHrefs };
   }

   // ---- Helper: Fix UL/OL markers for html2canvas/html2pdf ----
   function fixListsForCanvas(root: HTMLElement) {
      // 1) Remove native markers so html2canvas doesn't try to render them
      root.querySelectorAll<HTMLElement>("ul, ol").forEach((list) => {
         list.style.listStyleType = "none";
         list.style.paddingLeft = "0px";
         list.style.marginLeft = "0px";
      });

      // 2) UL => "disc" bullet
      root.querySelectorAll<HTMLUListElement>("ul").forEach((ul) => {
         // default margin by browser
         ul.style.marginTop = '16px'
         ul.style.marginBottom = '16px'

         ul.querySelectorAll<HTMLLIElement>("li").forEach((li) => {
            if (li.querySelector(":scope > .pdf-li-row")) return;

            // Wrap existing content
            const row = document.createElement("div");
            row.className = "pdf-li-row";
            row.style.display = "flex";
            row.style.alignItems = "flex-start";
            row.style.gap = "10px";

            const marker = document.createElement("span");
            marker.className = "pdf-ul-marker";
            marker.textContent = "•";
            marker.style.lineHeight = "inherit";
            marker.style.flex = "0 0 auto";
            marker.style.marginTop = "0px";

            const content = document.createElement("div");
            content.className = "pdf-li-content";
            content.style.flex = "1 1 auto";
            content.style.minWidth = "0"; // prevents overflow issues

            // Move all LI children into content
            while (li.firstChild) content.appendChild(li.firstChild);

            row.appendChild(marker);
            row.appendChild(content);

            // Clear LI and insert row
            li.appendChild(row);

            // Indent like a normal list
            li.style.marginLeft = "24px";
         });
      });

      // 3) OL => "1. 2. 3." numbering per list
      root.querySelectorAll<HTMLOListElement>("ol").forEach((ol) => {
         // default margin by browser
         ol.style.marginTop = '16px'
         ol.style.marginBottom = '16px'

         let i = 0;

         Array.from(ol.children).forEach((child) => {
            if (!(child instanceof HTMLLIElement)) return;
            i++;

            if (child.querySelector(":scope > .pdf-li-row")) return;

            const row = document.createElement("div");
            row.className = "pdf-li-row";
            row.style.display = "flex";
            row.style.alignItems = "flex-start";
            row.style.gap = "10px";

            const marker = document.createElement("span");
            marker.className = "pdf-ol-marker";
            marker.textContent = `${i}.`;
            marker.style.lineHeight = "inherit";
            marker.style.flex = "0 0 auto";

            const content = document.createElement("div");
            content.className = "pdf-li-content";
            content.style.flex = "1 1 auto";
            content.style.minWidth = "0";

            while (child.firstChild) content.appendChild(child.firstChild);

            row.appendChild(marker);
            row.appendChild(content);
            child.appendChild(row);

            child.style.marginLeft = "24px";
         });
      });
   }

   // Export PDF using html2pdf.js
   const exportPDFWithHtml2Pdf = async (
      doc: ExportDoc,
      shadowRootRef: React.RefObject<ShadowRoot | null>,
      editorDocument?: { pageWidth?: { value: number; unit: string } } // optional, for width
   ) => {
      const shadow = shadowRootRef.current;
      if (!shadow) throw new Error("Shadow root not ready");

      // Parse snapshot
      const tempDiv = document.createElement("div");
      tempDiv.innerHTML = doc.content;

      // Prefer exporting ONLY the actual content (avoids wrapper CSS mismatch)
      const contentFlow = tempDiv.querySelector(".content-flow") as HTMLElement | null;
      const exportRoot = (contentFlow ?? tempDiv) as HTMLElement;

      // Remove editor-only UI elements
      exportRoot
         .querySelectorAll(".page-overlay, .page-gap, .page-gap-label, .page-count, .element-toolbar")
         .forEach((el) => el.remove());

      // Restore original margin-top if you stored it
      exportRoot.querySelectorAll<HTMLElement>("[data-page-break-before], [data-xpath]").forEach((el) => {
         if (el.dataset.pbOrigMt !== undefined) {
            el.style.marginTop = el.dataset.pbOrigMt;
            delete el.dataset.pbOrigMt;
         }
      });

      // Collect editor CSS from shadow root
      const { inlineCss, linkHrefs } = collectShadowStyles(shadow);

      // --- Create offscreen export container (IMPORTANT: not display:none) ---
      const host = document.createElement("div");
      host.id = "pdf-export-host";

      // Keep it measurable but invisible
      host.style.position = "fixed";
      host.style.left = "-100000px";
      host.style.top = "0";
      host.style.visibility = "hidden";
      host.style.pointerEvents = "none";
      host.style.zIndex = "-1";

      // Width: prefer your document width, else default A4-ish
      host.style.width =
         (editorDocument?.pageWidth?.value && editorDocument?.pageWidth?.unit
            ? `${editorDocument.pageWidth.value}${editorDocument.pageWidth.unit}`
            : "794px");

      const linkHrefsString = linkHrefs.map((href) => `<link rel="stylesheet" href="${href}">`).join("\n");

      // Build export DOM
      host.innerHTML = /* html */ `
    ${linkHrefsString}
    <style>
      /* Ensure consistent box sizing */
      *, *::before, *::after { box-sizing: border-box; }

      /* Bring your editor CSS */
      ${inlineCss}

      /*
        html2pdf DOES NOT respect @page margin reliably (canvas slicing).
        So simulate per-page padding:
        - wrapper has left/right/bottom padding
        - every page start (our break marker) gets top padding
      */
      .pdf-page {
        padding: 40px 40px 40px 40px; /* no top padding here */
      }

      /* Page breaks */
      [data-page-break-before]{
        break-before: page;
        page-break-before: always;

        /* Per-page top padding for page 2+ */
        padding-top: 40px !important;
      }

      /* Keep together only when explicitly marked */
      [data-keep-together="true"]{
        break-inside: avoid;
        page-break-inside: avoid;
      }

      /* Small stability helpers */
      img { max-width: 100%; }
      li { margin: 2px 0; }
      .pdf-ul-marker, .pdf-ol-marker { font-size: 1em; }
    </style>

    <div class="pdf-page">
      ${exportRoot.innerHTML}
    </div>
  `;

      document.body.appendChild(host);

      try {
         // Fix UL/OL markers for canvas rendering
         const pdfPage = host.querySelector(".pdf-page") as HTMLElement | null;
         if (pdfPage) fixListsForCanvas(pdfPage);

         // Wait for fonts/images (recommended)
         // @ts-ignore
         if (document.fonts?.ready) await (document as any).fonts.ready;

         const imgs = Array.from(host.querySelectorAll("img"));
         await Promise.all(
            imgs.map(
               (img) =>
                  img.complete
                     ? Promise.resolve()
                     : new Promise<void>((res) => {
                        img.onload = () => res();
                        img.onerror = () => res();
                     })
            )
         );

         const filename = `${doc.name.replace(/\s+/g, "-").toLowerCase()}.pdf`;

         // Dynamic import to keep bundle smaller
         const html2pdf = (await import("html2pdf.js")).default;

         await (html2pdf() as any)
            .set({
               filename,
               margin: 0, // we use .pdf-page padding instead
               image: { type: "jpeg", quality: 0.98 },
               html2canvas: {
                  scale: 2, // increase to 3/4 if you want sharper (slower)
                  useCORS: true,
                  backgroundColor: "#ffffff",
               },
               jsPDF: { unit: "pt", format: "a4", orientation: "portrait" },

               // Typings may miss this; runtime supports it
               pagebreak: {
                  mode: ["css", "legacy"],
                  before: "[data-page-break-before]",
                  avoid: "[data-keep-together='true']",
               },
            } as any)
            .from(host.querySelector(".pdf-page") as HTMLElement)
            .save();
      } finally {
         host.remove();
      }
   };


   const importHTML = (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;

      const reader = new FileReader();
      reader.onload = (event) => {
         const content = event.target?.result as string;
         if (content) {
            saveHistory();
            const bodyMatch = content.match(/<body[^>]*>([\s\S]*)<\/body>/i);
            const bodyContent = bodyMatch ? bodyMatch[1].trim() : content;

            setEditorDocument(prev => ({
               ...prev,
               content: /*html*/`<div class="content-flow" data-container="true" > ${bodyContent}</div > `
            }));
            setSelectedXPath(null);
         }
      };
      reader.readAsText(file);
      e.target.value = '';
   };

   const getElementInfo = (): ElementInfo | null => {
      const shadow = shadowRootRef.current;
      if (!selectedXPath || !shadow) return null;

      const el = shadow.querySelector(`[data-xpath="${selectedXPath}"]`) as HTMLElement;
      if (!el) return null;

      const customCss = el.getAttribute('style') || '';
      const styles = parseStyles(customCss);
      const tag = el.tagName.toLowerCase();
      const content = el.textContent || '';

      const clone = el.cloneNode(true) as HTMLElement;
      clone.querySelectorAll('.element-toolbar').forEach(t => t.remove());

      const innerHTML = clone.innerHTML;
      const src = el.getAttribute('src') || '';
      const href = el.getAttribute('href') || '';
      const alt = el.getAttribute('alt') || '';
      const isHtmlBlock = el.hasAttribute('data-html-block');

      const inlineLinks: { href: string; text: string; index: number }[] = [];
      el.querySelectorAll('a').forEach((link, index) => {
         inlineLinks.push({ href: link.getAttribute('href') || '', text: link.textContent || '', index });
      });

      // Detect table context
      const isTable = el.tagName === 'TABLE' || el.hasAttribute('data-table-container');
      const tableElement = el.hasAttribute('data-table-container')
         ? el.querySelector('table') as HTMLTableElement | null
         : el.closest('table') as HTMLTableElement | null;
      const isTableCell = ['TD', 'TH'].includes(el.tagName);
      let cellRowIndex: number | undefined;
      let cellColIndex: number | undefined;

      if (isTableCell && el.parentElement) {
         const row = el.parentElement as HTMLTableRowElement;
         cellRowIndex = row.rowIndex;
         cellColIndex = (el as HTMLTableCellElement).cellIndex;
      }

      return {
         tag, styles, content, innerHTML, src, href, alt, isHtmlBlock, customCss, inlineLinks,
         isTable, isTableCell, tableElement, cellRowIndex, cellColIndex
      };
   };

   const elementInfo = getElementInfo();

   return (
      <div className="flex h-screen bg-gray-100">
         {/* Left Sidebar */}
         {!isPreviewMode && (
            <div className="w-52 bg-white border-r flex flex-col">
               <ElementsSidebar onDragStart={handleSidebarDragStart} onDragEnd={handleSidebarDragEnd} />
            </div>
         )}

         {/* Main Canvas */}
         <div className="flex-1 flex flex-col">
            {/* Toolbar */}
            <div className="bg-white border-b p-2 flex items-center justify-between">
               <div className="flex items-center gap-2">
                  <button onClick={undo} disabled={history.past.length === 0} className="p-2 rounded text-gray-600 hover:bg-gray-100 disabled:opacity-50" title="Undo">
                     <Undo2 size={18} />
                  </button>
                  <button onClick={redo} disabled={history.future.length === 0} className="p-2 rounded text-gray-600 hover:bg-gray-100 disabled:opacity-50" title="Redo">
                     <Redo2 size={18} />
                  </button>

                  <div className="w-px h-6 bg-gray-300 mx-2" />

                  <PageSizeSettings
                     currentPage={{
                        width: { value: editorDocument.pageWidth?.value, unit: editorDocument?.pageWidth?.unit },
                        height: { value: editorDocument.pageHeight?.value, unit: editorDocument?.pageHeight?.unit },
                        id: editorDocument.id,
                        name: editorDocument.name,
                        html: ''
                     }}
                     onChangeSize={changePageSize}
                  />

                  <div className="w-px h-6 bg-gray-300 mx-2" />

                  <span className="text-sm text-gray-600 px-2 py-1 bg-green-50 rounded">
                     {pageCount} page{pageCount !== 1 ? 's' : ''}
                  </span>

                  <div className="w-px h-6 bg-gray-300 mx-2" />

                  <button onClick={() => setBreakpoint('desktop')} className={`p-2 rounded ${breakpoint === 'desktop' ? 'bg-green-100 text-green-600' : 'text-gray-600 hover:bg-gray-100'} `}>
                     <Monitor size={18} />
                  </button>
                  <button onClick={() => setBreakpoint('tablet')} className={`p-2 rounded ${breakpoint === 'tablet' ? 'bg-green-100 text-green-600' : 'text-gray-600 hover:bg-gray-100'} `}>
                     <Tablet size={18} />
                  </button>
                  <button onClick={() => setBreakpoint('mobile')} className={`p-2 rounded ${breakpoint === 'mobile' ? 'bg-green-100 text-green-600' : 'text-gray-600 hover:bg-gray-100'} `}>
                     <Smartphone size={18} />
                  </button>
               </div>

               <div className="flex items-center gap-2">
                  <button
                     onClick={() => {
                        if (isPreviewMode) setEditorKey(k => k + 1);
                        else { setSelectedXPath(null) }
                        setIsPreviewMode(!isPreviewMode);
                     }}
                     className={`flex items-center gap-2 px-4 py-2 rounded text-sm ${isPreviewMode ? 'bg-blue-500 text-white hover:bg-blue-600' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'} `}
                  >
                     <Eye size={16} />
                     {isPreviewMode ? 'Exit Preview' : 'Preview'}
                  </button>
                  <label className="flex items-center gap-2 px-4 py-2 bg-gray-100 text-gray-700 rounded hover:bg-gray-200 cursor-pointer text-sm">
                     <Upload size={16} />
                     Import
                     <input type="file" accept=".html,.htm" onChange={importHTML} className="hidden" />
                  </label>

                  <button onClick={() => exportPDFWithHtml2Pdf(editorDocument, shadowRootRef)} className="flex items-center gap-2 px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600 text-sm">
                     <Download size={16} />
                     Export PDF
                  </button>
               </div>
            </div>

            {/* Rich Text Toolbar */}
            {!isPreviewMode && (
               <RichTextToolbar
                  onFormat={handleFormat}
                  onUpdateStyle={updateStyle}
                  onCommitChanges={() => { saveHistory(); updateContentFromShadow(); }}
                  elementInfo={elementInfo}
                  onAddTableRow={addTableRow}
                  onAddTableColumn={addTableColumn}
                  onDeleteTableRow={deleteTableRow}
                  onDeleteTableColumn={deleteTableColumn}
                  onDeleteTable={deleteTable}
                  onOpenTableResize={openTableResizeModal}
               />
            )}

            {/* Canvas */}
            <div className="flex-1 overflow-auto bg-gray-300">
               {isPreviewMode ? (
                  <div className="p-6">
                     <div
                        className="bg-white shadow-lg mx-auto"
                        style={{
                           width: `${editorDocument.pageWidth.value}${editorDocument.pageWidth.unit} `,
                           minHeight: `${(editorDocument.pageHeight?.value || 0) * pageCount}${editorDocument.pageHeight?.unit} `
                        }}
                        dangerouslySetInnerHTML={{ __html: cleanContent(editorDocument.content) }}
                     />
                  </div>
               ) : (
                  <>
                     {draggedComponent && (
                        <div className="bg-green-50 border-b border-green-300 p-3 text-center text-sm text-green-700">
                           <GripVertical className="inline mr-2" size={16} />
                           Dragging <strong>{draggedComponent.label}</strong> - Drop into the document
                        </div>
                     )}
                     <div key={`editor-${editorKey}`} ref={setContainerRef} className="h-full" />
                  </>
               )}
            </div>
         </div>

         {/* Right Sidebar */}
         {!isPreviewMode && (
            <div className={`bg-white border-l transition-all duration-300 ${selectedXPath ? 'w-72' : 'w-0'} overflow-hidden`}>
               {selectedXPath && elementInfo && (
                  <SettingsPanel
                     elementInfo={elementInfo}
                     elementKey={selectedXPath}
                     onUpdateContent={updateContent}
                     onUpdateStyle={updateStyle}
                     onUpdateAttribute={updateAttribute}
                     onUpdateInlineLink={updateInlineLink}
                     onRemoveInlineLink={removeInlineLink}
                     onUpdateCustomCss={updateCustomCss}
                     onCommitChanges={() => { saveHistory(); updateContentFromShadow(); }}
                     onDelete={deleteElement}
                     onDuplicate={duplicateElement}
                     onClose={() => { setSelectedXPath(null) }}
                  />
               )}
            </div>
         )}

         {/* Table Size Selector Modal */}
         {showTableModal && (
            <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
               <div className="bg-white rounded-lg shadow-xl p-6">
                  <div className="text-lg font-medium mb-4">
                     {tableModalMode === 'create' ? 'Insert Table' : 'Resize Table'}
                  </div>
                  <div className="text-sm text-gray-600 mb-3 text-center">
                     {tableHover.rows > 0 ? `${tableHover.rows} × ${tableHover.cols}` : 'Select table size'}
                  </div>
                  <div
                     className="grid gap-1 mb-4"
                     style={{ gridTemplateColumns: `repeat(${TABLE_GRID_COLS}, 1fr)` }}
                  >
                     {Array.from({ length: TABLE_GRID_ROWS * TABLE_GRID_COLS }).map((_, index) => {
                        const row = Math.floor(index / TABLE_GRID_COLS) + 1;
                        const col = (index % TABLE_GRID_COLS) + 1;
                        const isHighlighted = row <= tableHover.rows && col <= tableHover.cols;
                        return (
                           <div
                              key={index}
                              className={`w-5 h-5 border cursor-pointer transition-colors ${
                                 isHighlighted ? 'bg-green-500 border-green-600' : 'bg-white border-gray-300 hover:border-gray-400'
                              }`}
                              onMouseEnter={() => setTableHover({ rows: row, cols: col })}
                              onMouseLeave={() => setTableHover({ rows: 0, cols: 0 })}
                              onClick={() => {
                                 if (tableModalMode === 'create') {
                                    insertTableAtPosition(row, col);
                                 } else {
                                    resizeTable(row, col);
                                 }
                              }}
                           />
                        );
                     })}
                  </div>
                  <div className="flex justify-end">
                     <button
                        onClick={closeTableModal}
                        className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded"
                     >
                        Cancel
                     </button>
                  </div>
               </div>
            </div>
         )}
      </div>
   );
}