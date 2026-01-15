import {
   Bold,
   Italic,
   Link,
   List,
   ListOrdered,
   Strikethrough,
   Subscript,
   Superscript,
   Underline
} from "lucide-react";
import { useRef, useState } from "react";
import { RICH_TOOLBAR_FONT_FAMILIES, RICH_TOOLBAR_FONT_SIZES } from "../data";

export type RichTextToolbarProps = {
   onFormat: (command: string, value?: string) => void;
}

export default function RichTextToolbar({ onFormat }: RichTextToolbarProps) {
   const [fontSize, setFontSize] = useState('12px');
   const [fontFamily, setFontFamily] = useState('Arial');
   const savedSelectionRef = useRef<Range | null>(null);

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

         <select
            value={fontSize}
            onMouseDown={saveSelection}
            onChange={(e) => {
               restoreSelection();
               setFontSize(e.target.value);
               onFormat('fontSize', e.target.value);
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