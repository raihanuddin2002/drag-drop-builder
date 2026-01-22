import { useEffect, RefObject } from 'react';
import { Block, EditorDocument } from '../type';
import { EDITOR_STYLES, NON_EDITABLE_TAGS } from '../data';
import { generateXPath, isEditableElement } from '../utils';

export interface UseEditorRendererOptions {
   shadowRootRef: RefObject<ShadowRoot | null>;
   shadowReady: boolean;
   editorDocument: EditorDocument;
   isPreviewMode: boolean;
   draggedComponent: Block | null;
   draggedElementRef: RefObject<HTMLElement | null>;
   checkMergeFieldTriggerRef: RefObject<() => void>;
   handleMergeFieldKeyDownRef: RefObject<(e: KeyboardEvent) => void>;
   tablePlaceholderId: string;
   onSaveHistory: () => void;
   onUpdateContent: () => void;
   onCalculatePageBreaks: () => void;
   onSetSelectedXPath: (xpath: string | null) => void;
   onSetDraggedComponent: (component: Block | null) => void;
   onSetTableModalMode: (mode: 'create' | 'resize') => void;
   onShowTableModal: (show: boolean) => void;
   setupPasteHandlers: (element: HTMLElement) => () => void;
}

/**
 * useEditorRenderer - A hook for rendering editor content into shadow DOM
 *
 * Features:
 * - Renders document content into shadow DOM
 * - Sets up event listeners for click, blur, input, keydown
 * - Handles drag and drop for elements
 * - Manages XPath assignment and toolbars
 * - Supports preview mode
 *
 * @example
 * ```tsx
 * useEditorRenderer({
 *   shadowRootRef,
 *   shadowReady,
 *   editorDocument,
 *   isPreviewMode,
 *   draggedComponent,
 *   // ... other options
 * });
 * ```
 */
export function useEditorRenderer({
   shadowRootRef,
   shadowReady,
   editorDocument,
   isPreviewMode,
   draggedComponent,
   draggedElementRef,
   checkMergeFieldTriggerRef,
   handleMergeFieldKeyDownRef,
   tablePlaceholderId,
   onSaveHistory,
   onUpdateContent,
   onCalculatePageBreaks,
   onSetSelectedXPath,
   onSetDraggedComponent,
   onSetTableModalMode,
   onShowTableModal,
   setupPasteHandlers
}: UseEditorRendererOptions) {

   useEffect(() => {
      if (!shadowReady) return;

      const shadow = shadowRootRef.current;
      if (!shadow) return;

      const pagePadding = 40;

      const EditorStylesStr = EDITOR_STYLES({
         currentPageHeight: {
            value: editorDocument?.pageHeight?.value,
            unit: editorDocument?.pageHeight?.unit
         }
      });

      const containerFlowMinHeight = `calc(${editorDocument.pageHeight?.value}${editorDocument.pageHeight?.unit} - ${pagePadding * 2}px) !important`;

      // vh unit will be min-height and px unit will be height
      const pagesContainerHeight = editorDocument.pageHeight?.unit === 'vh' ?
         `min-height: ${editorDocument.pageHeight?.value}${editorDocument.pageHeight?.unit} !important`
         : `height: ${editorDocument.pageHeight?.value}${editorDocument.pageHeight?.unit} !important`;

      shadow.innerHTML = /*html*/`
         <style>
            ${EditorStylesStr}

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
         onCalculatePageBreaks();
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
      onCalculatePageBreaks();

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
                     onSaveHistory();
                     el.remove();
                     onUpdateContent();
                     onSetSelectedXPath(null);
                     onCalculatePageBreaks();
                  }
               } else if (action === 'duplicate') {
                  const el = shadow.querySelector(`[data-xpath="${xpath}"]`) as HTMLElement;
                  if (el && !el.hasAttribute('data-container')) {
                     onSaveHistory();
                     const clone = el.cloneNode(true) as HTMLElement;
                     clone.removeAttribute('data-xpath');
                     clone.removeAttribute('data-selected');
                     el.parentNode?.insertBefore(clone, el.nextSibling);
                     onUpdateContent();
                     onCalculatePageBreaks();
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
               onSetSelectedXPath(xpath);
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
            onSetSelectedXPath(null);
            return;
         }

         if (target.hasAttribute('data-column-container')) {
            const xpath = target.getAttribute('data-xpath');
            if (xpath) {
               mouseEvent.preventDefault();
               mouseEvent.stopPropagation();
               onSetSelectedXPath(xpath);
            }
            return;
         }

         // Handle table container clicks - select the table container
         if (target.hasAttribute('data-table-container')) {
            const xpath = target.getAttribute('data-xpath');
            if (xpath) {
               mouseEvent.preventDefault();
               mouseEvent.stopPropagation();
               onSetSelectedXPath(xpath);
            }
            return;
         }

         // Handle clicks inside table (cells) - select parent table container
         const parentTableContainer = target.closest('[data-table-container="true"]') as HTMLElement;
         if (parentTableContainer && (target.tagName === 'TD' || target.tagName === 'TH' || target.tagName === 'TR' || target.tagName === 'TABLE')) {
            const xpath = parentTableContainer.getAttribute('data-xpath');
            if (xpath) {
               onSetSelectedXPath(xpath);
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
               onSetSelectedXPath(xpath);
            }
         }
      };

      // Blur handler - save and recalculate
      const handleBlur = (e: Event) => {
         const target = e.target as HTMLElement;
         if (target.hasAttribute('contenteditable') && target.hasAttribute('data-xpath')) {
            onSaveHistory();
            onUpdateContent();
            onCalculatePageBreaks();
         }
      };

      // Input handler - live page recalculation and merge field detection
      const handleInput = (e: Event) => {
         onCalculatePageBreaks();
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

            // Always add drag-over to the container for visual feedback
            container.classList.add('drag-over');

            if (!lastChild) {
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
         if (target.classList.contains('drop-zone') || target.hasAttribute('data-container') || target.hasAttribute('data-column-container')) {
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
                  const placeholder = `<div id="${tablePlaceholderId}" style="display:none;"></div>`;

                  dropIndicator.insertAdjacentHTML('beforebegin', placeholder);
                  dropIndicator.remove();

                  // Save placeholder to content before state changes trigger re-render
                  onUpdateContent();
                  onSetDraggedComponent(null);
                  onSetTableModalMode('create');

                  // Use setTimeout to ensure state updates complete before showing modal
                  setTimeout(() => onShowTableModal(true), 0);
                  return;
               }

               onSaveHistory();

               dropIndicator.insertAdjacentHTML('beforebegin', draggedComponent.html);
               dropIndicator.remove();

               onSetDraggedComponent(null);
               onUpdateContent();
               onCalculatePageBreaks();
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
                  const newXPath = generateXPath(dragged, container);
                  onSetSelectedXPath(newXPath);
               }

               onUpdateContent();
               onCalculatePageBreaks();

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
                  const placeholder = `<div id="${tablePlaceholderId}" style="display:none;"></div>`;
                  dropZone.insertAdjacentHTML('beforeend', placeholder);

                  // Save placeholder to content before state changes trigger re-render
                  onUpdateContent();
                  onSetDraggedComponent(null);
                  onSetTableModalMode('create');

                  // Use setTimeout to ensure state updates complete before showing modal
                  setTimeout(() => onShowTableModal(true), 0);
                  return;
               }

               onSaveHistory();

               dropZone.insertAdjacentHTML('beforeend', draggedComponent.html);

               onSetDraggedComponent(null);
               onUpdateContent();
               onCalculatePageBreaks();

               return;
            } else if (dragged && !dropZone.contains(dragged)) {
               onSaveHistory();
               dropZone.appendChild(dragged);
               dragged.classList.remove('dragging');
               draggedElementRef.current = null;

               const container = shadow.querySelector('.content-flow') as HTMLElement;

               if (container) {
                  const newXPath = generateXPath(dragged, container);
                  onSetSelectedXPath(newXPath);
               }

               onUpdateContent();
               onCalculatePageBreaks();

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
   }, [
      editorDocument,
      draggedComponent,
      isPreviewMode,
      shadowReady,
      shadowRootRef,
      draggedElementRef,
      checkMergeFieldTriggerRef,
      handleMergeFieldKeyDownRef,
      tablePlaceholderId,
      onSaveHistory,
      onUpdateContent,
      onCalculatePageBreaks,
      onSetSelectedXPath,
      onSetDraggedComponent,
      onSetTableModalMode,
      onShowTableModal,
      setupPasteHandlers
   ]);
}

export default useEditorRenderer;
