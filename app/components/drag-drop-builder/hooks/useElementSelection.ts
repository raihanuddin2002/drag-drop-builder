import { useState, useCallback, useEffect, RefObject } from 'react';

export interface UseElementSelectionOptions {
   shadowRootRef: RefObject<ShadowRoot | null>;
}

/**
 * useElementSelection - A reusable hook for managing element selection in an editor
 *
 * Features:
 * - Tracks selected element by XPath
 * - Provides helper to get selected DOM element
 * - Maintains selection after re-renders
 * - Clears selection when element is removed
 *
 * @example
 * ```tsx
 * const {
 *   selectedXPath,
 *   setSelectedXPath,
 *   getSelectedElement,
 *   clearSelection
 * } = useElementSelection({ shadowRootRef });
 * ```
 */
export function useElementSelection({ shadowRootRef }: UseElementSelectionOptions) {
   const [selectedXPath, setSelectedXPath] = useState<string | null>(null);

   // Get the currently selected DOM element
   const getSelectedElement = useCallback((): HTMLElement | null => {
      const shadow = shadowRootRef.current;
      if (!shadow || !selectedXPath) return null;

      return shadow.querySelector(`[data-xpath="${selectedXPath}"]`) as HTMLElement | null;
   }, [shadowRootRef, selectedXPath]);

   // Clear selection
   const clearSelection = useCallback(() => {
      setSelectedXPath(null);
   }, []);

   // Select element by XPath
   const selectElement = useCallback((xpath: string | null) => {
      setSelectedXPath(xpath);
   }, []);

   // Select element by DOM element
   const selectDOMElement = useCallback((element: HTMLElement | null) => {
      if (!element) {
         setSelectedXPath(null);
         return;
      }
      const xpath = element.getAttribute('data-xpath');
      setSelectedXPath(xpath);
   }, []);

   // Update data-selected attribute on elements
   const updateSelectionAttribute = useCallback(() => {
      const shadow = shadowRootRef.current;
      if (!shadow) return;

      // Remove selection from all elements
      shadow.querySelectorAll('[data-selected="true"]').forEach(el => {
         el.removeAttribute('data-selected');
      });

      // Add selection to current element
      if (selectedXPath) {
         const el = shadow.querySelector(`[data-xpath="${selectedXPath}"]`);
         if (el) {
            el.setAttribute('data-selected', 'true');
         }
      }
   }, [shadowRootRef, selectedXPath]);

   // Sync selection attribute when selection changes
   useEffect(() => {
      updateSelectionAttribute();
   }, [updateSelectionAttribute]);

   // Verify selection still exists after content changes
   const verifySelection = useCallback(() => {
      const shadow = shadowRootRef.current;
      if (!shadow || !selectedXPath) return;

      const el = shadow.querySelector(`[data-xpath="${selectedXPath}"]`);
      if (!el) {
         // Element no longer exists, clear selection
         setSelectedXPath(null);
      }
   }, [shadowRootRef, selectedXPath]);

   return {
      selectedXPath,
      setSelectedXPath,
      getSelectedElement,
      clearSelection,
      selectElement,
      selectDOMElement,
      updateSelectionAttribute,
      verifySelection
   };
}

export default useElementSelection;
