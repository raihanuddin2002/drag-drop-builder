import { useCallback, RefObject } from 'react';

export interface UseTableManipulationOptions {
   shadowRootRef: RefObject<ShadowRoot | null>;
   selectedEid: string | null;
   onSaveHistory: () => void;
   onUpdateContent: () => void;
   onCalculatePageBreaks: () => void;
   onClearSelection: () => void;
   onCloseTableModal?: () => void;
}

/**
 * useTableManipulation - A hook for manipulating tables in the editor
 *
 * Features:
 * - Add/remove rows and columns
 * - Delete entire tables
 * - Resize tables to new dimensions
 *
 * @example
 * ```tsx
 * const {
 *   addTableRow,
 *   addTableColumn,
 *   deleteTableRow,
 *   deleteTableColumn,
 *   deleteTable,
 *   resizeTable
 * } = useTableManipulation({
 *   shadowRootRef,
 *   selectedXPath,
 *   onSaveHistory: saveHistory,
 *   onUpdateContent: updateContentFromShadow,
 *   onCalculatePageBreaks: calculatePageBreaksRAF,
 *   onClearSelection: () => setSelectedXPath(null)
 * });
 * ```
 */
export function useTableManipulation({
   shadowRootRef,
   selectedEid,
   onSaveHistory,
   onUpdateContent,
   onCalculatePageBreaks,
   onClearSelection,
   onCloseTableModal
}: UseTableManipulationOptions) {

   // Get selected element helper
   const getSelectedElement = useCallback((): HTMLElement | null => {
      const shadow = shadowRootRef.current;
      if (!shadow || !selectedEid) return null;
      return shadow.querySelector(`[data-eid="${selectedEid}"]`) as HTMLElement | null;
   }, [shadowRootRef, selectedEid]);

   // Get table from selected element
   const getTable = useCallback((): HTMLTableElement | null => {
      const el = getSelectedElement();
      if (!el) return null;
      return el.tagName === 'TABLE' ? el as HTMLTableElement : el.closest('table') as HTMLTableElement;
   }, [getSelectedElement]);

   // Add a row to the table
   const addTableRow = useCallback((position: 'above' | 'below') => {
      const el = getSelectedElement();
      const table = getTable();
      if (!el || !table) return;

      const row = el.closest('tr') as HTMLTableRowElement;
      const rowIndex = row ? row.rowIndex : (position === 'above' ? 0 : table.rows.length - 1);
      const colCount = table.rows[0]?.cells.length || 1;

      onSaveHistory();

      const newRow = table.insertRow(position === 'above' ? rowIndex : rowIndex + 1);
      for (let i = 0; i < colCount; i++) {
         const cell = newRow.insertCell();
         cell.style.cssText = 'border: 1px solid #ccc; padding: 8px; min-width: 50px;';
         cell.setAttribute('contenteditable', 'true');
         cell.innerHTML = '&nbsp;';
      }

      onUpdateContent();
      onCalculatePageBreaks();
   }, [getSelectedElement, getTable, onSaveHistory, onUpdateContent, onCalculatePageBreaks]);

   // Add a column to the table
   const addTableColumn = useCallback((position: 'left' | 'right') => {
      const el = getSelectedElement();
      const table = getTable();
      if (!el || !table) return;

      const cell = el.closest('td, th') as HTMLTableCellElement;
      const colIndex = cell ? cell.cellIndex : (position === 'left' ? 0 : (table.rows[0]?.cells.length || 1) - 1);

      onSaveHistory();

      for (let i = 0; i < table.rows.length; i++) {
         const newCell = table.rows[i].insertCell(position === 'left' ? colIndex : colIndex + 1);
         newCell.style.cssText = 'border: 1px solid #ccc; padding: 8px; min-width: 50px;';
         newCell.setAttribute('contenteditable', 'true');
         newCell.innerHTML = '&nbsp;';
      }

      onUpdateContent();
      onCalculatePageBreaks();
   }, [getSelectedElement, getTable, onSaveHistory, onUpdateContent, onCalculatePageBreaks]);

   // Delete a row from the table
   const deleteTableRow = useCallback(() => {
      const el = getSelectedElement();
      const table = getTable();
      if (!el || !table || table.rows.length <= 1) return;

      const row = el.closest('tr') as HTMLTableRowElement;
      if (!row) return;

      onSaveHistory();
      table.deleteRow(row.rowIndex);
      onUpdateContent();
      onCalculatePageBreaks();
   }, [getSelectedElement, getTable, onSaveHistory, onUpdateContent, onCalculatePageBreaks]);

   // Delete a column from the table
   const deleteTableColumn = useCallback(() => {
      const el = getSelectedElement();
      const table = getTable();
      if (!el || !table || !table.rows[0] || table.rows[0].cells.length <= 1) return;

      const cell = el.closest('td, th') as HTMLTableCellElement;
      if (!cell) return;

      const colIndex = cell.cellIndex;

      onSaveHistory();
      for (let i = 0; i < table.rows.length; i++) {
         if (table.rows[i].cells[colIndex]) {
            table.rows[i].deleteCell(colIndex);
         }
      }

      onUpdateContent();
      onCalculatePageBreaks();
   }, [getSelectedElement, getTable, onSaveHistory, onUpdateContent, onCalculatePageBreaks]);

   // Delete the entire table
   const deleteTable = useCallback(() => {
      const table = getTable();
      if (!table) return;

      onSaveHistory();
      table.remove();
      onClearSelection();
      onUpdateContent();
      onCalculatePageBreaks();
   }, [getTable, onSaveHistory, onClearSelection, onUpdateContent, onCalculatePageBreaks]);

   // Resize table to new dimensions
   const resizeTable = useCallback((newRows: number, newCols: number) => {
      const table = getTable();
      if (!table) return;

      onSaveHistory();

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

      onUpdateContent();
      onCalculatePageBreaks();
      onCloseTableModal?.();
   }, [getTable, onSaveHistory, onUpdateContent, onCalculatePageBreaks, onCloseTableModal]);

   // Get current table dimensions
   const getTableDimensions = useCallback((): { rows: number; cols: number } | null => {
      const table = getTable();
      if (!table) return null;
      return {
         rows: table.rows.length,
         cols: table.rows[0]?.cells.length || 0
      };
   }, [getTable]);

   return {
      addTableRow,
      addTableColumn,
      deleteTableRow,
      deleteTableColumn,
      deleteTable,
      resizeTable,
      getTableDimensions,
      getTable
   };
}

export default useTableManipulation;
