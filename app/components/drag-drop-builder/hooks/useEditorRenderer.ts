import { useEffect, useRef, useCallback, RefObject } from 'react';
import { Block, EditorDocument } from '../type';
import { EDITOR_STYLES, NON_EDITABLE_TAGS } from '../data';
import { generateElementId, isEditableElement } from '../utils';

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
   onSetSelectedEid: (eid: string | null) => void;
   onSetDraggedComponent: (component: Block | null) => void;
   onSetTableModalMode: (mode: 'create' | 'resize') => void;
   onShowTableModal: (show: boolean) => void;
   setupPasteHandlers: (element: HTMLElement) => () => void;
}

/**
 * useEditorRenderer - A hook for rendering editor content into shadow DOM
 *
 * Performance optimized with two-phase rendering:
 * - Effect A: Mounts shell once, attaches event listeners once
 * - Effect B: Updates content/header/preview without full rebuild
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
   onSetSelectedEid,
   onSetDraggedComponent,
   onSetTableModalMode,
   onShowTableModal,
   setupPasteHandlers
}: UseEditorRendererOptions) {

   // Track if shell is mounted
   const mountedRef = useRef(false);
   const cleanupRef = useRef<(() => void) | null>(null);

   // Refs for callbacks to avoid re-attaching listeners
   const callbacksRef = useRef({
      onSaveHistory,
      onUpdateContent,
      onCalculatePageBreaks,
      onSetSelectedEid,
      onSetDraggedComponent,
      onSetTableModalMode,
      onShowTableModal,
      setupPasteHandlers
   });

   // Keep refs updated
   callbacksRef.current = {
      onSaveHistory,
      onUpdateContent,
      onCalculatePageBreaks,
      onSetSelectedEid,
      onSetDraggedComponent,
      onSetTableModalMode,
      onShowTableModal,
      setupPasteHandlers
   };

   // Ref for current state values needed in event handlers
   const stateRef = useRef({
      draggedComponent,
      isPreviewMode,
      tablePlaceholderId
   });

   stateRef.current = {
      draggedComponent,
      isPreviewMode,
      tablePlaceholderId
   };

   // Helper: Add element IDs and toolbars to elements
   const addElementIdsAndToolbars = useCallback((contentFlow: Element, forPreview: boolean) => {
      const addElementIds = (el: Element): void => {
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
            // Only assign ID if element doesn't already have one
            if (!el.getAttribute('data-eid')) {
               el.setAttribute('data-eid', generateElementId());
            }

            if (!forPreview) {
               const isColumnContainer = el.hasAttribute('data-column-container');
               const isTableContainer = el.hasAttribute('data-table-container');
               const isInsideTableContainer = el.closest('[data-table-container="true"]') && !isTableContainer;
               const shouldHaveToolbar = !el.hasAttribute('data-container') && !el.classList.contains('drop-zone') && !isInsideTableContainer;

               // Only add toolbar if not already present
               if (shouldHaveToolbar && !el.querySelector(':scope > .element-toolbar')) {
                  const toolbar = window.document.createElement('div');
                  toolbar.className = isColumnContainer ? 'element-toolbar column-toolbar' : isTableContainer ? 'element-toolbar table-toolbar' : 'element-toolbar';
                  toolbar.setAttribute('contenteditable', 'false');
                  toolbar.innerHTML = /*html*/`
                     <button class="element-toolbar-btn" data-action="drag" title="Drag" draggable="true">
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
         }
         Array.from(el.children).forEach(child => {
            if (!child.classList.contains('element-toolbar')) {
               addElementIds(child);
            }
         });
      };

      Array.from(contentFlow.children).forEach(addElementIds);
   }, []);

   // Effect A: Mount shell once + attach event listeners once
   useEffect(() => {
      if (!shadowReady) return;

      const shadow = shadowRootRef.current;
      if (!shadow) return;

      // Only mount shell once
      if (mountedRef.current) return;
      mountedRef.current = true;

      // Build shell with placeholders for dynamic content
      shadow.innerHTML = /*html*/`
         <style id="editor-dynamic-styles"></style>
         <div class="pages-wrapper">
            <div class="document-header">
               <span class="doc-name"></span>
               <span class="doc-dimensions" style="color: #999;"></span>
               <span class="page-count" style="color: #22c55e; font-weight: 500;">1 page</span>
            </div>
            <div class="pages-container">
               <div class="page-overlay"></div>
               <div class="content-flow" data-container="true"></div>
            </div>
         </div>
      `;

      const pagesWrapper = shadow.querySelector('.pages-wrapper') as HTMLElement;
      const contentFlow = shadow.querySelector('.content-flow') as HTMLElement;
      if (!pagesWrapper || !contentFlow) return;

      // Click handler (delegated)
      const handleClick = (e: Event) => {
         if (stateRef.current.isPreviewMode) return;

         const mouseEvent = e as MouseEvent;
         const target = mouseEvent.target as HTMLElement;
         const { onSaveHistory, onUpdateContent, onCalculatePageBreaks, onSetSelectedEid } = callbacksRef.current;

         // Handle toolbar buttons
         const toolbarBtn = target.closest('.element-toolbar-btn');
         if (toolbarBtn) {
            mouseEvent.preventDefault();
            mouseEvent.stopPropagation();
            const action = toolbarBtn.getAttribute('data-action');
            const parentElement = toolbarBtn.closest('[data-eid]');
            const eid = parentElement?.getAttribute('data-eid');

            if (eid && action) {
               if (action === 'delete') {
                  const el = shadow.querySelector(`[data-eid="${eid}"]`) as HTMLElement;
                  if (el && !el.hasAttribute('data-container')) {
                     onSaveHistory();
                     el.remove();
                     onUpdateContent();
                     onSetSelectedEid(null);
                     onCalculatePageBreaks();
                  }
               } else if (action === 'duplicate') {
                  const el = shadow.querySelector(`[data-eid="${eid}"]`) as HTMLElement;
                  if (el && !el.hasAttribute('data-container')) {
                     onSaveHistory();
                     const clone = el.cloneNode(true) as HTMLElement;
                     // Assign new ID immediately
                     const newEid = generateElementId();
                     clone.setAttribute('data-eid', newEid);
                     clone.removeAttribute('data-selected');
                     // Remove old toolbars from clone - they'll be re-added
                     clone.querySelectorAll('.element-toolbar').forEach(t => t.remove());
                     el.parentNode?.insertBefore(clone, el.nextSibling);
                     // Add toolbars to clone
                     addElementIdsAndToolbars(clone.parentElement!, false);
                     // Select the new clone
                     onSetSelectedEid(newEid);
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
            const eid = parentColumnContainer.getAttribute('data-eid');
            if (eid) {
               mouseEvent.preventDefault();
               mouseEvent.stopPropagation();
               onSetSelectedEid(eid);
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
            onSetSelectedEid(null);
            return;
         }

         if (target.hasAttribute('data-column-container')) {
            const eid = target.getAttribute('data-eid');
            if (eid) {
               mouseEvent.preventDefault();
               mouseEvent.stopPropagation();
               onSetSelectedEid(eid);
            }
            return;
         }

         // Handle table container clicks
         if (target.hasAttribute('data-table-container')) {
            const eid = target.getAttribute('data-eid');
            if (eid) {
               mouseEvent.preventDefault();
               mouseEvent.stopPropagation();
               onSetSelectedEid(eid);
            }
            return;
         }

         // Handle clicks inside table
         const parentTableContainer = target.closest('[data-table-container="true"]') as HTMLElement;
         if (parentTableContainer && (target.tagName === 'TD' || target.tagName === 'TH' || target.tagName === 'TR' || target.tagName === 'TABLE')) {
            const eid = parentTableContainer.getAttribute('data-eid');
            if (eid) {
               onSetSelectedEid(eid);
            }
         }

         const elementWithEid = target.closest('[data-eid]') as HTMLElement;
         if (elementWithEid && !elementWithEid.classList.contains('element-toolbar')) {
            const eid = elementWithEid.getAttribute('data-eid');
            if (eid) {
               if (!elementWithEid.hasAttribute('contenteditable')) {
                  mouseEvent.preventDefault();
               }
               mouseEvent.stopPropagation();
               onSetSelectedEid(eid);
            }
         }
      };

      // Blur handler
      const handleBlur = (e: Event) => {
         if (stateRef.current.isPreviewMode) return;
         const target = e.target as HTMLElement;
         if (target.hasAttribute('contenteditable') && target.hasAttribute('data-eid')) {
            callbacksRef.current.onSaveHistory();
            callbacksRef.current.onUpdateContent();
            callbacksRef.current.onCalculatePageBreaks();
         }
      };

      // Input handler
      const handleInput = (e: Event) => {
         if (stateRef.current.isPreviewMode) return;
         callbacksRef.current.onCalculatePageBreaks();
         checkMergeFieldTriggerRef.current();

         const target = e.target as HTMLElement;
         if (target.hasAttribute('contenteditable') && target.hasAttribute('data-eid')) {
            const clone = target.cloneNode(true) as HTMLElement;
            clone.querySelectorAll('.element-toolbar').forEach(t => t.remove());

            const textContent = clone.textContent?.trim() || '';
            const hasOnlyBr = clone.innerHTML.trim() === '<br>' || clone.innerHTML.trim() === '';

            if (textContent === '' || hasOnlyBr) {
               target.setAttribute('data-empty', 'true');
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

      // Keydown handler
      const handleKeyDown = (e: Event) => {
         if (stateRef.current.isPreviewMode) return;
         const keyEvent = e as KeyboardEvent;
         const target = keyEvent.target as HTMLElement;

         if (keyEvent.key === 'Enter' && !keyEvent.shiftKey) {
            const isContentEditable = target.hasAttribute('contenteditable') && target.getAttribute('contenteditable') === 'true';

            if (isContentEditable && target.hasAttribute('data-eid')) {
               keyEvent.preventDefault();

               const selection = (shadow as unknown as { getSelection?: () => Selection | null }).getSelection?.() || window.getSelection();
               if (selection && selection.rangeCount > 0) {
                  const range = selection.getRangeAt(0);
                  range.deleteContents();

                  const br = document.createElement('br');
                  range.insertNode(br);

                  range.setStartAfter(br);
                  range.setEndAfter(br);
                  selection.removeAllRanges();
                  selection.addRange(range);

                  target.dispatchEvent(new Event('input', { bubbles: true }));
               }
               return;
            }
         }

         handleMergeFieldKeyDownRef.current(keyEvent);
      };

      // Drag start handler (delegated)
      const handleDragStart = (e: Event) => {
         if (stateRef.current.isPreviewMode) return;
         const dragEvent = e as DragEvent;
         const target = dragEvent.target as HTMLElement;

         // Check if drag started from a drag button
         const dragBtn = target.closest('.element-toolbar-btn[data-action="drag"]');
         if (!dragBtn) return;

         const el = dragBtn.closest('[data-eid]') as HTMLElement;
         if (!el) return;

         dragEvent.stopPropagation();
         draggedElementRef.current = el;
         el.classList.add('dragging');
         if (dragEvent.dataTransfer) {
            dragEvent.dataTransfer.effectAllowed = 'move';
            dragEvent.dataTransfer.setData('text/plain', 'element');
         }
      };

      // Drag end handler (delegated)
      const handleDragEnd = (e: Event) => {
         const target = e.target as HTMLElement;
         if (!target.closest('.element-toolbar-btn[data-action="drag"]')) return;

         if (draggedElementRef.current) {
            draggedElementRef.current.classList.remove('dragging');
            shadow.querySelectorAll('.drop-indicator').forEach(ind => ind.remove());
            shadow.querySelectorAll('.drag-over').forEach(zone => zone.classList.remove('drag-over'));
            draggedElementRef.current = null;
         }
      };

      // Drag over handler
      const handleDragOver = (e: Event) => {
         if (stateRef.current.isPreviewMode) return;
         const dragEvent = e as DragEvent;
         dragEvent.preventDefault();

         const target = dragEvent.target as HTMLElement;
         const dragged = draggedElementRef.current;
         const { draggedComponent } = stateRef.current;

         if (!draggedComponent && !dragged) return;

         const calculateInsertionPoint = (container: HTMLElement, mouseY: number) => {
            const children = Array.from(
               container.querySelectorAll(':scope > [data-eid]:not(.drop-zone):not(.drop-indicator)')
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

            container.classList.add('drag-over');

            if (!lastChild) return;

            const indicator = window.document.createElement('div');
            indicator.className = 'drop-indicator';

            if (insertBefore) {
               insertBefore.parentNode?.insertBefore(indicator, insertBefore);
            } else {
               lastChild.parentNode?.insertBefore(indicator, lastChild.nextSibling);
            }
         };

         const dropZone = target.closest('.drop-zone') as HTMLElement;
         if (dropZone) {
            const { insertBefore, lastChild } = calculateInsertionPoint(dropZone, dragEvent.clientY);
            placeIndicator(dropZone, insertBefore, lastChild);
            return;
         }

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
         if (stateRef.current.isPreviewMode) return;
         const dragEvent = e as DragEvent;
         dragEvent.preventDefault();
         dragEvent.stopPropagation();

         const target = dragEvent.target as HTMLElement;
         const dragged = draggedElementRef.current;
         const { draggedComponent, tablePlaceholderId } = stateRef.current;
         const { onSaveHistory, onUpdateContent, onCalculatePageBreaks, onSetSelectedEid, onSetDraggedComponent, onSetTableModalMode, onShowTableModal } = callbacksRef.current;

         const dropIndicator = shadow.querySelector('.drop-indicator') as HTMLElement;
         shadow.querySelectorAll('.drag-over').forEach(zone => zone.classList.remove('drag-over'));

         if (dropIndicator) {
            if (draggedComponent) {
               if (draggedComponent.id === 'table') {
                  const placeholder = `<div id="${tablePlaceholderId}" style="display:none;"></div>`;
                  dropIndicator.insertAdjacentHTML('beforebegin', placeholder);
                  dropIndicator.remove();
                  onUpdateContent();
                  onSetDraggedComponent(null);
                  onSetTableModalMode('create');
                  setTimeout(() => onShowTableModal(true), 0);
                  return;
               }

               onSaveHistory();
               dropIndicator.insertAdjacentHTML('beforebegin', draggedComponent.html);
               dropIndicator.remove();

               // Add IDs and toolbars to newly inserted content
               const contentFlowEl = shadow.querySelector('.content-flow');
               if (contentFlowEl) {
                  addElementIdsAndToolbars(contentFlowEl, false);
               }

               onSetDraggedComponent(null);
               onUpdateContent();
               onCalculatePageBreaks();
               return;
            } else if (dragged) {
               dropIndicator.parentNode?.insertBefore(dragged, dropIndicator);
               dropIndicator.remove();
               dragged.classList.remove('dragging');
               draggedElementRef.current = null;

               const eid = dragged.getAttribute('data-eid');
               onSetSelectedEid(eid);

               onUpdateContent();
               onCalculatePageBreaks();
               return;
            }
         }

         shadow.querySelectorAll('.drop-indicator').forEach(ind => ind.remove());

         const dropZone = target.closest('.drop-zone, [data-container="true"]') as HTMLElement;

         if (dropZone) {
            if (draggedComponent) {
               if (draggedComponent.id === 'table') {
                  const placeholder = `<div id="${tablePlaceholderId}" style="display:none;"></div>`;
                  dropZone.insertAdjacentHTML('beforeend', placeholder);
                  onUpdateContent();
                  onSetDraggedComponent(null);
                  onSetTableModalMode('create');
                  setTimeout(() => onShowTableModal(true), 0);
                  return;
               }

               onSaveHistory();
               dropZone.insertAdjacentHTML('beforeend', draggedComponent.html);

               // Add IDs and toolbars to newly inserted content
               const contentFlowEl = shadow.querySelector('.content-flow');
               if (contentFlowEl) {
                  addElementIdsAndToolbars(contentFlowEl, false);
               }

               onSetDraggedComponent(null);
               onUpdateContent();
               onCalculatePageBreaks();
               return;
            } else if (dragged && !dropZone.contains(dragged)) {
               onSaveHistory();
               dropZone.appendChild(dragged);
               dragged.classList.remove('dragging');
               draggedElementRef.current = null;

               const eid = dragged.getAttribute('data-eid');
               onSetSelectedEid(eid);

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

      // Mousedown handler for action buttons
      const handleMouseDown = (e: Event) => {
         const target = e.target as HTMLElement;
         const btn = target.closest('.element-toolbar-btn[data-action="duplicate"], .element-toolbar-btn[data-action="delete"]');
         if (btn) {
            e.preventDefault();
            e.stopPropagation();
         }
      };

      // Attach all event listeners once
      pagesWrapper.addEventListener('click', handleClick);
      pagesWrapper.addEventListener('focusout', handleBlur as EventListener);
      pagesWrapper.addEventListener('input', handleInput);
      pagesWrapper.addEventListener('keydown', handleKeyDown);
      pagesWrapper.addEventListener('dragstart', handleDragStart);
      pagesWrapper.addEventListener('dragend', handleDragEnd);
      pagesWrapper.addEventListener('dragover', handleDragOver);
      pagesWrapper.addEventListener('dragleave', handleDragLeave);
      pagesWrapper.addEventListener('drop', handleDrop);
      pagesWrapper.addEventListener('mousedown', handleMouseDown);

      // Setup paste handlers
      const cleanupPaste = callbacksRef.current.setupPasteHandlers(pagesWrapper);

      cleanupRef.current = () => {
         pagesWrapper.removeEventListener('click', handleClick);
         pagesWrapper.removeEventListener('focusout', handleBlur as EventListener);
         pagesWrapper.removeEventListener('input', handleInput);
         pagesWrapper.removeEventListener('keydown', handleKeyDown);
         pagesWrapper.removeEventListener('dragstart', handleDragStart);
         pagesWrapper.removeEventListener('dragend', handleDragEnd);
         pagesWrapper.removeEventListener('dragover', handleDragOver);
         pagesWrapper.removeEventListener('dragleave', handleDragLeave);
         pagesWrapper.removeEventListener('drop', handleDrop);
         pagesWrapper.removeEventListener('mousedown', handleMouseDown);
         cleanupPaste();
      };

      return () => {
         cleanupRef.current?.();
         mountedRef.current = false;
      };
   }, [shadowReady, shadowRootRef, draggedElementRef, checkMergeFieldTriggerRef, handleMergeFieldKeyDownRef, addElementIdsAndToolbars]);

   // Effect B: Update styles, content, header, and preview mode
   useEffect(() => {
      if (!shadowReady || !mountedRef.current) return;

      const shadow = shadowRootRef.current;
      if (!shadow) return;

      const pagePadding = 40;

      // Update dynamic styles
      const styleEl = shadow.getElementById('editor-dynamic-styles');
      if (styleEl) {
         const EditorStylesStr = EDITOR_STYLES({
            currentPageHeight: {
               value: editorDocument?.pageHeight?.value,
               unit: editorDocument?.pageHeight?.unit
            }
         });

         const containerFlowMinHeight = `calc(${editorDocument.pageHeight?.value}${editorDocument.pageHeight?.unit} - ${pagePadding * 2}px) !important`;

         const pagesContainerHeight = editorDocument.pageHeight?.unit === 'vh' ?
            `min-height: ${editorDocument.pageHeight?.value}${editorDocument.pageHeight?.unit} !important`
            : `height: ${editorDocument.pageHeight?.value}${editorDocument.pageHeight?.unit} !important`;

         styleEl.textContent = /* css */ `
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

            .content-flow > *:not(.page-break-spacer) {
               max-width: 100%;
               box-sizing: border-box;
            }

            .content-flow img {
               max-width: 100%;
               height: auto;
            }

            .content-flow:empty::before,
            .content-flow:not(:has([data-eid]))::before {
               content: "Drag elements here...";
               color: #9ca3af;
               font-style: italic;
               display: block;
            }

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

            .pages-wrapper[data-preview-mode="true"] [data-eid]:hover,
            .pages-wrapper[data-preview-mode="true"] [data-eid]:focus,
            .pages-wrapper[data-preview-mode="true"] [data-selected="true"] {
               outline: none !important;
               box-shadow: none !important;
            }

            .pages-wrapper[data-preview-mode="true"] [data-eid] {
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
            .pages-wrapper[data-preview-mode="true"] .content-flow:not(:has([data-eid]))::before {
               display: none;
            }

            .pages-wrapper[data-preview-mode="true"] [data-empty="true"]::before {
               display: none !important;
            }
         `;
      }

      // Update header
      const docName = shadow.querySelector('.doc-name');
      const docDimensions = shadow.querySelector('.doc-dimensions');
      if (docName) docName.textContent = editorDocument.name;
      if (docDimensions) {
         docDimensions.textContent = `${editorDocument.pageWidth?.value}${editorDocument.pageWidth?.unit} × ${editorDocument.pageHeight?.value}${editorDocument.pageHeight?.unit}`;
      }

      // Get elements
      const pagesWrapper = shadow.querySelector('.pages-wrapper') as HTMLElement;
      const contentFlow = shadow.querySelector('.content-flow') as HTMLElement;
      if (!pagesWrapper || !contentFlow) return;

      // Set preview mode attribute
      if (isPreviewMode) {
         pagesWrapper.setAttribute('data-preview-mode', 'true');
      } else {
         pagesWrapper.removeAttribute('data-preview-mode');
      }

      // Parse existing content to compare
      const tempDiv = document.createElement('div');
      tempDiv.innerHTML = editorDocument.content;
      const newContentFlow = tempDiv.querySelector('.content-flow');

      if (newContentFlow) {
         // Check if content actually changed by comparing innerHTML (excluding toolbars)
         const getContentWithoutToolbars = (el: Element): string => {
            const clone = el.cloneNode(true) as HTMLElement;
            clone.querySelectorAll('.element-toolbar').forEach(t => t.remove());
            return clone.innerHTML;
         };

         const currentContent = getContentWithoutToolbars(contentFlow);
         const newContent = getContentWithoutToolbars(newContentFlow);

         if (currentContent !== newContent) {
            // Content changed - update it
            // Preserve selection if possible
            const selectedEid = contentFlow.querySelector('[data-selected="true"]')?.getAttribute('data-eid');

            // Clear and set new content
            contentFlow.innerHTML = newContentFlow.innerHTML;

            // Setup elements for editing
            contentFlow.querySelectorAll('*').forEach(el => {
               el.removeAttribute('data-selected');
               el.removeAttribute('contenteditable');
               el.removeAttribute('draggable');

               if (!NON_EDITABLE_TAGS.includes(el.tagName)) {
                  el.setAttribute('data-editable', 'true');
               }
            });

            // Add IDs and toolbars
            addElementIdsAndToolbars(contentFlow, isPreviewMode);

            // Restore selection
            if (selectedEid) {
               const selectedEl = contentFlow.querySelector(`[data-eid="${selectedEid}"]`);
               if (selectedEl) {
                  selectedEl.setAttribute('data-selected', 'true');
               }
            }
         }
      } else {
         // No content-flow in editorDocument.content, treat content as direct children
         // This handles the case where content doesn't have a wrapper
         contentFlow.querySelectorAll('*').forEach(el => {
            el.removeAttribute('data-selected');
            el.removeAttribute('contenteditable');
            el.removeAttribute('draggable');

            if (!NON_EDITABLE_TAGS.includes(el.tagName)) {
               el.setAttribute('data-editable', 'true');
            }
         });

         addElementIdsAndToolbars(contentFlow, isPreviewMode);
      }

      // Handle preview mode specifics
      if (isPreviewMode) {
         shadow.querySelectorAll('.element-toolbar').forEach(el => el.remove());
         shadow.querySelectorAll('[contenteditable]').forEach(el => {
            el.removeAttribute('contenteditable');
         });
         shadow.querySelectorAll('[data-selected]').forEach(el => {
            el.removeAttribute('data-selected');
         });
      }

      // Calculate page breaks
      onCalculatePageBreaks();

   }, [
      shadowReady,
      shadowRootRef,
      editorDocument.content,
      editorDocument.name,
      editorDocument.pageWidth?.value,
      editorDocument.pageWidth?.unit,
      editorDocument.pageHeight?.value,
      editorDocument.pageHeight?.unit,
      isPreviewMode,
      onCalculatePageBreaks,
      addElementIdsAndToolbars
   ]);
}

export default useEditorRenderer;
