import { useCallback, RefObject } from 'react';

export interface UseElementManipulationOptions {
   shadowRootRef: RefObject<ShadowRoot | null>;
   selectedXPath: string | null;
   onSaveHistory: () => void;
   onUpdateContent: () => void;
   onCalculatePageBreaks: () => void;
   onClearSelection: () => void;
}

// Toolbar HTML template for elements
const ELEMENT_TOOLBAR_HTML = /*html*/`
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

/**
 * useElementManipulation - A hook for manipulating editor elements
 *
 * Features:
 * - Update element content (text or HTML)
 * - Update element styles
 * - Update element attributes
 * - Manage inline links
 * - Delete and duplicate elements
 *
 * @example
 * ```tsx
 * const {
 *   updateContent,
 *   updateStyle,
 *   deleteElement,
 *   duplicateElement
 * } = useElementManipulation({
 *   shadowRootRef,
 *   selectedXPath,
 *   onSaveHistory: saveHistory,
 *   onUpdateContent: updateContentFromShadow,
 *   onCalculatePageBreaks: calculatePageBreaksRAF,
 *   onClearSelection: () => setSelectedXPath(null)
 * });
 * ```
 */
export function useElementManipulation({
   shadowRootRef,
   selectedXPath,
   onSaveHistory,
   onUpdateContent,
   onCalculatePageBreaks,
   onClearSelection
}: UseElementManipulationOptions) {

   // Get the currently selected element
   const getSelectedElement = useCallback((): HTMLElement | null => {
      const shadow = shadowRootRef.current;
      if (!shadow || !selectedXPath) return null;
      return shadow.querySelector(`[data-xpath="${selectedXPath}"]`) as HTMLElement | null;
   }, [shadowRootRef, selectedXPath]);

   // Update element content
   const updateContent = useCallback((value: string, isHtml: boolean = false): void => {
      const el = getSelectedElement();
      if (!el) return;

      onSaveHistory();

      if (isHtml) {
         el.innerHTML = value;
         // Re-add toolbar
         const toolbar = window.document.createElement('div');
         toolbar.className = 'element-toolbar';
         toolbar.setAttribute('contenteditable', 'false');
         toolbar.innerHTML = ELEMENT_TOOLBAR_HTML;
         el.insertBefore(toolbar, el.firstChild);
      } else if (el.tagName === 'IMG') {
         (el as HTMLImageElement).src = value;
      } else {
         el.textContent = value;
      }
      onUpdateContent();
      onCalculatePageBreaks();
   }, [getSelectedElement, onSaveHistory, onUpdateContent, onCalculatePageBreaks]);

   // Update element style
   const updateStyle = useCallback((prop: string, value: string, livePreview?: boolean): void => {
      const el = getSelectedElement();
      if (!el) return;

      if (!livePreview) onSaveHistory();
      (el.style as any)[prop] = value;
      if (!livePreview) {
         onUpdateContent();
         onCalculatePageBreaks();
      }
   }, [getSelectedElement, onSaveHistory, onUpdateContent, onCalculatePageBreaks]);

   // Update element attribute
   const updateAttribute = useCallback((attr: string, value: string): void => {
      const el = getSelectedElement();
      if (!el) return;

      onSaveHistory();
      el.setAttribute(attr, value);
      onUpdateContent();
   }, [getSelectedElement, onSaveHistory, onUpdateContent]);

   // Update inline link
   const updateInlineLink = useCallback((index: number, href: string): void => {
      const el = getSelectedElement();
      if (!el) return;

      const links = el.querySelectorAll('a');
      if (links[index]) {
         onSaveHistory();
         links[index].setAttribute('href', href);
         links[index].setAttribute('target', '_blank');
         links[index].setAttribute('rel', 'noopener noreferrer');
         onUpdateContent();
      }
   }, [getSelectedElement, onSaveHistory, onUpdateContent]);

   // Remove inline link
   const removeInlineLink = useCallback((index: number): void => {
      const el = getSelectedElement();
      if (!el) return;

      const links = el.querySelectorAll('a');
      if (links[index]) {
         onSaveHistory();
         const link = links[index];
         const fragment = window.document.createDocumentFragment();
         while (link.firstChild) {
            fragment.appendChild(link.firstChild);
         }
         link.parentNode?.replaceChild(fragment, link);
         onUpdateContent();
      }
   }, [getSelectedElement, onSaveHistory, onUpdateContent]);

   // Update custom CSS
   const updateCustomCss = useCallback((css: string): void => {
      const el = getSelectedElement();
      if (!el) return;

      onSaveHistory();
      el.setAttribute('style', css);
      onUpdateContent();
      onCalculatePageBreaks();
   }, [getSelectedElement, onSaveHistory, onUpdateContent, onCalculatePageBreaks]);

   // Delete element
   const deleteElement = useCallback((): void => {
      const el = getSelectedElement();
      if (!el || el.hasAttribute('data-container')) return;

      onSaveHistory();
      el.remove();
      onUpdateContent();
      onClearSelection();
      onCalculatePageBreaks();
   }, [getSelectedElement, onSaveHistory, onUpdateContent, onClearSelection, onCalculatePageBreaks]);

   // Duplicate element
   const duplicateElement = useCallback((): void => {
      const el = getSelectedElement();
      if (!el || el.hasAttribute('data-container')) return;

      onSaveHistory();
      const clone = el.cloneNode(true) as HTMLElement;
      clone.removeAttribute('data-xpath');
      clone.removeAttribute('data-selected');
      clone.removeAttribute('contenteditable');
      clone.querySelectorAll('.element-toolbar').forEach(t => t.remove());

      el.parentNode?.insertBefore(clone, el.nextSibling);
      onUpdateContent();
      onCalculatePageBreaks();
   }, [getSelectedElement, onSaveHistory, onUpdateContent, onCalculatePageBreaks]);

   return {
      getSelectedElement,
      updateContent,
      updateStyle,
      updateAttribute,
      updateInlineLink,
      removeInlineLink,
      updateCustomCss,
      deleteElement,
      duplicateElement
   };
}

export default useElementManipulation;
