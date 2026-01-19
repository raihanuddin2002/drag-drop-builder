import { Copy, FileText, Plus, Trash2, Type } from "lucide-react";
import { EditorPage } from "./type";
import { useState } from "react";

export type PagePanelProps = {
   pages: EditorPage[];
   currentIndex: number;
   onSelectPage: (index: number) => void;
   onAddPage: () => void;
   onDuplicatePage: (index: number) => void;
   onDeletePage: (index: number) => void;
   onRenamePage: (index: number, name: string) => void;
}

export const PagePanel: React.FC<PagePanelProps> = ({
   pages,
   currentIndex,
   onSelectPage,
   onAddPage,
   onDuplicatePage,
   onDeletePage,
   onRenamePage,
}) => {
   const [contextMenu, setContextMenu] = useState<{ index: number; x: number; y: number } | null>(null);
   const [editingIndex, setEditingIndex] = useState<number | null>(null);
   const [editName, setEditName] = useState('');

   const handleContextMenu = (e: React.MouseEvent, index: number) => {
      e.preventDefault();
      setContextMenu({ index, x: e.clientX, y: e.clientY });
   };

   const handleRename = (index: number) => {
      setEditingIndex(index);
      setEditName(pages[index].name);
      setContextMenu(null);
   };

   const submitRename = () => {
      if (editingIndex !== null && editName.trim()) {
         onRenamePage(editingIndex, editName.trim());
      }
      setEditingIndex(null);
      setEditName('');
   };

   return (
      <div className="bg-gray-800 border-t border-gray-700 p-3">
         <div className="flex items-center gap-3 overflow-x-auto pb-1">
            {pages.map((page, index) => (
               <div
                  key={page.id}
                  onClick={() => onSelectPage(index)}
                  onContextMenu={(e) => handleContextMenu(e, index)}
                  className={`shrink-0 cursor-pointer group relative ${currentIndex === index ? 'ring-2 ring-green-500' : ''
                     }`}
               >
                  {/* Page Thumbnail */}
                  <div
                     className="bg-white rounded shadow-md overflow-hidden"
                     style={{
                        width: 80,
                        height: 60,
                     }}
                  >
                     <div
                        className="w-full h-full flex items-center justify-center text-gray-400"
                        style={{
                           transform: `scale(${Math.min(80 / page.width.value, 60 / page.height.value)})`,
                           transformOrigin: 'center center',
                        }}
                     >
                        <FileText size={24} />
                     </div>
                  </div>

                  {/* Page Name */}
                  <div className="mt-1 text-center">
                     {editingIndex === index ? (
                        <input
                           type="text"
                           value={editName}
                           onChange={(e) => setEditName(e.target.value)}
                           onBlur={submitRename}
                           onKeyDown={(e) => e.key === 'Enter' && submitRename()}
                           className="w-20 px-1 py-0.5 text-xs bg-gray-700 text-white border border-gray-600 rounded text-center"
                           autoFocus
                        />
                     ) : (
                        <span className="text-xs text-gray-400 truncate block w-20">
                           {page.name}
                        </span>
                     )}
                  </div>

                  {/* Page Number Badge */}
                  <div className="absolute -top-1 -left-1 w-5 h-5 bg-gray-700 rounded-full flex items-center justify-center text-xs text-white">
                     {index + 1}
                  </div>
               </div>
            ))}

            {/* Add Page Button */}
            <button
               onClick={onAddPage}
               className="shrink-0 w-20 h-[60px] border border-dashed border-gray-600 rounded flex items-center justify-center text-gray-500 hover:border-green-500 hover:text-green-500 transition-colors"
            >
               <Plus size={24} />
            </button>
         </div>

         {/* Context Menu */}
         {contextMenu && (
            <>
               <div
                  className="fixed inset-0 z-40"
                  onClick={() => setContextMenu(null)}
               />
               <div
                  className="fixed z-50 bg-gray-700 rounded shadow-lg py-1 min-w-[120px]"
                  style={{ left: contextMenu.x, top: contextMenu.y }}
               >
                  <button
                     onClick={() => {
                        onDuplicatePage(contextMenu.index);
                        setContextMenu(null);
                     }}
                     className="w-full px-3 py-2 text-left text-sm text-white hover:bg-gray-600 flex items-center gap-2"
                  >
                     <Copy size={14} />
                     Duplicate
                  </button>
                  <button
                     onClick={() => handleRename(contextMenu.index)}
                     className="w-full px-3 py-2 text-left text-sm text-white hover:bg-gray-600 flex items-center gap-2"
                  >
                     <Type size={14} />
                     Rename
                  </button>
                  {pages.length > 1 && (
                     <button
                        onClick={() => {
                           onDeletePage(contextMenu.index);
                           setContextMenu(null);
                        }}
                        className="w-full px-3 py-2 text-left text-sm text-red-400 hover:bg-gray-600 flex items-center gap-2"
                     >
                        <Trash2 size={14} />
                        Delete
                     </button>
                  )}
               </div>
            </>
         )}
      </div>
   );
};