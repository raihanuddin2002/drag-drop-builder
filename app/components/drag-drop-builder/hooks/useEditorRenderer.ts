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
 * useEditorRenderer - Performance optimized:
 * - Mounts shadow shell once (no full rebuild).
 * - Delegated event handlers (no per-node listeners).
 * - Stable data-eid identifiers.
 * - Avoids overwriting DOM while typing (unless undo/redo changes content).
 * - Throttles page-break calculation using rAF.
 * - Processes only inserted/duplicated subtrees where possible.
 * - CSS updates only when dimensions change.
 * - Single-pass preview cleanup.
 *
 * IMPORTANT: For true stable IDs across undo/redo/load, your onUpdateContent()
 * should serialize HTML WITHOUT removing data-eid attributes.
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
   // mount state
   const mountedShadowRef = useRef<ShadowRoot | null>(null);
   const cleanupRef = useRef<(() => void) | null>(null);

   // typing / external apply guards
   const isUserTypingRef = useRef(false);
   const lastAppliedContentRef = useRef<string>('');
   const lastSelectedEidRef = useRef<string | null>(null);

   // Track last applied dimensions to avoid redundant CSS rebuilds
   const lastAppliedDimensionsRef = useRef<string>('');
   // Track last preview mode to detect toggle
   const lastPreviewModeRef = useRef<boolean>(false);

   // rAF throttle for page breaks
   const rafCalcRef = useRef<number | null>(null);
   const schedulePageBreaks = useCallback(() => {
      if (rafCalcRef.current) cancelAnimationFrame(rafCalcRef.current);
      rafCalcRef.current = requestAnimationFrame(() => {
         rafCalcRef.current = null;
         callbacksRef.current.onCalculatePageBreaks();
      });
   }, []);

   // rAF throttle for merge field trigger
   const rafMergeRef = useRef<number | null>(null);
   const scheduleMergeFieldCheck = useCallback(() => {
      if (rafMergeRef.current) return;
      rafMergeRef.current = requestAnimationFrame(() => {
         rafMergeRef.current = null;
         checkMergeFieldTriggerRef.current();
      });
   }, [checkMergeFieldTriggerRef]);

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

   const setSelectedEid = useCallback((eid: string | null) => {
      lastSelectedEidRef.current = eid;
      callbacksRef.current.onSetSelectedEid(eid);
   }, []);

   const shouldSkip = useCallback((el: Element) => {
      const tag = el.tagName?.toUpperCase();
      if (NON_EDITABLE_TAGS.includes(tag)) return true;

      const cls = (el as HTMLElement).classList;
      if (cls.contains('pages-wrapper')) return true;
      if (cls.contains('pages-container')) return true;
      if (cls.contains('document-header')) return true;
      if (cls.contains('element-toolbar')) return true;
      if (cls.contains('page-break-spacer')) return true;
      if ((el as HTMLElement).closest?.('.page-break-spacer')) return true;

      return false;
   }, []);

   // Helper: ensure empty placeholder <br> and data-empty (no cloning - direct check)
   const updateEmptyState = useCallback((el: HTMLElement) => {
      let hasContent = false;

      for (let i = 0; i < el.childNodes.length; i++) {
         const node = el.childNodes[i];
         if (node.nodeType === Node.ELEMENT_NODE) {
            const element = node as Element;
            if (element.classList.contains('element-toolbar')) continue;
            if (element.tagName === 'BR') continue;
            hasContent = true;
            break;
         } else if (node.nodeType === Node.TEXT_NODE) {
            if (node.textContent?.trim()) {
               hasContent = true;
               break;
            }
         }
      }

      if (!hasContent) {
         el.setAttribute('data-empty', 'true');
         if (!el.querySelector(':scope > br')) {
            el.appendChild(document.createElement('br'));
         }
      } else {
         el.removeAttribute('data-empty');
      }
   }, []);

   // Process subtree: assigns data-eid (if missing), adds toolbars/contenteditable (if not preview)
   const processSubtree = useCallback(
      (root: Element, forPreview: boolean) => {
         const walk = (node: Element) => {
            if (shouldSkip(node)) return;

            // Ensure persistent ID
            if (!node.getAttribute('data-eid')) {
               node.setAttribute('data-eid', generateElementId());
            }

            // Clear edit-only transient attrs (but keep data-eid)
            node.removeAttribute('data-selected');
            node.removeAttribute('draggable');

            const isContainer = node.hasAttribute('data-container');
            const isDropZone = (node as HTMLElement).classList.contains('drop-zone');
            const isColumnContainer = node.hasAttribute('data-column-container');
            const isTableContainer = node.hasAttribute('data-table-container');

            // mark editable (not containers/drop-zones)
            if (!NON_EDITABLE_TAGS.includes(node.tagName?.toUpperCase()) && !isContainer && !isDropZone) {
               node.setAttribute('data-editable', 'true');
            }

            if (!forPreview) {
               const isInsideTableContainer =
                  node.closest('[data-table-container="true"]') && !isTableContainer;
               const shouldHaveToolbar =
                  !isContainer &&
                  !isDropZone &&
                  !isInsideTableContainer;

               // Only add toolbar if not already present
               if (shouldHaveToolbar && !(node as HTMLElement).querySelector(':scope > .element-toolbar')) {
                  const toolbar = window.document.createElement('div');
                  toolbar.className = isColumnContainer
                     ? 'element-toolbar column-toolbar'
                     : isTableContainer
                        ? 'element-toolbar table-toolbar'
                        : 'element-toolbar';
                  toolbar.setAttribute('contenteditable', 'false');
                  toolbar.innerHTML = /*html*/ `
              <button class="element-toolbar-btn" data-action="drag" title="Drag" draggable="true">
                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <circle cx="9" cy="5" r="1"/><circle cx="9" cy="12" r="1"/><circle cx="9" cy="19" r="1"/>
                  <circle cx="15" cy="5" r="1"/><circle cx="15" cy="12" r="1"/><circle cx="15" cy="19" r="1"/>
                </svg>
              </button>
              <button class="element-toolbar-btn" data-action="duplicate" title="Duplicate">
                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>
                </svg>
              </button>
              <button class="element-toolbar-btn" data-action="delete" title="Delete">
                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/>
                </svg>
              </button>
            `;
                  (node as HTMLElement).insertBefore(toolbar, node.firstChild);
               }

               // enable contenteditable when applicable (not containers/drop-zones)
               if (!isColumnContainer && !isContainer && !isDropZone && isEditableElement(node as HTMLElement)) {
                  node.setAttribute('contenteditable', 'true');
                  updateEmptyState(node as HTMLElement);
               } else {
                  node.removeAttribute('contenteditable');
               }
            } else {
               // preview: ensure no contenteditable/toolbars
               node.removeAttribute('contenteditable');
            }

            // Recurse into children excluding toolbars
            for (const child of Array.from(node.children)) {
               if (!(child as HTMLElement).classList.contains('element-toolbar')) {
                  walk(child);
               }
            }
         };

         // Walk starting at root's children if root is the contentFlow container itself,
         // else walk root itself (subtree insertion)
         const isContentFlow = (root as HTMLElement).classList?.contains('content-flow');
         if (isContentFlow) {
            for (const child of Array.from(root.children)) walk(child);
         } else {
            walk(root);
         }
      },
      [shouldSkip, updateEmptyState]
   );

   // Build a fragment from HTML and process it BEFORE inserting (so new nodes get IDs/toolbars)
   const buildProcessedFragment = useCallback(
      (html: string, forPreview: boolean) => {
         const range = document.createRange();
         range.selectNode(document.body);
         const frag = range.createContextualFragment(html);

         // Process each top-level element in fragment
         for (const node of Array.from(frag.childNodes)) {
            if (node.nodeType === Node.ELEMENT_NODE) {
               processSubtree(node as Element, forPreview);
            }
         }
         return frag;
      },
      [processSubtree]
   );

   // Single-pass preview cleanup: removes toolbars, contenteditable, and data-selected
   const applyPreviewCleanup = useCallback((shadow: ShadowRoot) => {
      const els = shadow.querySelectorAll('.element-toolbar, [contenteditable], [data-selected]');
      for (let i = 0; i < els.length; i++) {
         const el = els[i] as HTMLElement;
         if (el.classList.contains('element-toolbar')) {
            el.remove();
         } else {
            if (el.hasAttribute('contenteditable')) el.removeAttribute('contenteditable');
            if (el.hasAttribute('data-selected')) el.removeAttribute('data-selected');
         }
      }
   }, []);

   // Effect A: Mount shell once + attach event listeners once
   useEffect(() => {
      if (!shadowReady) return;

      const shadow = shadowRootRef.current;
      if (!shadow) return;

      // already mounted into this exact shadow root
      if (mountedShadowRef.current === shadow) return;

      // ✅ if we were mounted elsewhere, cleanup first
      cleanupRef.current?.();
      cleanupRef.current = null;

      // mark current shadow as mounted
      mountedShadowRef.current = shadow;

      shadow.innerHTML = /*html*/ `
      <style id="editor-dynamic-styles"></style>
      <div class="pages-wrapper">
        <div class="document-header">
          <span class="doc-name"></span>
          <span class="doc-dimensions" style="color:#999;"></span>
          <span class="page-count" style="color:#22c55e;font-weight:500;">1 page</span>
        </div>
        <div class="pages-container">
          <div class="page-overlay"></div>
          <div class="content-flow" data-container="true"></div>
        </div>
      </div>
    `;

      const pagesWrapper = shadow.querySelector('.pages-wrapper') as HTMLElement | null;
      const contentFlow = shadow.querySelector('.content-flow') as HTMLElement | null;
      if (!pagesWrapper || !contentFlow) return;

      // Delegated click handler
      const handleClick = (e: Event) => {
         if (stateRef.current.isPreviewMode) return;

         const mouseEvent = e as MouseEvent;
         const target = mouseEvent.target as HTMLElement;

         const { onSaveHistory, onUpdateContent } = callbacksRef.current;

         // Toolbar actions
         const toolbarBtn = target.closest('.element-toolbar-btn');
         if (toolbarBtn) {
            mouseEvent.preventDefault();
            mouseEvent.stopPropagation();

            const action = toolbarBtn.getAttribute('data-action');
            const parentElement = toolbarBtn.closest('[data-eid]');
            const eid = parentElement?.getAttribute('data-eid');

            if (eid && action) {
               if (action === 'delete') {
                  const el = shadow.querySelector(`[data-eid="${CSS.escape(eid)}"]`) as HTMLElement | null;
                  if (el && !el.hasAttribute('data-container')) {
                     onSaveHistory();
                     el.remove();
                     onUpdateContent();
                     setSelectedEid(null);
                     schedulePageBreaks();
                  }
               } else if (action === 'duplicate') {
                  const el = shadow.querySelector(`[data-eid="${CSS.escape(eid)}"]`) as HTMLElement | null;
                  if (el && !el.hasAttribute('data-container')) {
                     onSaveHistory();

                     const clone = el.cloneNode(true) as HTMLElement;

                     // Remove toolbars and strip ALL data-eids so processSubtree assigns fresh ones
                     clone.querySelectorAll('.element-toolbar').forEach(t => t.remove());
                     clone.removeAttribute('data-selected');
                     clone.removeAttribute('data-eid');
                     clone.querySelectorAll('[data-eid]').forEach(child => child.removeAttribute('data-eid'));

                     // Insert clone and process its subtree (assigns new eids + toolbars)
                     el.parentNode?.insertBefore(clone, el.nextSibling);
                     processSubtree(clone, false);

                     onUpdateContent();
                     schedulePageBreaks();
                  }
               }
            }
            return;
         }

         if (target.closest('.element-toolbar')) return;

         // Drop-zone inside column container
         const parentColumnContainer = target.closest('[data-column-container="true"]') as HTMLElement | null;
         if (target.classList.contains('drop-zone') && parentColumnContainer) {
            const eid = parentColumnContainer.getAttribute('data-eid');
            if (eid) {
               mouseEvent.preventDefault();
               mouseEvent.stopPropagation();
               setSelectedEid(eid);
            }
            return;
         }

         // Deselect on container-like clicks
         if (
            target.hasAttribute('data-container') ||
            target.classList.contains('drop-zone') ||
            target.classList.contains('drop-indicator') ||
            target.classList.contains('pages-wrapper') ||
            target.classList.contains('pages-container') ||
            target.classList.contains('page-break-spacer') ||
            target.closest('.page-break-spacer')
         ) {
            setSelectedEid(null);
            return;
         }

         // Column container select
         if (target.hasAttribute('data-column-container')) {
            const eid = target.getAttribute('data-eid');
            if (eid) {
               mouseEvent.preventDefault();
               mouseEvent.stopPropagation();
               setSelectedEid(eid);
            }
            return;
         }

         // Table container select
         if (target.hasAttribute('data-table-container')) {
            const eid = target.getAttribute('data-eid');
            if (eid) {
               mouseEvent.preventDefault();
               mouseEvent.stopPropagation();
               setSelectedEid(eid);
            }
            return;
         }

         // Click inside table selects parent table container
         const parentTableContainer = target.closest('[data-table-container="true"]') as HTMLElement | null;
         if (
            parentTableContainer &&
            (target.tagName === 'TD' || target.tagName === 'TH' || target.tagName === 'TR' || target.tagName === 'TABLE')
         ) {
            const eid = parentTableContainer.getAttribute('data-eid');
            if (eid) setSelectedEid(eid);
         }

         // General selection
         const elWithEid = target.closest('[data-eid]') as HTMLElement | null;
         if (elWithEid && !elWithEid.classList.contains('element-toolbar')) {
            const eid = elWithEid.getAttribute('data-eid');
            if (eid) {
               if (!elWithEid.hasAttribute('contenteditable')) mouseEvent.preventDefault();
               mouseEvent.stopPropagation();
               setSelectedEid(eid);
            }
         }
      };

      const handleBlur = (e: Event) => {
         if (stateRef.current.isPreviewMode) return;

         const focusEvent = e as FocusEvent;
         const target = focusEvent.target as HTMLElement;

         // Skip blur if focus is moving to a toolbar button (prevents double history)
         const relatedTarget = focusEvent.relatedTarget as HTMLElement | null;
         if (relatedTarget?.closest('.element-toolbar')) return;

         if (target.hasAttribute('contenteditable') && target.hasAttribute('data-eid')) {
            isUserTypingRef.current = false;
            callbacksRef.current.onSaveHistory();
            callbacksRef.current.onUpdateContent();
            schedulePageBreaks();
         }
      };

      const handleInput = (e: Event) => {
         if (stateRef.current.isPreviewMode) return;

         isUserTypingRef.current = true;

         // Throttled page breaks
         schedulePageBreaks();

         // Throttled merge field trigger check
         scheduleMergeFieldCheck();

         // empty placeholder state
         const target = e.target as HTMLElement;
         if (target.hasAttribute('contenteditable') && target.hasAttribute('data-eid')) {
            updateEmptyState(target);
         }
      };

      const handleKeyDown = (e: Event) => {
         if (stateRef.current.isPreviewMode) return;

         const keyEvent = e as KeyboardEvent;
         const target = keyEvent.target as HTMLElement;

         // Enter handling: insert <br>
         if (keyEvent.key === 'Enter' && !keyEvent.shiftKey) {
            const isContentEditable =
               target.hasAttribute('contenteditable') && target.getAttribute('contenteditable') === 'true';

            if (isContentEditable && target.hasAttribute('data-eid')) {
               keyEvent.preventDefault();

               const selection =
                  (shadow as unknown as { getSelection?: () => Selection | null }).getSelection?.() ||
                  window.getSelection();

               if (selection && selection.rangeCount > 0) {
                  const range = selection.getRangeAt(0);
                  range.deleteContents();

                  const br = document.createElement('br');
                  range.insertNode(br);

                  // If br is at the end of the element, add a trailing br so cursor advances visually
                  if (!br.nextSibling || (br.nextSibling.nodeType === Node.TEXT_NODE && !br.nextSibling.textContent)) {
                     const trailingBr = document.createElement('br');
                     br.parentNode?.insertBefore(trailingBr, br.nextSibling);
                  }

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

      const handleDragStart = (e: Event) => {
         if (stateRef.current.isPreviewMode) return;

         const dragEvent = e as DragEvent;
         const target = dragEvent.target as HTMLElement;

         const dragBtn = target.closest('.element-toolbar-btn[data-action="drag"]');
         if (!dragBtn) return;

         const el = dragBtn.closest('[data-eid]') as HTMLElement | null;
         if (!el) return;

         dragEvent.stopPropagation();
         draggedElementRef.current = el;
         el.classList.add('dragging');

         if (dragEvent.dataTransfer) {
            dragEvent.dataTransfer.effectAllowed = 'move';
            dragEvent.dataTransfer.setData('text/plain', 'element');
         }
      };

      const handleDragEnd = (e: Event) => {
         const target = e.target as HTMLElement;
         if (!target.closest('.element-toolbar-btn[data-action="drag"]')) return;

         if (draggedElementRef.current) {
            draggedElementRef.current.classList.remove('dragging');
            draggedElementRef.current = null;
         }
         // Always clean up indicators on drag end
         shadow.querySelectorAll('.drop-indicator').forEach(ind => ind.remove());
         shadow.querySelectorAll('.drag-over').forEach(zone => zone.classList.remove('drag-over'));
      };

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

            if (validChildren.length === 0) return { insertBefore: null as HTMLElement | null, lastChild: null as HTMLElement | null };

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

         const dropZone = target.closest('.drop-zone') as HTMLElement | null;
         if (dropZone) {
            const { insertBefore, lastChild } = calculateInsertionPoint(dropZone, dragEvent.clientY);
            placeIndicator(dropZone, insertBefore, lastChild);
            return;
         }

         const container = target.closest('[data-container="true"]') as HTMLElement | null;
         if (container) {
            const { insertBefore, lastChild } = calculateInsertionPoint(container, dragEvent.clientY);
            placeIndicator(container, insertBefore, lastChild);
         }
      };

      const handleDragLeave = (e: Event) => {
         const target = e.target as HTMLElement;
         if (
            target.classList.contains('drop-zone') ||
            target.hasAttribute('data-container') ||
            target.hasAttribute('data-column-container')
         ) {
            target.classList.remove('drag-over');
         }
      };

      const handleDrop = (e: Event) => {
         if (stateRef.current.isPreviewMode) return;

         const dragEvent = e as DragEvent;
         dragEvent.preventDefault();
         dragEvent.stopPropagation();

         const target = dragEvent.target as HTMLElement;
         const dragged = draggedElementRef.current;
         const { draggedComponent, tablePlaceholderId } = stateRef.current;

         const {
            onSaveHistory,
            onUpdateContent,
            onSetDraggedComponent,
            onSetTableModalMode,
            onShowTableModal
         } = callbacksRef.current;

         // Always clean up drag artifacts first
         shadow.querySelectorAll('.drag-over').forEach(zone => zone.classList.remove('drag-over'));
         const dropIndicator = shadow.querySelector('.drop-indicator') as HTMLElement | null;

         const insertFragmentBefore = (anchor: Element, html: string) => {
            const frag = buildProcessedFragment(html, false);
            anchor.parentNode?.insertBefore(frag, anchor);
         };

         const appendFragmentTo = (container: Element, html: string) => {
            const frag = buildProcessedFragment(html, false);
            container.appendChild(frag);
         };

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
               insertFragmentBefore(dropIndicator, draggedComponent.html);
               dropIndicator.remove();

               onSetDraggedComponent(null);
               onUpdateContent();
               schedulePageBreaks();
               return;
            } else if (dragged) {
               onSaveHistory();

               dropIndicator.parentNode?.insertBefore(dragged, dropIndicator);
               dropIndicator.remove();
               dragged.classList.remove('dragging');
               draggedElementRef.current = null;

               // Stable ID: keep same eid
               const eid = dragged.getAttribute('data-eid');
               setSelectedEid(eid);

               onUpdateContent();
               schedulePageBreaks();
               return;
            }
         }

         // Clean up any stale indicators
         shadow.querySelectorAll('.drop-indicator').forEach(ind => ind.remove());

         const dropZone = target.closest('.drop-zone, [data-container="true"]') as HTMLElement | null;
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
               appendFragmentTo(dropZone, draggedComponent.html);

               onSetDraggedComponent(null);
               onUpdateContent();
               schedulePageBreaks();
               return;
            } else if (dragged && !dropZone.contains(dragged)) {
               onSaveHistory();
               dropZone.appendChild(dragged);

               dragged.classList.remove('dragging');
               draggedElementRef.current = null;

               const eid = dragged.getAttribute('data-eid');
               setSelectedEid(eid);

               onUpdateContent();
               schedulePageBreaks();
               return;
            }
         }

         if (dragged) {
            dragged.classList.remove('dragging');
            draggedElementRef.current = null;
         }
      };

      const handleMouseDown = (e: Event) => {
         const target = e.target as HTMLElement;
         const btn = target.closest(
            '.element-toolbar-btn[data-action="duplicate"], .element-toolbar-btn[data-action="delete"]'
         );
         if (btn) {
            e.preventDefault();
            e.stopPropagation();
         }
      };

      // Attach listeners once
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

         if (rafCalcRef.current) {
            cancelAnimationFrame(rafCalcRef.current);
            rafCalcRef.current = null;
         }
         if (rafMergeRef.current) {
            cancelAnimationFrame(rafMergeRef.current);
            rafMergeRef.current = null;
         }
      };

      return () => {
         cleanupRef.current?.();
         cleanupRef.current = null;

         if (mountedShadowRef.current === shadow) {
            mountedShadowRef.current = null;
         }
      };
   }, [
      shadowReady,
      shadowRootRef,
      draggedElementRef,
      handleMergeFieldKeyDownRef,
      processSubtree,
      buildProcessedFragment,
      schedulePageBreaks,
      scheduleMergeFieldCheck,
      setSelectedEid,
      updateEmptyState,
      applyPreviewCleanup
   ]);

   // Effect B: Update styles/header/preview and apply external content changes
   useEffect(() => {
      if (!shadowReady || !mountedShadowRef.current) return;

      const shadow = shadowRootRef.current;
      if (!shadow) return;

      // Build a dimension key to detect changes
      const pagePadding = 40;
      const dimensionKey = `${editorDocument.pageWidth?.value}${editorDocument.pageWidth?.unit}|${editorDocument.pageHeight?.value}${editorDocument.pageHeight?.unit}`;

      // Only rebuild CSS when dimensions actually change
      if (dimensionKey !== lastAppliedDimensionsRef.current) {
         const styleEl = shadow.getElementById('editor-dynamic-styles');
         if (styleEl) {
            const EditorStylesStr = EDITOR_STYLES({
               currentPageHeight: {
                  value: editorDocument?.pageHeight?.value,
                  unit: editorDocument?.pageHeight?.unit
               }
            });

            const containerFlowMinHeight = `calc(${editorDocument.pageHeight?.value}${editorDocument.pageHeight?.unit} - ${pagePadding * 2
               }px) !important`;

            const pagesContainerHeight =
               editorDocument.pageHeight?.unit === 'vh'
                  ? `min-height: ${editorDocument.pageHeight?.value}${editorDocument.pageHeight?.unit} !important`
                  : `height: ${editorDocument.pageHeight?.value}${editorDocument.pageHeight?.unit} !important`;

            styleEl.textContent = /* css */ `
               ${EditorStylesStr}

               .pages-wrapper { padding: 40px 20px 60px; min-height: 100%; }

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

               .content-flow > *:not(.page-break-spacer) { max-width: 100%; box-sizing: border-box; }
               .content-flow img { max-width: 100%; height: auto; }

               .content-flow:empty::before,
               .content-flow:not(:has([data-eid]))::before {
                  content: "Drag elements here...";
                  color: #9ca3af;
                  font-style: italic;
                  display: block;
               }

               .page-overlay {
                  position: absolute;
                  top: 0; left: 0; right: 0; bottom: 0;
                  pointer-events: none;
                  z-index: 0;
               }

               .page-overlay .page {
                  position: absolute;
                  left: 0; right: 0;
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
                  box-shadow: rgba(0, 0, 0, 0.1) 0px 20px 20px -20px inset,
                              rgba(0, 0, 0, 0.1) 0px -20px 20px -20px inset;
                  display: flex;
                  align-items: center;
                  justify-content: center;
               }

               .page-overlay .page-gap-label { font-size: 11px; color: #6b7280; }

               .pages-wrapper[data-preview-mode="true"] { padding: 20px; }
               .pages-wrapper[data-preview-mode="true"] .document-header { display: none; }
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

               .pages-wrapper[data-preview-mode="true"] .content-flow { pointer-events: none !important; }

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
               .pages-wrapper[data-preview-mode="true"] .content-flow:not(:has([data-eid]))::before { display: none; }

               .pages-wrapper[data-preview-mode="true"] [data-empty="true"]::before { display: none !important; }

               /* Hide container editor artifacts in preview mode */
               .pages-wrapper[data-preview-mode="true"] [data-column-container="true"] {
                  outline: none !important;
                  box-shadow: none !important;
               }
               .pages-wrapper[data-preview-mode="true"] [data-column-container="true"]::before {
                  display: none !important;
               }
               .pages-wrapper[data-preview-mode="true"] .column-toolbar,
               .pages-wrapper[data-preview-mode="true"] .table-toolbar {
                  display: none !important;
               }
               .pages-wrapper[data-preview-mode="true"] [data-table-container="true"] {
                  outline: none !important;
                  box-shadow: none !important;
               }
               .pages-wrapper[data-preview-mode="true"] [data-table-container="true"]::before {
                  display: none !important;
               }
               .pages-wrapper[data-preview-mode="true"] .drop-zone {
                  min-height: 0 !important;
               }
               .pages-wrapper[data-preview-mode="true"] .drop-zone:empty::after {
                  display: none !important;
               }
               .pages-wrapper[data-preview-mode="true"] [data-table-container="true"] td:empty::after,
               .pages-wrapper[data-preview-mode="true"] [data-table-container="true"] th:empty::after {
                  display: none !important;
               }
            `;
         }

         lastAppliedDimensionsRef.current = dimensionKey;
      }

      // Update header text
      const docName = shadow.querySelector('.doc-name') as HTMLElement | null;
      const docDimensions = shadow.querySelector('.doc-dimensions') as HTMLElement | null;
      if (docName) docName.textContent = editorDocument.name;
      if (docDimensions) {
         docDimensions.textContent = `${editorDocument.pageWidth?.value}${editorDocument.pageWidth?.unit} × ${editorDocument.pageHeight?.value}${editorDocument.pageHeight?.unit}`;
      }

      const pagesWrapper = shadow.querySelector('.pages-wrapper') as HTMLElement | null;
      const contentFlow = shadow.querySelector('.content-flow') as HTMLElement | null;
      if (!pagesWrapper || !contentFlow) return;

      // Preview mode attr
      if (isPreviewMode) pagesWrapper.setAttribute('data-preview-mode', 'true');
      else pagesWrapper.removeAttribute('data-preview-mode');

      // Detect if this is a preview mode toggle (no content change)
      const previewModeChanged = isPreviewMode !== lastPreviewModeRef.current;
      lastPreviewModeRef.current = isPreviewMode;

      // Apply external content changes only when content string actually changes
      const incoming = editorDocument.content ?? '';
      const contentChanged = incoming !== lastAppliedContentRef.current;

      // If content changed, force reset typing guard (undo/redo must apply even while focused)
      if (contentChanged) {
         isUserTypingRef.current = false;
      }

      // Skip DOM overwrite only if user is typing AND content hasn't changed
      if (isUserTypingRef.current && !contentChanged) {
         return;
      }

      if (!contentChanged) {
         // Handle preview mode toggle without full tree rebuild
         if (previewModeChanged) {
            if (isPreviewMode) {
               applyPreviewCleanup(shadow);
            } else {
               // Restore toolbars/contenteditable - targeted pass only for elements missing them
               processSubtree(contentFlow, false);
            }
         }
         schedulePageBreaks();
         return;
      }

      // Parse incoming HTML and extract content
      const tempDiv = document.createElement('div');
      tempDiv.innerHTML = incoming;

      const newContentFlow = tempDiv.querySelector('.content-flow');
      const nextHTML = newContentFlow ? newContentFlow.innerHTML : tempDiv.innerHTML;

      // Preserve last selected eid from our ref (state-driven)
      const selectedEid = lastSelectedEidRef.current;

      // Replace content (external change: undo/redo/load)
      contentFlow.innerHTML = nextHTML;

      // Process nodes for current mode
      processSubtree(contentFlow, isPreviewMode);

      // Restore selection highlight if you use it in DOM
      if (!isPreviewMode && selectedEid) {
         const selectedEl = contentFlow.querySelector(`[data-eid="${CSS.escape(selectedEid)}"]`) as HTMLElement | null;
         if (selectedEl) selectedEl.setAttribute('data-selected', 'true');
      }

      // Preview specifics: single-pass cleanup
      if (isPreviewMode) {
         applyPreviewCleanup(shadow);
      }

      lastAppliedContentRef.current = incoming;
      schedulePageBreaks();
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
      processSubtree,
      schedulePageBreaks,
      applyPreviewCleanup
   ]);
}

export default useEditorRenderer;
