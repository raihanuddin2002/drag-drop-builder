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
   generateXPath,
   isEditableElement,
   parseStyles,
   MergeFieldData
} from "./utils";
import RichTextToolbar from "./RichEditorToolbar";
import {
   usePagination,
   usePasteHandler,
   useHistory,
   useTableModal,
   useElementManipulation,
   useTableManipulation,
   useRichText,
   useExport,
   MergeFieldDefinition,
   TABLE_GRID_ROWS,
   TABLE_GRID_COLS,
   TABLE_PLACEHOLDER_ID
} from "./hooks";
import { ElementsSidebar } from "./ElementsSidebar";
import { PageSizeSettings } from "./PageSizeSettings";
// html2pdf is imported dynamically to avoid "self is not defined" error during SSR

const INITIAL_CONTENT = /*html*/`<div class="content-flow" data-container="true"></div>`;

const generateDocId = () => `doc-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
const defaultPagePreset = PAGE_PRESETS.find(p => p.default)!;

export default function DragAndDropBuilder({
   user = {
      name: 'John Doe',
      email: 'john.doe@example.com',
      id: '1',
      company_name: 'Example Company'
   }
}: {
   user?: {
      name: string
      email: string
      id: string,
      company_name: string
   };
}) {
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

   // History for undo/redo - using useHistory hook
   const {
      saveHistory,
      undo,
      redo,
      canUndo,
      canRedo,
      history
   } = useHistory<EditorDocument>(editorDocument, setEditorDocument, { maxHistory: 10 });

   // Refs
   const containerRef = useRef<HTMLDivElement | null>(null);
   const shadowRootRef = useRef<ShadowRoot | null>(null);
   const draggedElementRef = useRef<HTMLElement | null>(null);
   const [shadowReady, setShadowReady] = useState(false);

   // Merge field data - all available data that can be merged
   const mergeFieldData: MergeFieldData = useMemo(() => ({
      user,
      client: user
   }), [user]);

   // Available merge field definitions for autocomplete
   const availableMergeFields: MergeFieldDefinition[] = useMemo(() => [
      { path: 'user.name', label: 'User Name', category: 'User' },
      { path: 'user.email', label: 'User Email', category: 'User' },
      { path: 'user.company_name', label: 'Company Name', category: 'User' },
      { path: 'user.id', label: 'User ID', category: 'User' },
      { path: 'client.name', label: 'Client Name', category: 'Client' },
      { path: 'client.email', label: 'Client Email', category: 'Client' },
      { path: 'client.company_name', label: 'Client Company Name', category: 'Client' },
      { path: 'client.id', label: 'Client ID', category: 'Client' },
   ], []);

   // Merge field autocomplete state
   const [mergeFieldSuggestions, setMergeFieldSuggestions] = useState<{
      show: boolean;
      position: { top: number; left: number };
      query: string;
      selectedIndex: number;
   }>({ show: false, position: { top: 0, left: 0 }, query: '', selectedIndex: 0 });

   // Filter suggestions based on query
   const filteredMergeFields = useMemo(() => {
      if (!mergeFieldSuggestions.query) return availableMergeFields;
      const q = mergeFieldSuggestions.query.toLowerCase();
      return availableMergeFields.filter(f =>
         f.path.toLowerCase().includes(q) ||
         f.label.toLowerCase().includes(q)
      );
   }, [availableMergeFields, mergeFieldSuggestions.query]);

   // Refs to store merge field functions (to avoid dependency issues in useEffect)
   const checkMergeFieldTriggerRef = useRef<() => void>(() => { });
   const handleMergeFieldKeyDownRef = useRef<(e: KeyboardEvent) => void>(() => { });

   // Callback ref for shadow DOM attachment
   const setContainerRef = useCallback((node: HTMLDivElement | null) => {
      if (node) {
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
   }, []);

   // Get selected element from shadow DOM
   const getSelectedElement = (): HTMLElement | null => {
      const shadow = shadowRootRef.current;
      if (!shadow || !selectedXPath) return null;

      return shadow.querySelector(`[data-xpath="${selectedXPath}"]`) as HTMLElement | null;
   };

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

   // Pagination hook - calculates page breaks and renders overlays
   const { calculatePageBreaksRAF } = usePagination({
      shadowRootRef,
      config: {
         pageHeight: editorDocument?.pageHeight?.value ?? 0,
         pageHeightUnit: editorDocument?.pageHeight?.unit ?? 'px',
         padding: 40,
         gap: 20
      },
      onPageCountChange: setPageCount
   });

   // Paste handler hook - sanitizes pasted content
   const { setupPasteHandlers } = usePasteHandler({
      shadowRootRef,
      onAfterPaste: useCallback(() => {
         saveHistory();
         updateContentFromShadow();
         calculatePageBreaksRAF();
      }, [saveHistory, updateContentFromShadow, calculatePageBreaksRAF])
   });

   // Table modal hook - manages table creation/resize modal
   const {
      tableModal,
      setTableHover,
      insertTable: insertTableAtPosition,
      closeModal: closeTableModal,
      openResizeModal: openResizeTableModal,
      setTableModalShow: setShowTableModal,
      setTableModalMode
   } = useTableModal({
      shadowRootRef,
      onSaveHistory: saveHistory,
      onUpdateContent: updateContentFromShadow,
      onCalculatePageBreaks: calculatePageBreaksRAF
   });

   // Destructure table modal state for easier access
   const showTableModal = tableModal.show;
   const tableModalMode = tableModal.mode;
   const tableHover = tableModal.hover;

   // Element manipulation hook
   const {
      updateContent,
      updateStyle,
      updateAttribute,
      updateInlineLink,
      removeInlineLink,
      updateCustomCss,
      deleteElement,
      duplicateElement
   } = useElementManipulation({
      shadowRootRef,
      selectedXPath,
      onSaveHistory: saveHistory,
      onUpdateContent: updateContentFromShadow,
      onCalculatePageBreaks: calculatePageBreaksRAF,
      onClearSelection: () => setSelectedXPath(null)
   });

   // Table manipulation hook
   const {
      addTableRow,
      addTableColumn,
      deleteTableRow,
      deleteTableColumn,
      deleteTable,
      resizeTable
   } = useTableManipulation({
      shadowRootRef,
      selectedXPath,
      onSaveHistory: saveHistory,
      onUpdateContent: updateContentFromShadow,
      onCalculatePageBreaks: calculatePageBreaksRAF,
      onClearSelection: () => setSelectedXPath(null),
      onCloseTableModal: closeTableModal
   });

   // Rich text formatting hook
   const { handleFormat } = useRichText({
      shadowRootRef,
      selectedXPath,
      onSaveHistory: saveHistory,
      onUpdateContent: updateContentFromShadow,
      onCalculatePageBreaks: calculatePageBreaksRAF
   });

   // Export hook
   const { exportPDF } = useExport({
      shadowRootRef,
      mergeFieldData
   });

   // Main render effect - renders content into shadow DOM
   useEffect(() => {
      if (!shadowReady) return;

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

            /* Preview Mode Styles */
            .pages-wrapper[data-preview-mode="true"] {
               padding: 20px;
            }

            .pages-wrapper[data-preview-mode="true"] .document-header {
               display: none;
            }

            .pages-wrapper[data-preview-mode="true"] .pages-container {
               height: auto !important;
               min-height: auto !important;
               box-shadow: none;
            }

            .pages-wrapper[data-preview-mode="true"] .element-toolbar {
               display: none !important;
               visibility: hidden !important;
               opacity: 0 !important;
               pointer-events: none !important;
            }

            .pages-wrapper[data-preview-mode="true"] [data-xpath]:hover,
            .pages-wrapper[data-preview-mode="true"] [data-xpath]:focus,
            .pages-wrapper[data-preview-mode="true"] [data-selected="true"] {
               outline: none !important;
               box-shadow: none !important;
            }

            .pages-wrapper[data-preview-mode="true"] [data-xpath] {
               cursor: default !important;
               pointer-events: none !important;
            }

            .pages-wrapper[data-preview-mode="true"] .content-flow {
               pointer-events: none !important;
            }

            .pages-wrapper[data-preview-mode="true"] [contenteditable],
            .pages-wrapper[data-preview-mode="true"] [contenteditable="true"] {
               cursor: default !important;
               -webkit-user-modify: read-only !important;
               -moz-user-modify: read-only !important;
               user-modify: read-only !important;
               pointer-events: none !important;
               caret-color: transparent !important;
            }

            .pages-wrapper[data-preview-mode="true"] .content-flow:empty::before,
            .pages-wrapper[data-preview-mode="true"] .content-flow:not(:has([data-xpath]))::before {
               display: none;
            }

            .pages-wrapper[data-preview-mode="true"] [data-empty="true"]::before {
               display: none !important;
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

      const pagesWrapper = shadow.querySelector('.pages-wrapper') as HTMLElement;
      const contentFlow = shadow.querySelector('.content-flow');
      if (!pagesWrapper || !contentFlow) return;

      // Set preview mode attribute
      if (isPreviewMode) {
         pagesWrapper.setAttribute('data-preview-mode', 'true');
         // Remove all toolbars and disable editing in preview mode
         shadow.querySelectorAll('.element-toolbar').forEach(el => el.remove());
         shadow.querySelectorAll('[contenteditable]').forEach(el => {
            el.removeAttribute('contenteditable');
         });
         shadow.querySelectorAll('[data-selected]').forEach(el => {
            el.removeAttribute('data-selected');
         });

         // Add data-xpath for pagination calculation in preview mode
         const addXPathForPreview = (el: Element): void => {
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
            }
            Array.from(el.children).forEach(addXPathForPreview);
         };
         Array.from(contentFlow.children).forEach(addXPathForPreview);

         // Calculate page breaks for preview mode
         calculatePageBreaksRAF();
         return;
      } else {
         pagesWrapper.removeAttribute('data-preview-mode');
      }

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
            const isInsideTableContainer = el.closest('[data-table-container="true"]') && !isTableContainer;
            const shouldHaveToolbar = !el.hasAttribute('data-container') && !el.classList.contains('drop-zone') && !isInsideTableContainer;

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

                  // Check if element is empty for placeholder styling
                  const clone = el.cloneNode(true) as HTMLElement;
                  clone.querySelectorAll('.element-toolbar').forEach(t => t.remove());
                  const textContent = clone.textContent?.trim() || '';
                  const isEmpty = textContent === '' || clone.innerHTML.trim() === '' || clone.innerHTML.trim() === '<br>';

                  if (isEmpty) {
                     el.setAttribute('data-empty', 'true');
                     // Add a <br> for cursor positioning if element is completely empty
                     const hasContent = Array.from(el.childNodes).some(node =>
                        (node.nodeType === Node.TEXT_NODE && node.textContent?.trim()) ||
                        (node.nodeType === Node.ELEMENT_NODE && !(node as Element).classList.contains('element-toolbar'))
                     );
                     if (!hasContent) {
                        el.appendChild(document.createElement('br'));
                     }
                  }
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

      // Input handler - live page recalculation and merge field detection
      const handleInput = (e: Event) => {
         calculatePageBreaksRAF();
         // Check for merge field trigger ({{ pattern)
         checkMergeFieldTriggerRef.current();

         // Toggle data-empty attribute for placeholder styling
         const target = e.target as HTMLElement;
         if (target.hasAttribute('contenteditable') && target.hasAttribute('data-xpath')) {
            const clone = target.cloneNode(true) as HTMLElement;
            clone.querySelectorAll('.element-toolbar').forEach(t => t.remove());
            const textContent = clone.textContent?.trim() || '';
            const hasOnlyBr = clone.innerHTML.trim() === '<br>' || clone.innerHTML.trim() === '';

            if (textContent === '' || hasOnlyBr) {
               target.setAttribute('data-empty', 'true');
               // Ensure there's a <br> for cursor positioning
               const hasNonToolbarContent = Array.from(target.childNodes).some(node =>
                  (node.nodeType === Node.TEXT_NODE && node.textContent?.trim()) ||
                  (node.nodeType === Node.ELEMENT_NODE &&
                     !(node as Element).classList.contains('element-toolbar') &&
                     (node as Element).tagName !== 'BR')
               );
               if (!hasNonToolbarContent && !target.querySelector(':scope > br')) {
                  target.appendChild(document.createElement('br'));
               }
            } else {
               target.removeAttribute('data-empty');
            }
         }
      };

      // Keydown handler for merge field autocomplete navigation
      const handleKeyDown = (e: Event) => {
         handleMergeFieldKeyDownRef.current(e as KeyboardEvent);
      };

      pagesWrapper.addEventListener('click', handleClick);
      pagesWrapper.addEventListener('focusout', handleBlur as EventListener);
      pagesWrapper.addEventListener('input', handleInput);
      pagesWrapper.addEventListener('keydown', handleKeyDown);

      // Setup paste handlers using the hook
      const cleanupPasteHandlers = setupPasteHandlers(pagesWrapper);

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
         pagesWrapper.removeEventListener('focusout', handleBlur as EventListener);
         pagesWrapper.removeEventListener('input', handleInput);
         pagesWrapper.removeEventListener('keydown', handleKeyDown);
         pagesWrapper.removeEventListener('dragover', handleDragOver);
         pagesWrapper.removeEventListener('dragleave', handleDragLeave);
         pagesWrapper.removeEventListener('drop', handleDrop);
         cleanupPasteHandlers();
      };
   }, [editorDocument, draggedComponent, saveHistory, updateContentFromShadow, calculatePageBreaksRAF, editorKey, isPreviewMode, shadowReady, setupPasteHandlers]);

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


   // Get caret position for positioning the autocomplete popup
   const getCaretCoordinates = useCallback((): { top: number; left: number } | null => {
      const shadow = shadowRootRef.current;
      if (!shadow) return null;

      const selection = (shadow as any).getSelection?.() ?? window.document.getSelection();
      if (!selection || selection.rangeCount === 0) return null;

      const range = selection.getRangeAt(0);
      const rect = range.getBoundingClientRect();

      return {
         top: rect.bottom + window.scrollY,
         left: rect.left + window.scrollX
      };
   }, []);

   // Check for merge field trigger pattern and show autocomplete
   checkMergeFieldTriggerRef.current = useCallback(() => {
      const shadow = shadowRootRef.current;
      if (!shadow) return;

      const selection = (shadow as any).getSelection?.() ?? window.document.getSelection();
      if (!selection || selection.rangeCount === 0) return;

      const range = selection.getRangeAt(0);
      const textNode = range.startContainer;

      if (textNode.nodeType !== Node.TEXT_NODE) {
         setMergeFieldSuggestions(prev => ({ ...prev, show: false }));
         return;
      }

      const text = textNode.textContent || '';
      const cursorPos = range.startOffset;

      // Find the last {{ before cursor
      const beforeCursor = text.slice(0, cursorPos);
      const lastOpenBrace = beforeCursor.lastIndexOf('{{');

      if (lastOpenBrace === -1) {
         setMergeFieldSuggestions(prev => ({ ...prev, show: false }));
         return;
      }

      // Check if there's a closing }} between {{ and cursor
      const afterOpen = beforeCursor.slice(lastOpenBrace + 2);
      if (afterOpen.includes('}}')) {
         setMergeFieldSuggestions(prev => ({ ...prev, show: false }));
         return;
      }

      // Extract the query (what user typed after {{)
      const query = afterOpen;

      // Get caret position for popup
      const coords = getCaretCoordinates();
      if (!coords) return;

      setMergeFieldSuggestions({
         show: true,
         position: coords,
         query,
         selectedIndex: 0
      });
   }, [getCaretCoordinates]);

   // Insert selected merge field from autocomplete
   const insertMergeFieldFromAutocomplete = useCallback((field: MergeFieldDefinition) => {
      const shadow = shadowRootRef.current;
      if (!shadow) return;

      const selection = (shadow as any).getSelection?.() ?? window.document.getSelection();
      if (!selection || selection.rangeCount === 0) return;

      const range = selection.getRangeAt(0);
      const textNode = range.startContainer;

      if (textNode.nodeType !== Node.TEXT_NODE) return;

      const text = textNode.textContent || '';
      const cursorPos = range.startOffset;
      const beforeCursor = text.slice(0, cursorPos);
      const lastOpenBrace = beforeCursor.lastIndexOf('{{');

      if (lastOpenBrace === -1) return;

      saveHistory();

      // Replace from {{ to cursor with the full merge field
      const newText = text.slice(0, lastOpenBrace) + `{{${field.path}}}` + text.slice(cursorPos);
      textNode.textContent = newText;

      // Move cursor after the inserted token
      const newCursorPos = lastOpenBrace + field.path.length + 4; // 4 = {{}}
      range.setStart(textNode, newCursorPos);
      range.setEnd(textNode, newCursorPos);
      selection.removeAllRanges();
      selection.addRange(range);

      setMergeFieldSuggestions({ show: false, position: { top: 0, left: 0 }, query: '', selectedIndex: 0 });
      updateContentFromShadow();
   }, [saveHistory, updateContentFromShadow]);

   // Handle keyboard navigation in autocomplete
   // Only intercepts keys when autocomplete popup is visible
   handleMergeFieldKeyDownRef.current = useCallback((e: KeyboardEvent) => {
      // Only handle keys if autocomplete is showing with suggestions
      if (!mergeFieldSuggestions.show || filteredMergeFields.length === 0) {
         // Close autocomplete on Escape even if no suggestions
         if (e.key === 'Escape' && mergeFieldSuggestions.show) {
            setMergeFieldSuggestions({ show: false, position: { top: 0, left: 0 }, query: '', selectedIndex: 0 });
         }
         return;
      }

      // Only intercept specific navigation keys for autocomplete
      if (e.key === 'ArrowDown') {
         e.preventDefault();
         e.stopPropagation();
         setMergeFieldSuggestions(prev => ({
            ...prev,
            selectedIndex: (prev.selectedIndex + 1) % filteredMergeFields.length
         }));
      } else if (e.key === 'ArrowUp') {
         e.preventDefault();
         e.stopPropagation();
         setMergeFieldSuggestions(prev => ({
            ...prev,
            selectedIndex: (prev.selectedIndex - 1 + filteredMergeFields.length) % filteredMergeFields.length
         }));
      } else if (e.key === 'Enter' || e.key === 'Tab') {
         e.preventDefault();
         e.stopPropagation();

         const selected = filteredMergeFields[mergeFieldSuggestions.selectedIndex];

         if (selected) {
            insertMergeFieldFromAutocomplete(selected);
         }
      } else if (e.key === 'Escape') {
         e.preventDefault();
         e.stopPropagation();
         setMergeFieldSuggestions({ show: false, position: { top: 0, left: 0 }, query: '', selectedIndex: 0 });
      }
      // All other keys pass through normally (including Shift, Ctrl for selection)
   }, [mergeFieldSuggestions.show, mergeFieldSuggestions.selectedIndex, filteredMergeFields, insertMergeFieldFromAutocomplete]);

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
                        setSelectedXPath(null);
                        setEditorKey(k => k + 1);
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
                     content: editorDocument.content,
                     pageWidth: editorDocument.pageWidth,
                     pageHeight: editorDocument.pageHeight
                  })} className="flex items-center gap-2 px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600 text-sm">
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
                  onOpenTableResize={openResizeTableModal}
               />
            )}

            {/* Canvas */}
            <div className="flex-1 overflow-auto bg-gray-300">
               {!isPreviewMode && draggedComponent && (
                  <div className="bg-green-50 border-b border-green-300 p-3 text-center text-sm text-green-700">
                     <GripVertical className="inline mr-2" size={16} />
                     Dragging <strong>{draggedComponent.label}</strong> - Drop into the document
                  </div>
               )}
               <div key={`editor-${editorKey}`} ref={setContainerRef} className="h-full" />
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
                              className={`w-5 h-5 border cursor-pointer transition-colors ${isHighlighted ? 'bg-green-500 border-green-600' : 'bg-white border-gray-300 hover:border-gray-400'
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

         {/* Merge Field Autocomplete Popup */}
         {mergeFieldSuggestions.show && filteredMergeFields.length > 0 && (
            <div
               className="fixed bg-white border border-gray-200 rounded-lg shadow-lg py-1 z-9999 min-w-[220px] max-h-[200px] overflow-y-auto"
               style={{
                  top: mergeFieldSuggestions.position.top + 4,
                  left: mergeFieldSuggestions.position.left
               }}
               onMouseDown={(e) => e.preventDefault()} // Prevent blur when clicking popup
            >
               <div className="px-3 py-1.5 text-xs font-medium text-gray-500 border-b border-gray-100 bg-gray-50">
                  Merge Fields {mergeFieldSuggestions.query && <span className="text-indigo-600">"{mergeFieldSuggestions.query}"</span>}
               </div>
               {filteredMergeFields.map((field, index) => (
                  <div
                     key={field.path}
                     onMouseDown={(e) => {
                        e.preventDefault(); // Prevent losing focus
                        insertMergeFieldFromAutocomplete(field);
                     }}
                     onMouseEnter={() => setMergeFieldSuggestions(prev => ({ ...prev, selectedIndex: index }))}
                     className={`w-full px-3 py-2 text-left flex items-center gap-2 transition-colors cursor-pointer ${index === mergeFieldSuggestions.selectedIndex
                        ? 'bg-indigo-50 text-indigo-900'
                        : 'hover:bg-gray-50 text-gray-700'
                        }`}
                  >
                     <code className={`text-xs px-1.5 py-0.5 rounded font-mono ${index === mergeFieldSuggestions.selectedIndex
                        ? 'bg-indigo-200 text-indigo-800'
                        : 'bg-gray-100 text-gray-600'
                        }`}>
                        {field.path}
                     </code>
                     <span className="text-sm">{field.label}</span>
                  </div>
               ))}
               <div className="px-3 py-1.5 text-xs text-gray-400 border-t border-gray-100 bg-gray-50">
                  <kbd className="px-1 py-0.5 bg-gray-200 rounded text-gray-600">↑↓</kbd> navigate
                  <span className="mx-2">·</span>
                  <kbd className="px-1 py-0.5 bg-gray-200 rounded text-gray-600">Enter</kbd> select
                  <span className="mx-2">·</span>
                  <kbd className="px-1 py-0.5 bg-gray-200 rounded text-gray-600">Esc</kbd> close
               </div>
            </div>
         )}
      </div>
   );
}