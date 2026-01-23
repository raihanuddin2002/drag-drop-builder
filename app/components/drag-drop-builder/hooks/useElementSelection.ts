import { useState, useCallback, useEffect, RefObject } from 'react';

export interface UseElementSelectionOptions {
   shadowRootRef: RefObject<ShadowRoot | null>;
}

/**
 * useElementSelection - A reusable hook for managing element selection in an editor
 *
 * Features:
 * - Tracks selected element by stable element ID (data-eid)
 * - Provides helper to get selected DOM element
 * - Maintains selection after re-renders
 * - Clears selection when element is removed
 *
 * @example
 * ```tsx
 * const {
 *   selectedEid,
 *   setSelectedEid,
 *   getSelectedElement,
 *   clearSelection
 * } = useElementSelection({ shadowRootRef });
 * ```
 */
export function useElementSelection({ shadowRootRef }: UseElementSelectionOptions) {
   const [selectedEid, setSelectedEid] = useState<string | null>(null);

   // Get the currently selected DOM element
   const getSelectedElement = useCallback((): HTMLElement | null => {
      const shadow = shadowRootRef.current;
      if (!shadow || !selectedEid) return null;

      return shadow.querySelector(`[data-eid="${selectedEid}"]`) as HTMLElement | null;
   }, [shadowRootRef, selectedEid]);

   // Clear selection
   const clearSelection = useCallback(() => {
      setSelectedEid(null);
   }, []);

   // Select element by ID
   const selectElement = useCallback((eid: string | null) => {
      setSelectedEid(eid);
   }, []);

   // Select element by DOM element
   const selectDOMElement = useCallback((element: HTMLElement | null) => {
      if (!element) {
         setSelectedEid(null);
         return;
      }
      const eid = element.getAttribute('data-eid');
      setSelectedEid(eid);
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
      if (selectedEid) {
         const el = shadow.querySelector(`[data-eid="${selectedEid}"]`);
         if (el) {
            el.setAttribute('data-selected', 'true');
         }
      }
   }, [shadowRootRef, selectedEid]);

   // Sync selection attribute when selection changes
   useEffect(() => {
      updateSelectionAttribute();
   }, [updateSelectionAttribute]);

   // Verify selection still exists after content changes
   const verifySelection = useCallback(() => {
      const shadow = shadowRootRef.current;
      if (!shadow || !selectedEid) return;

      const el = shadow.querySelector(`[data-eid="${selectedEid}"]`);
      if (!el) {
         // Element no longer exists, clear selection
         setSelectedEid(null);
      }
   }, [shadowRootRef, selectedEid]);

   return {
      selectedEid,
      setSelectedEid,
      getSelectedElement,
      clearSelection,
      selectElement,
      selectDOMElement,
      updateSelectionAttribute,
      verifySelection
   };
}

export default useElementSelection;
