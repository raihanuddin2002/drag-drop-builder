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
   Block,
   EditorDocument,
   Height,
   Width
} from "./type";
import { PAGE_PRESETS } from "./data";
import { MergeFieldData } from "./utils";
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
   useMergeFields,
   useElementInfo,
   useEditorRenderer,
   MergeFieldDefinition,
   TABLE_GRID_ROWS,
   TABLE_GRID_COLS,
   TABLE_PLACEHOLDER_ID
} from "./hooks";
import { ElementsSidebar } from "./ElementsSidebar";
import { PageSizeSettings } from "./PageSizeSettings";

const generateDocId = () => `doc-${Date.now()}-${Math.random().toString(36).substring(2, 11)}`;
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
      content: /*html*/`<div class="content-flow" data-container="true"></div>`,
      pageFormat: defaultPagePreset?.key,
   }));

   // Calculated page count based on content height
   const [pageCount, setPageCount] = useState(1);

   // Selection state
   const [selectedXPath, setSelectedXPath] = useState<string | null>(null);
   // const [breakpoint, setBreakpoint] = useState<Breakpoint>('desktop');
   const [draggedComponent, setDraggedComponent] = useState<Block | null>(null);
   const [isPreviewMode, setIsPreviewMode] = useState<boolean>(false);
   const [editorKey, setEditorKey] = useState<number>(0);

   // History for undo/redo - using useHistory hook
   const {
      saveHistory,
      undo,
      redo,
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
   const { exportPDF, importHTML } = useExport({
      shadowRootRef,
      mergeFieldData,
      onSaveHistory: saveHistory,
      onSetContent: (content) => setEditorDocument(prev => ({ ...prev, content })),
      onClearSelection: () => setSelectedXPath(null)
   });

   // Merge fields autocomplete hook
   const {
      suggestions: mergeFieldSuggestions,
      filteredFields: filteredMergeFields,
      checkTriggerRef: checkMergeFieldTriggerRef,
      handleKeyDownRef: handleMergeFieldKeyDownRef,
      insertField: insertMergeFieldFromAutocomplete,
      setSelectedIndex: setMergeFieldSelectedIndex
   } = useMergeFields({
      shadowRootRef,
      availableFields: availableMergeFields,
      onSaveHistory: saveHistory,
      onUpdateContent: updateContentFromShadow
   });

   // Element info hook
   const { getElementInfo } = useElementInfo({
      shadowRootRef,
      selectedXPath
   });

   // Editor renderer hook - main render effect (SHADOW DOM RENDERING)
   useEditorRenderer({
      shadowRootRef,
      shadowReady,
      editorDocument,
      isPreviewMode,
      draggedComponent,
      draggedElementRef,
      checkMergeFieldTriggerRef,
      handleMergeFieldKeyDownRef,
      tablePlaceholderId: TABLE_PLACEHOLDER_ID,
      onSaveHistory: saveHistory,
      onUpdateContent: updateContentFromShadow,
      onCalculatePageBreaks: calculatePageBreaksRAF,
      onSetSelectedXPath: setSelectedXPath,
      onSetDraggedComponent: setDraggedComponent,
      onSetTableModalMode: setTableModalMode,
      onShowTableModal: setShowTableModal,
      setupPasteHandlers
   });

   // Update selection highlight
   useEffect(() => {
      const shadow = shadowRootRef.current;
      if (!shadow) return;

      shadow.querySelectorAll('[data-selected]').forEach(el => el.removeAttribute('data-selected'));

      if (selectedXPath) {
         const el = shadow.querySelector(`[data-xpath="${selectedXPath}"]`);
         if (el) {
            el.setAttribute('data-selected', 'true');
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
                     onMouseEnter={() => setMergeFieldSelectedIndex(index)}
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
