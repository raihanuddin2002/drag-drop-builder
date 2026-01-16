import {
   AlignCenter,
   AlignJustify,
   AlignLeft,
   AlignRight,
   Bold,
   Indent,
   Italic,
   Link,
   List,
   ListOrdered,
   Outdent,
   Strikethrough,
   Subscript,
   Superscript,
   Underline
} from "lucide-react";
import { useRef, useEffect, useState } from "react";
import { RICH_TOOLBAR_FONT_FAMILIES, RICH_TOOLBAR_FONT_SIZES } from "../data";
import { ElementInfo } from "../type";

export type RichTextToolbarProps = {
   onFormat: (command: string, value?: string) => void;
   onUpdateStyle?: (prop: string, value: string, livePreview?: boolean) => void;
   onCommitChanges?: () => void;
   elementInfo?: ElementInfo | null;
}

export default function RichTextToolbar({ onFormat, onUpdateStyle, onCommitChanges, elementInfo }: RichTextToolbarProps) {
   const [fontSize, setFontSize] = useState('16px');
   const [fontFamily, setFontFamily] = useState('Arial');
   const [fontColor, setFontColor] = useState('#000000');
   const [textAlign, setTextAlign] = useState('left');
   const savedSelectionRef = useRef<Range | null>(null);
   const colorInputRef = useRef<HTMLInputElement>(null);

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
            onClick={() => {
               const url = prompt('Enter URL:');
               if (url) onFormat('createLink', url);
            }}
            className="p-2 hover:bg-gray-100 rounded"
            title="Insert Link"
         >
            <Link size={16} />
         </button>

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