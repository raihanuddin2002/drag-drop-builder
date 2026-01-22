import { useState, useCallback, RefObject } from 'react';

export interface UseTableModalOptions {
   shadowRootRef: RefObject<ShadowRoot | null>;
   onSaveHistory: () => void;
   onUpdateContent: () => void;
   onCalculatePageBreaks: () => void;
}

export interface TableModalState {
   show: boolean;
   mode: 'create' | 'resize';
   hover: { rows: number; cols: number };
}

export const TABLE_GRID_ROWS = 8;
export const TABLE_GRID_COLS = 10;
export const TABLE_PLACEHOLDER_ID = 'table-placeholder-marker';

/**
 * Generates HTML for a table with the specified dimensions
 */
export function generateTableHtml(rows: number, cols: number): string {
   let tableHtml = '<div data-table-container="true" style="margin: 10px 0;">';
   tableHtml += '<table style="border-collapse: collapse; width: 100%; table-layout: fixed;">';
   for (let r = 0; r < rows; r++) {
      tableHtml += '<tr>';
      for (let c = 0; c < cols; c++) {
         tableHtml += '<td style="border: 1px solid #ccc; padding: 8px; word-wrap: break-word; overflow-wrap: break-word;" contenteditable="true">&nbsp;</td>';
      }
      tableHtml += '</tr>';
   }
   tableHtml += '</table>';
   tableHtml += '</div>';
   return tableHtml;
}

/**
 * useTableModal - A hook for managing table creation modal
 *
 * Features:
 * - Manages table creation modal state
 * - Generates table HTML
 * - Inserts tables at placeholder position
 * - Handles modal close with cleanup
 *
 * @example
 * ```tsx
 * const {
 *   tableModal,
 *   setTableModalShow,
 *   setTableModalMode,
 *   setTableHover,
 *   insertTable,
 *   closeModal
 * } = useTableModal({
 *   shadowRootRef,
 *   onSaveHistory: saveHistory,
 *   onUpdateContent: updateContentFromShadow,
 *   onCalculatePageBreaks: calculatePageBreaksRAF
 * });
 * ```
 */
export function useTableModal({
   shadowRootRef,
   onSaveHistory,
   onUpdateContent,
   onCalculatePageBreaks
}: UseTableModalOptions) {
   const [tableModal, setTableModal] = useState<TableModalState>({
      show: false,
      mode: 'create',
      hover: { rows: 0, cols: 0 }
   });

   // Set modal visibility
   const setTableModalShow = useCallback((show: boolean) => {
      setTableModal(prev => ({ ...prev, show }));
   }, []);

   // Set modal mode
   const setTableModalMode = useCallback((mode: 'create' | 'resize') => {
      setTableModal(prev => ({ ...prev, mode }));
   }, []);

   // Set hover state for grid preview
   const setTableHover = useCallback((hover: { rows: number; cols: number }) => {
      setTableModal(prev => ({ ...prev, hover }));
   }, []);

   // Insert table at the placeholder position
   const insertTable = useCallback((rows: number, cols: number) => {
      const shadow = shadowRootRef.current;
      if (!shadow) return;

      const placeholder = shadow.querySelector(`#${TABLE_PLACEHOLDER_ID}`);
      if (!placeholder) return;

      const tableHtml = generateTableHtml(rows, cols);
      onSaveHistory();

      placeholder.insertAdjacentHTML('beforebegin', tableHtml);
      placeholder.remove();

      onUpdateContent();
      onCalculatePageBreaks();
      setTableModal({ show: false, mode: 'create', hover: { rows: 0, cols: 0 } });
   }, [shadowRootRef, onSaveHistory, onUpdateContent, onCalculatePageBreaks]);

   // Close table modal with cleanup
   const closeModal = useCallback(() => {
      const shadow = shadowRootRef.current;
      // Clean up placeholder if modal is cancelled (only in create mode)
      if (shadow && tableModal.mode === 'create') {
         const placeholder = shadow.querySelector(`#${TABLE_PLACEHOLDER_ID}`);
         if (placeholder) {
            placeholder.remove();
            onUpdateContent();
         }
      }
      setTableModal({ show: false, mode: 'create', hover: { rows: 0, cols: 0 } });
   }, [shadowRootRef, tableModal.mode, onUpdateContent]);

   // Open modal for creating a new table
   const openCreateModal = useCallback(() => {
      setTableModal({ show: true, mode: 'create', hover: { rows: 0, cols: 0 } });
   }, []);

   // Open modal for resizing an existing table
   const openResizeModal = useCallback(() => {
      setTableModal({ show: true, mode: 'resize', hover: { rows: 0, cols: 0 } });
   }, []);

   return {
      tableModal,
      setTableModalShow,
      setTableModalMode,
      setTableHover,
      insertTable,
      closeModal,
      openCreateModal,
      openResizeModal,
      // Export constants for external use
      TABLE_GRID_ROWS,
      TABLE_GRID_COLS,
      TABLE_PLACEHOLDER_ID
   };
}

export default useTableModal;
