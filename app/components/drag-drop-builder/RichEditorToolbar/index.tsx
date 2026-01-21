import {
   AlignCenter,
   AlignJustify,
   AlignLeft,
   AlignRight,
   Bold,
   Indent,
   Italic,
   Link,
   Unlink,
   List,
   ListOrdered,
   Outdent,
   Strikethrough,
   Subscript,
   Superscript,
   Table,
   Underline,
   Trash2,
   Plus,
   Minus,
   Columns2Icon,
   Rows2Icon
} from "lucide-react";
import { useRef, useEffect, useState } from "react";
import { RICH_TOOLBAR_FONT_FAMILIES, RICH_TOOLBAR_FONT_SIZES } from "../data";
import { ElementInfo } from "../type";

export type RichTextToolbarProps = {
   onFormat: (command: string, value?: string) => void;
   onUpdateStyle?: (prop: string, value: string, livePreview?: boolean) => void;
   onCommitChanges?: () => void;
   elementInfo?: ElementInfo | null;
   // Table manipulation callbacks
   onAddTableRow?: (position: 'above' | 'below') => void;
   onAddTableColumn?: (position: 'left' | 'right') => void;
   onDeleteTableRow?: () => void;
   onDeleteTableColumn?: () => void;
   onDeleteTable?: () => void;
   onOpenTableResize?: () => void;
}

export default function RichTextToolbar({
   onFormat,
   onUpdateStyle,
   onCommitChanges,
   elementInfo,
   onAddTableRow,
   onAddTableColumn,
   onDeleteTableRow,
   onDeleteTableColumn,
   onDeleteTable,
   onOpenTableResize
}: RichTextToolbarProps) {
   const [fontSize, setFontSize] = useState('16px');
   const [fontFamily, setFontFamily] = useState('Arial');
   const [fontColor, setFontColor] = useState('#000000');
   const [textAlign, setTextAlign] = useState('left');
   const [showTableGrid, setShowTableGrid] = useState(false);
   const [tableHover, setTableHover] = useState({ rows: 0, cols: 0 });
   const savedSelectionRef = useRef<Range | null>(null);
   const colorInputRef = useRef<HTMLInputElement>(null);
   const tableGridRef = useRef<HTMLDivElement>(null);

   const TABLE_GRID_ROWS = 8;
   const TABLE_GRID_COLS = 10;

   // Close table grid when clicking outside
   useEffect(() => {
      const handleClickOutside = (e: MouseEvent) => {
         if (tableGridRef.current && !tableGridRef.current.contains(e.target as Node)) {
            setShowTableGrid(false);
         }
      };
      if (showTableGrid) {
         document.addEventListener('mousedown', handleClickOutside);
      }
      return () => document.removeEventListener('mousedown', handleClickOutside);
   }, [showTableGrid]);

   // Insert table HTML
   const insertTable = (rows: number, cols: number) => {
      let tableHtml = '<table style="border-collapse: collapse; width: 100%;">';
      for (let r = 0; r < rows; r++) {
         tableHtml += '<tr>';
         for (let c = 0; c < cols; c++) {
            tableHtml += '<td style="border: 1px solid #ccc; padding: 8px; min-width: 50px;">&nbsp;</td>';
         }
         tableHtml += '</tr>';
      }
      tableHtml += '</table><p><br></p>';
      onFormat('insertHTML', tableHtml);
      setShowTableGrid(false);
      setTableHover({ rows: 0, cols: 0 });
   };

   // Sync with elementInfo when it changes
   useEffect(() => {
      if (elementInfo?.styles) {
         const styles = elementInfo.styles;

         // Sync font size
         const size = styles['font-size'] || styles.fontSize;
         if (size) setFontSize(size);

         // Sync font family
         const family = styles['font-family'] || styles.fontFamily;
         if (family) setFontFamily(family.replace(/['"]/g, '').split(',')[0].trim());

         // Sync color
         const color = styles.color;
         if (color) setFontColor(parseColorToHex(color));

         // Sync text align
         const align = styles['text-align'] || styles.textAlign;
         if (align) setTextAlign(align);
      }
   }, [elementInfo]);

   // Helper to convert rgb/rgba to hex
   const rgbToHex = (rgb: string): string => {
      const match = rgb.match(/^rgba?\((\d+),\s*(\d+),\s*(\d+)/);
      if (!match) return '#000000';
      const r = parseInt(match[1]).toString(16).padStart(2, '0');
      const g = parseInt(match[2]).toString(16).padStart(2, '0');
      const b = parseInt(match[3]).toString(16).padStart(2, '0');
      return `#${r}${g}${b}`;
   };

   // Helper to parse any color format to hex
   const parseColorToHex = (color: string): string => {
      if (!color) return '#000000';
      if (color.startsWith('#')) return color.slice(0, 7);
      if (color.startsWith('rgb')) return rgbToHex(color);
      return '#000000';
   };

   // Save current selection when interacting with toolbar
   const saveSelection = () => {
      const selection = document.getSelection();
      if (selection && selection.rangeCount > 0) {
         savedSelectionRef.current = selection.getRangeAt(0).cloneRange();
      }
   };

   // Restore saved selection
   const restoreSelection = () => {
      if (savedSelectionRef.current) {
         const selection = document.getSelection();
         if (selection) {
            selection.removeAllRanges();
            selection.addRange(savedSelectionRef.current);
         }
      }
   };

   const handleMouseDown = (e: React.MouseEvent, command: string, value?: string) => {
      e.preventDefault();
      onFormat(command, value);
   };

   return (
      <div className="flex justify-center items-center gap-1 bg-white border-b px-4 py-2 flex-wrap">
         <button onMouseDown={(e) => handleMouseDown(e, 'bold')} className="p-2 hover:bg-gray-100 rounded" title="Bold">
            <Bold size={16} />
         </button>
         <button onMouseDown={(e) => handleMouseDown(e, 'italic')} className="p-2 hover:bg-gray-100 rounded" title="Italic">
            <Italic size={16} />
         </button>
         <button onMouseDown={(e) => handleMouseDown(e, 'underline')} className="p-2 hover:bg-gray-100 rounded" title="Underline">
            <Underline size={16} />
         </button>
         <button onMouseDown={(e) => handleMouseDown(e, 'strikeThrough')} className="p-2 hover:bg-gray-100 rounded" title="Strikethrough">
            <Strikethrough size={16} />
         </button>

         <div className="w-px h-6 bg-gray-300 mx-1" />

         <button onMouseDown={(e) => handleMouseDown(e, 'insertUnorderedList')} className="p-2 hover:bg-gray-100 rounded" title="Bullet List">
            <List size={16} />
         </button>
         <button onMouseDown={(e) => handleMouseDown(e, 'insertOrderedList')} className="p-2 hover:bg-gray-100 rounded" title="Numbered List">
            <ListOrdered size={16} />
         </button>

         <div className="w-px h-6 bg-gray-300 mx-1" />

         <button onMouseDown={(e) => handleMouseDown(e, 'superscript')} className="p-2 hover:bg-gray-100 rounded" title="Superscript">
            <Superscript size={16} />
         </button>
         <button onMouseDown={(e) => handleMouseDown(e, 'subscript')} className="p-2 hover:bg-gray-100 rounded" title="Subscript">
            <Subscript size={16} />
         </button>

         <div className="w-px h-6 bg-gray-300 mx-1" />

         <button
            onMouseDown={(e) => {
               e.preventDefault();
               const url = prompt('Enter URL:');
               if (url) {
                  onFormat('createLink', url);
               }
            }}
            className="p-2 hover:bg-gray-100 rounded"
            title="Insert Link"
         >
            <Link size={16} />
         </button>
         <button
            onMouseDown={(e) => handleMouseDown(e, 'unlink')}
            className="p-2 hover:bg-gray-100 rounded"
            title="Remove Link"
         >
            <Unlink size={16} />
         </button>

         {/* Table Edit Options - only show when table/cell is selected */}
         {(elementInfo?.isTable || elementInfo?.isTableCell || elementInfo?.tableElement) && (
            <>
               <div className="w-px h-6 bg-gray-300 mx-1" />
               {/* Table Resize */}
               <div className="relative" ref={tableGridRef}>
                  <button
                     onMouseDown={(e) => {
                        e.preventDefault();
                        // If table is selected, use resize mode via callback
                        if (elementInfo?.isTable || elementInfo?.isTableCell || elementInfo?.tableElement) {
                           onOpenTableResize?.();
                        }
                     }}
                     className={`p-2 hover:bg-gray-100 rounded`}
                     title={"Resize Table"}
                  >
                     <Table size={16} />
                  </button>

                  {showTableGrid && (
                     <div className="absolute top-full left-0 mt-1 bg-white border rounded shadow-lg p-2 z-50">
                        <div className="text-xs text-gray-600 mb-2 text-center">
                           {tableHover.rows > 0 ? `${tableHover.rows} × ${tableHover.cols}` : 'Select table size'}
                        </div>
                        <div className="grid gap-0.5" style={{ gridTemplateColumns: `repeat(${TABLE_GRID_COLS}, 1fr)` }}>
                           {Array.from({ length: TABLE_GRID_ROWS * TABLE_GRID_COLS }).map((_, index) => {
                              const row = Math.floor(index / TABLE_GRID_COLS) + 1;
                              const col = (index % TABLE_GRID_COLS) + 1;
                              const isHighlighted = row <= tableHover.rows && col <= tableHover.cols;
                              return (
                                 <div
                                    key={index}
                                    className={`w-4 h-4 border cursor-pointer transition-colors ${isHighlighted ? 'bg-blue-500 border-blue-600' : 'bg-white border-gray-300 hover:border-gray-400'
                                       }`}
                                    onMouseEnter={() => setTableHover({ rows: row, cols: col })}
                                    onMouseLeave={() => setTableHover({ rows: 0, cols: 0 })}
                                    onClick={() => {
                                       restoreSelection();
                                       insertTable(row, col);
                                    }}
                                 />
                              );
                           })}
                        </div>
                     </div>
                  )}
               </div>

               {/* Row and col controls */}
               <div className="flex items-center gap-1 bg-blue-50 rounded px-2 py-1">

                  {/* Row controls */}
                  <div className="flex items-center gap-0.5 border-r border-blue-200 pr-2 mr-1" title="Row">
                     <span title="Row"> <Rows2Icon size={16} /></span>

                     <button
                        onMouseDown={(e) => {
                           e.preventDefault();
                           onAddTableRow?.('below');
                        }}
                        className="p-1 hover:bg-blue-100 rounded text-blue-600"
                        title="Add Row"
                     >
                        <Plus size={14} />
                     </button>
                     <button
                        onMouseDown={(e) => {
                           e.preventDefault();
                           onDeleteTableRow?.();
                        }}
                        className="p-1 hover:bg-red-100 rounded text-red-500"
                        title="Delete Row"
                     >
                        <Minus size={14} />
                     </button>
                  </div>

                  {/* Column controls */}
                  <div className="flex items-center gap-0.5 border-r border-blue-200 pr-2 mr-1" title="Column">
                     <span title="Column"> <Columns2Icon size={16} /></span>
                     <button
                        onMouseDown={(e) => {
                           e.preventDefault();
                           onAddTableColumn?.('right');
                        }}
                        className="p-1 hover:bg-blue-100 rounded text-blue-600"
                        title="Add Column"
                     >
                        <Plus size={14} />
                     </button>
                     <button
                        onMouseDown={(e) => {
                           e.preventDefault();
                           onDeleteTableColumn?.();
                        }}
                        className="p-1 hover:bg-red-100 rounded text-red-500"
                        title="Delete Column"
                     >
                        <Minus size={14} />
                     </button>
                  </div>

                  {/* Delete table */}
                  <button
                     onMouseDown={(e) => {
                        e.preventDefault();
                        onDeleteTable?.();
                     }}
                     className="p-1 hover:bg-red-100 rounded text-red-500"
                     title="Delete Table"
                  >
                     <Trash2 size={14} />
                  </button>
               </div>
            </>
         )}

         <div className="w-px h-6 bg-gray-300 mx-1" />

         {/* Alignment */}
         <button
            onMouseDown={(e) => {
               handleMouseDown(e, 'justifyLeft');
               setTextAlign('left');
               onUpdateStyle?.('textAlign', 'left');
            }}
            className={`p-2 hover:bg-gray-100 rounded ${textAlign === 'left' ? 'bg-gray-200' : ''}`}
            title="Align Left"
         >
            <AlignLeft size={16} />
         </button>
         <button
            onMouseDown={(e) => {
               handleMouseDown(e, 'justifyCenter');
               setTextAlign('center');
               onUpdateStyle?.('textAlign', 'center');
            }}
            className={`p-2 hover:bg-gray-100 rounded ${textAlign === 'center' ? 'bg-gray-200' : ''}`}
            title="Align Center"
         >
            <AlignCenter size={16} />
         </button>
         <button
            onMouseDown={(e) => {
               handleMouseDown(e, 'justifyRight');
               setTextAlign('right');
               onUpdateStyle?.('textAlign', 'right');
            }}
            className={`p-2 hover:bg-gray-100 rounded ${textAlign === 'right' ? 'bg-gray-200' : ''}`}
            title="Align Right"
         >
            <AlignRight size={16} />
         </button>
         <button
            onMouseDown={(e) => {
               handleMouseDown(e, 'justifyFull');
               setTextAlign('justify');
               onUpdateStyle?.('textAlign', 'justify');
            }}
            className={`p-2 hover:bg-gray-100 rounded ${textAlign === 'justify' ? 'bg-gray-200' : ''}`}
            title="Justify"
         >
            <AlignJustify size={16} />
         </button>

         <div className="w-px h-6 bg-gray-300 mx-1" />

         {/* Indent */}
         <button onMouseDown={(e) => handleMouseDown(e, 'outdent')} className="p-2 hover:bg-gray-100 rounded" title="Decrease Indent">
            <Outdent size={16} />
         </button>
         <button onMouseDown={(e) => handleMouseDown(e, 'indent')} className="p-2 hover:bg-gray-100 rounded" title="Increase Indent">
            <Indent size={16} />
         </button>

         <div className="w-px h-6 bg-gray-300 mx-1" />

         {/* Font Color */}
         <div className="relative">
            <button
               onMouseDown={(e) => {
                  e.preventDefault();
                  saveSelection();
                  colorInputRef.current?.click();
               }}
               className="p-2 hover:bg-gray-100 rounded flex items-center gap-1"
               title="Font Color"
            >
               <span className="text-sm font-bold" style={{ color: fontColor }}>A</span>
               <div className="w-4 h-1 rounded" style={{ backgroundColor: fontColor }} />
            </button>
            <input
               ref={colorInputRef}
               type="color"
               defaultValue={fontColor}
               key={fontColor}
               onChange={(e) => {
                  restoreSelection();
                  onFormat('foreColor', e.target.value);
                  onUpdateStyle?.('color', e.target.value, true);
               }}
               onBlur={(e) => {
                  setFontColor(e.target.value);
                  onCommitChanges?.();
               }}
               className="absolute opacity-0 w-0 h-0"
            />
         </div>

         <div className="w-px h-6 bg-gray-300 mx-1" />

         <select
            value={fontSize}
            onMouseDown={saveSelection}
            onChange={(e) => {
               restoreSelection();
               setFontSize(e.target.value);
               onFormat('fontSize', e.target.value);
               onUpdateStyle?.('fontSize', e.target.value);
            }}
            className="px-2 py-1 border rounded text-sm"
         >
            {RICH_TOOLBAR_FONT_SIZES.map(size => (
               <option key={size} value={size}>{size}</option>
            ))}
         </select>

         <select
            value={fontFamily}
            onMouseDown={saveSelection}
            onChange={(e) => {
               restoreSelection();
               setFontFamily(e.target.value);
               onFormat('fontName', e.target.value);
               onUpdateStyle?.('fontFamily', e.target.value);
            }}
            className="px-2 py-1 border rounded text-sm"
         >
            {RICH_TOOLBAR_FONT_FAMILIES.map(font => (
               <option key={font} value={font}>{font}</option>
            ))}
         </select>
      </div>
   );
};