/**
 * Drag and Drop Builder Hooks
 *
 * A collection of reusable React hooks for building document editors.
 * Each hook is self-contained and can be used independently.
 */

// Pagination hook - calculates page breaks and renders overlays
export { usePagination } from './usePagination';
export type { PaginationConfig, UsePaginationOptions } from './usePagination';

// Paste handler hook - sanitizes pasted content
export { usePasteHandler, sanitizePasteText, htmlToPlainText, findContentEditable } from './usePasteHandler';
export type { UsePasteHandlerOptions } from './usePasteHandler';

// History hook - undo/redo functionality
export { useHistory } from './useHistory';
export type { HistoryState, UseHistoryOptions, UseHistoryReturn } from './useHistory';

// Merge fields hook - autocomplete for merge field tokens
export { useMergeFields } from './useMergeFields';
export type { MergeFieldDefinition, MergeFieldSuggestionState, UseMergeFieldsOptions } from './useMergeFields';

// Element selection hook - manages selected element state
export { useElementSelection } from './useElementSelection';
export type { UseElementSelectionOptions } from './useElementSelection';

// Drag and drop hook - handles drag/drop for blocks
export { useDragDrop } from './useDragDrop';
export type { DragDropBlock, UseDragDropOptions } from './useDragDrop';

// Table modal hook - manages table creation modal
export { useTableModal, generateTableHtml, TABLE_GRID_ROWS, TABLE_GRID_COLS, TABLE_PLACEHOLDER_ID } from './useTableModal';
export type { UseTableModalOptions, TableModalState } from './useTableModal';

// Element manipulation hook - update/delete/duplicate elements
export { useElementManipulation } from './useElementManipulation';
export type { UseElementManipulationOptions } from './useElementManipulation';

// Table manipulation hook - add/remove rows/columns, resize tables
export { useTableManipulation } from './useTableManipulation';
export type { UseTableManipulationOptions } from './useTableManipulation';

// Rich text hook - formatting commands for contenteditable
export { useRichText } from './useRichText';
export type { UseRichTextOptions } from './useRichText';

// Export hook - HTML and PDF export functionality
export { useExport } from './useExport';
export type { UseExportOptions, ExportDocument } from './useExport';
