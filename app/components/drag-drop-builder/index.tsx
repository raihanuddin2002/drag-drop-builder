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
import { useState, useCallback, useRef, useEffect } from "react";
import {
   Breakpoint,
   Block,
   EditorDocument,
   ElementInfo,
   Height,
   Width
} from "./type";
import {
   EDITOR_STYLES,
   NON_EDITABLE_TAGS,
} from "./data";
import {
   generateXPath,
   isEditableElement,
   parseStyles
} from "./utils";
import RichTextToolbar from "./RichEditorToolbar";
import { ElementsSidebar } from "./ElementsSidebar";
import { defaultPagePreset, PageSizeSettings } from "./PageSizeSettings";

const generateDocId = () => `doc-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

export default function DragAndDropEditor() {
   // Single document with continuous content (MS Word-like)
   const [editorDocument, setEditorDocument] = useState<EditorDocument>(() => ({
      id: generateDocId(),
      name: generateDocId(),
      pageWidth: defaultPagePreset?.width,
      pageHeight: defaultPagePreset?.height,
      content: /*html*/`<div class="content-flow" data-container="true"></div>`,
   }));

   // Calculated page count based on content height
   const [pageCount, setPageCount] = useState(1);

   // Selection state
   const [selectedXPath, setSelectedXPath] = useState<string | null>(null);
   const [selectedElement, setSelectedElement] = useState<HTMLElement | null>(null);
   const [breakpoint, setBreakpoint] = useState<Breakpoint>('desktop');
   const [draggedComponent, setDraggedComponent] = useState<Block | null>(null);
   const [isPreviewMode, setIsPreviewMode] = useState(false);
   const [editorKey, setEditorKey] = useState(0);

   // History for undo/redo
   const [history, setHistory] = useState<{ past: EditorDocument[]; future: EditorDocument[] }>({ past: [], future: [] });

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

   // Save history
   const saveHistory = useCallback(() => {
      setHistory(prev => ({
         past: [...prev.past.slice(-10), editorDocument],
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
   // const calculatePageBreaks = useCallback(() => {
   //    const shadow = shadowRootRef.current;
   //    if (!shadow) return;

   //    const pagesContainer = shadow.querySelector('.pages-container') as HTMLElement;
   //    const contentFlow = shadow.querySelector('.content-flow') as HTMLElement;
   //    const pageOverlay = shadow.querySelector('.page-overlay') as HTMLElement;

   //    if (!pagesContainer || !contentFlow || !pageOverlay) return;
   //    if (editorDocument?.pageHeight?.unit === 'vh') return;

   //    const pageHeight = editorDocument.pageHeight?.value;
   //    const pagePadding = 40;
   //    const pageGap = 20;

   //    // Content area per page (minus padding top and padding bottom)
   //    const usablePageHeight = pageHeight - (pagePadding * 2);

   //    // Clear existing overlays and reset margins
   //    pageOverlay.innerHTML = '';
   //    contentFlow.querySelectorAll('[data-xpath]').forEach(el => {
   //       (el as HTMLElement).style.removeProperty('margin-top');
   //       (el as HTMLElement).removeAttribute('data-page-break-before');
   //    });

   //    // Get content elements
   //    const getBlocks = () => {
   //       const contentRect = contentFlow.getBoundingClientRect();
   //       return Array.from(contentFlow.children)
   //          .filter(el => el.hasAttribute('data-xpath'))
   //          .map(el => {
   //             const rect = el.getBoundingClientRect();
   //             return {
   //                el: el as HTMLElement,
   //                top: rect.top - contentRect.top,
   //                height: rect.height,
   //                bottom: rect.top - contentRect.top + rect.height
   //             };
   //          });
   //    };

   //    // First pass: calculate content height without gaps
   //    let blocks = getBlocks();
   //    let contentHeight = 0;
   //    if (blocks.length > 0) {
   //       const lastBlock = blocks[blocks.length - 1];
   //       contentHeight = lastBlock.bottom;
   //    }

   //    // Calculate number of pages needed
   //    const totalPages = Math.max(1, Math.ceil(contentHeight / usablePageHeight));
   //    setPageCount(totalPages);

   //    // Add margins to elements at page breaks to push content down
   //    if (totalPages > 1) {
   //       let cumulativeOffset = 0;

   //       for (let pageNum = 1; pageNum < totalPages; pageNum++) {
   //          // Recalculate blocks after each margin addition
   //          blocks = getBlocks();

   //          // Where this page break should occur (accounting for previous gaps)
   //          const breakPoint = (pageNum * usablePageHeight) + (cumulativeOffset);

   //          // Find the first element that crosses or starts after the break point
   //          let breakElement: HTMLElement | null = null;

   //          for (const block of blocks) {
   //             // If element starts after break point or crosses it, this is where we break
   //             if (block.top >= breakPoint || (block.top < breakPoint && block.bottom > breakPoint)) {
   //                breakElement = block.el;
   //                break;
   //             }
   //          }

   //          if (breakElement && !breakElement.hasAttribute('data-page-break-before')) {
   //             // Calculate how much to push down
   //             const blockRect = breakElement.getBoundingClientRect();
   //             const contentRect = contentFlow.getBoundingClientRect();
   //             const currentTop = blockRect.top - contentRect.top;

   //             /* 
   //                | Page 1 content
   //                | (40px bottom padding)
   //                |------------------  ← page break
   //                | (20px page gap)
   //                | (40px top padding)  ← now correct
   //                | Page 2 content
   //                * 1page end and 2nd page start should be same space -> targetTop (pagePadding * 2) added
   //             */
   //             const targetTop = breakPoint + pageGap + (pagePadding * 2);
   //             const marginNeeded = targetTop - currentTop;

   //             if (marginNeeded > 0) {
   //                const existingMargin = parseFloat(window.getComputedStyle(breakElement).marginTop) || 0;
   //                breakElement.style.marginTop = `${existingMargin + marginNeeded}px`;
   //                breakElement.setAttribute('data-page-break-before', String(pageNum));
   //                cumulativeOffset += pageGap;
   //             }
   //          }
   //       }
   //    }

   //    // Render page break indicators in overlay
   //    if (totalPages > 1) {
   //       for (let i = 1; i < totalPages; i++) {
   //          // Position at the actual page break location
   //          const breakPosition = (i * usablePageHeight) + ((i - 1) * pageGap);

   //          const pageGapDiv = window.document.createElement('div');
   //          pageGapDiv.className = 'page-gap';
   //          // 1page end and 2nd page start should be same space -> top = breakPosition + pagePadding
   //          pageGapDiv.style.top = `${breakPosition + pagePadding}px`;
   //          pageGapDiv.style.height = `${pageGap}px`; // between 2 page 
   //          pageGapDiv.style.width = `100%`;

   //          const gapLabel = window.document.createElement('div');
   //          gapLabel.className = 'page-gap-label';
   //          gapLabel.textContent = `Page ${i + 1}`;

   //          // page gap with show as part of .page-overlay
   //          pageGapDiv.appendChild(gapLabel);
   //          pageOverlay.appendChild(pageGapDiv);

   //       }
   //    }

   //    // Update container heights
   //    const totalContainerHeight = (totalPages * pageHeight) + ((totalPages - 1) * pageGap);
   //    pagesContainer.style.minHeight = `${totalContainerHeight}px`;
   //    contentFlow.style.minHeight = `${totalContainerHeight - (pagePadding * 2)}px`;

   //    // Update page count display
   //    const pageIndicator = shadow.querySelector('.page-count');
   //    if (pageIndicator) {
   //       pageIndicator.textContent = `${totalPages} page${totalPages !== 1 ? 's' : ''}`;
   //    }
   // }, [editorDocument.pageHeight?.value]);

   const calculatePageBreaks = useCallback(() => {
      const shadow = shadowRootRef.current;
      if (!shadow) return;

      const pagesContainer = shadow.querySelector('.pages-container') as HTMLElement;
      const contentFlow = shadow.querySelector('.content-flow') as HTMLElement;
      const pageOverlay = shadow.querySelector('.page-overlay') as HTMLElement;

      if (!pagesContainer || !contentFlow || !pageOverlay) return;
      if (editorDocument?.pageHeight?.unit === 'vh') return;

      const pageHeight = editorDocument.pageHeight.value;
      const pagePadding = 40;
      const pageGap = 20;
      const usablePageHeight = pageHeight - pagePadding * 2;

      // Reset
      pageOverlay.innerHTML = '';
      const blocks = Array.from(contentFlow.children)
         .filter(el => el.hasAttribute('data-xpath'))
         .map(el => el as HTMLElement);

      blocks.forEach(el => {
         el.style.removeProperty('margin-top');
         el.removeAttribute('data-page-break-before');
      });

      if (!blocks.length) {
         setPageCount(1);
         return;
      }

      /* --------------------------------------------------
         Measure once (DOM read phase)
      -------------------------------------------------- */
      const contentRect = contentFlow.getBoundingClientRect();
      const measured = blocks.map(el => {
         const rect = el.getBoundingClientRect();
         return {
            el,
            height: rect.height,
            initialTop: rect.top - contentRect.top,
            marginTop: parseFloat(getComputedStyle(el).marginTop) || 0
         };
      });

      /* --------------------------------------------------
         Single pass layout simulation (O(n))
      -------------------------------------------------- */
      let cursorY = 0;
      let currentPage = 1;
      let cumulativeGapOffset = 0;

      for (const block of measured) {
         const blockTop = cursorY;
         const blockBottom = blockTop + block.height;

         const pageBottom =
            currentPage * usablePageHeight + cumulativeGapOffset;

         // Does this block cross the page boundary?
         if (blockBottom > pageBottom) {
            const targetTop = pageBottom + pageGap + pagePadding * 2;

            const marginNeeded = targetTop - blockTop;

            if (marginNeeded > 0) {
               block.el.style.marginTop = `${block.marginTop + marginNeeded}px`;
               block.el.setAttribute('data-page-break-before', String(currentPage));

               cursorY += marginNeeded;
               cumulativeGapOffset += pageGap;
            }

            currentPage++;
         }

         cursorY += block.height;
      }

      const totalPages = Math.max(
         1,
         Math.ceil(cursorY / usablePageHeight)
      );

      setPageCount(totalPages);

      /* --------------------------------------------------
         Render page gap overlays
      -------------------------------------------------- */
      for (let i = 1; i < totalPages; i++) {
         const breakPosition =
            i * usablePageHeight + (i - 1) * pageGap;

         const pageGapDiv = window.document.createElement('div');
         pageGapDiv.className = 'page-gap';
         /* 
            | Page 1 content
            | (40px bottom padding)
            |------------------  ← page break
            | (20px page gap)
            | (40px top padding)  ← now correct
            | Page 2 content
            * 1page end and 2nd page start should be same space -> targetTop (pagePadding * 2) added
          */
         pageGapDiv.style.top = `${breakPosition + (pagePadding * 2) + pageGap}px`;
         pageGapDiv.style.height = `${pageGap}px`;
         pageGapDiv.style.width = '100%';

         const label = window.document.createElement('div');
         label.className = 'page-gap-label';
         label.textContent = `Page ${i + 1}`;

         pageGapDiv.appendChild(label);
         pageOverlay.appendChild(pageGapDiv);
      }

      /* --------------------------------------------------
         Update container heights
      -------------------------------------------------- */
      const totalContainerHeight = totalPages * pageHeight + (totalPages - 1) * pageGap;

      pagesContainer.style.minHeight = `${totalContainerHeight}px`;
      contentFlow.style.minHeight = `${totalContainerHeight - (pagePadding * 2)}px`;

      const pageIndicator = shadow.querySelector('.page-count');
      if (pageIndicator) {
         pageIndicator.textContent = `${totalPages} page${totalPages !== 1 ? 's' : ''}`;
      }
   }, [editorDocument.pageHeight?.value]);

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
            const shouldHaveToolbar = !el.hasAttribute('data-container') && !el.classList.contains('drop-zone');

            if (shouldHaveToolbar) {
               const toolbar = window.document.createElement('div');
               toolbar.className = isColumnContainer ? 'element-toolbar column-toolbar' : 'element-toolbar';
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
      requestAnimationFrame(calculatePageBreaks);

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
                     setSelectedElement(null);
                     requestAnimationFrame(calculatePageBreaks);
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
                     requestAnimationFrame(calculatePageBreaks);
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
               setSelectedElement(parentColumnContainer);
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
            setSelectedElement(null);
            return;
         }

         if (target.hasAttribute('data-column-container')) {
            const xpath = target.getAttribute('data-xpath');
            if (xpath) {
               mouseEvent.preventDefault();
               mouseEvent.stopPropagation();
               setSelectedXPath(xpath);
               setSelectedElement(target);
            }
            return;
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
               setSelectedElement(elementWithXPath);
            }
         }
      };

      // Blur handler - save and recalculate
      const handleBlur = (e: Event) => {
         const target = e.target as HTMLElement;
         if (target.hasAttribute('contenteditable') && target.hasAttribute('data-xpath')) {
            saveHistory();
            updateContentFromShadow();
            requestAnimationFrame(calculatePageBreaks);
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
         requestAnimationFrame(calculatePageBreaks);
      };

      // Input handler - live page recalculation
      const handleInput = () => {
         requestAnimationFrame(calculatePageBreaks);
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
            saveHistory();

            // elements block
            if (draggedComponent) {
               dropIndicator.insertAdjacentHTML('beforebegin', draggedComponent.html);
               dropIndicator.remove();
               setDraggedComponent(null);
               updateContentFromShadow();
               requestAnimationFrame(calculatePageBreaks);
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
                  setSelectedElement(dragged);
               }

               updateContentFromShadow();
               requestAnimationFrame(calculatePageBreaks);
               return;
            }
         }

         shadow.querySelectorAll('.drop-indicator').forEach(ind => ind.remove());

         // Containers
         const dropZone = target.closest('.drop-zone, [data-container="true"]') as HTMLElement;

         if (dropZone) {
            if (draggedComponent) {
               saveHistory();
               dropZone.insertAdjacentHTML('beforeend', draggedComponent.html);
               setDraggedComponent(null);
               updateContentFromShadow();
               requestAnimationFrame(calculatePageBreaks);
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
                  setSelectedElement(dragged);
               }

               updateContentFromShadow();
               requestAnimationFrame(calculatePageBreaks);
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
   }, [editorDocument, draggedComponent, saveHistory, updateContentFromShadow, calculatePageBreaks, editorKey, isPreviewMode, shadowReady]);

   // Update selection highlight
   useEffect(() => {
      const shadow = shadowRootRef.current;
      if (!shadow) return;

      shadow.querySelectorAll('[data-selected]').forEach(el => el.removeAttribute('data-selected'));

      if (selectedXPath) {
         const el = shadow.querySelector(`[data-xpath="${selectedXPath}"]`);
         if (el) {
            el.setAttribute('data-selected', 'true');
            setSelectedElement(el as HTMLElement);
         }
      }
   }, [selectedXPath]);

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
         requestAnimationFrame(calculatePageBreaks);
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
            requestAnimationFrame(calculatePageBreaks);
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
         requestAnimationFrame(calculatePageBreaks);
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
         setSelectedElement(null);
         requestAnimationFrame(calculatePageBreaks);
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
         requestAnimationFrame(calculatePageBreaks);
      }
   }, [selectedXPath, saveHistory, updateContentFromShadow, calculatePageBreaks]);

   const handleSidebarDragStart = (block: Block): void => {
      console.log(block);
      setDraggedComponent(block);
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

   const exportPDF = async (doc: {
      name: string;
      content: string;
      engine?: 'chromium' | 'firefox' | 'webkit';
   }) => {
      const tempDiv = window.document.createElement('div');
      tempDiv.innerHTML = doc.content;

      // 1. Remove ONLY the visual labels/overlays
      tempDiv.querySelectorAll('.page-overlay, .page-gap-label').forEach(el => el.remove());

      // 2. Keep the .page-gap divs but make them invisible 
      // (This preserves the exact spacing you calculated)
      tempDiv.querySelectorAll<HTMLElement>('.page-gap').forEach(el => {
         el.style.backgroundColor = 'transparent';
         el.style.border = 'none';
      });

      const pagePadding = '40px';

      const html = /*html*/`
         <!DOCTYPE html>
         <html>
            <head>
               <style>
                  @page { size: A4; margin: 0; }
                  
                  body { 
                     margin: 0; 
                     padding: 0; 
                     width: 210mm; /* Strict A4 width */
                  }

                  .content-wrapper {
                     width: 210mm;
                     margin: 0 auto;
                     /* This padding + the Playwright margin = your total UI padding */
                     padding: 0 40px; 
                  }

                  /* Force your calculated breaks */
                  [data-page-break-before] { 
                     break-before: page; 
                     page-break-before: always;
                     /* Add back the top padding since Playwright margins moved the start point */
                     margin-top: 20px !important; 
                  }

                  /* Keep blocks together */
                  [data-xpath] { break-inside: avoid; }
               </style>
            </head>
            <body>
               <div class="content-wrapper">
                  ${tempDiv.innerHTML}
               </div>
            </body>
         </html>
      `;

      const res = await fetch('/api/export-pdf', {
         method: 'POST',
         headers: { 'Content-Type': 'application/json' },
         body: JSON.stringify({ html, title: doc.name, engine: doc.engine || 'chromium' }),
      });

      if (!res.ok) {
         const err = await res.json();
         throw new Error(err.error || 'PDF export failed');
      }

      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = window.document.createElement('a');
      a.href = url;
      a.download = `${doc.name.replace(/\s+/g, '-').toLowerCase()}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
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
            setSelectedElement(null);
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

      return { tag, styles, content, innerHTML, src, href, alt, isHtmlBlock, customCss, inlineLinks };
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
                        else { setSelectedXPath(null); setSelectedElement(null); }
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
                  <button onClick={() => exportPDF({
                     name: editorDocument.name,
                     content: editorDocument.content
                  })} className="flex items-center gap-2 px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600 text-sm">
                     <Download size={16} />
                     Export
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
                     onClose={() => { setSelectedXPath(null); setSelectedElement(null); }}
                  />
               )}
            </div>
         )}
      </div>
   );
}
