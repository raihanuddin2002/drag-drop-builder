import { useState } from "react";
import { CONTAINER_LAYOUTS, WIDGETS } from "../data";
import { Component } from "../type";

export interface ElementsSidebarProps {
   onDragStart: (component: Component) => void;
   onDragEnd: () => void;
}

export const ElementsSidebar: React.FC<ElementsSidebarProps> = ({ onDragStart, onDragEnd }) => {
   const [activeTab, setActiveTab] = useState<'block' | 'container' | 'modules'>('block');

   return (
      <div className="flex flex-col h-full">
         <div className="flex border-b">
            <button
               onClick={() => setActiveTab('block')}
               className={`flex-1 py-3 text-sm font-medium ${activeTab === 'block' ? 'bg-green-500 text-white' : 'text-gray-600 hover:bg-gray-100'}`}
            >
               Block
            </button>
            <button
               onClick={() => setActiveTab('container')}
               className={`flex-1 py-3 text-sm font-medium ${activeTab === 'container' ? 'bg-green-500 text-white' : 'text-gray-600 hover:bg-gray-100'}`}
            >
               Container
            </button>
            <button
               onClick={() => setActiveTab('modules')}
               className={`flex-1 py-3 text-sm font-medium ${activeTab === 'modules' ? 'bg-green-500 text-white' : 'text-gray-600 hover:bg-gray-100'}`}
            >
               Modules
            </button>
         </div>

         <div className="flex-1 overflow-y-auto p-4">
            {activeTab === 'block' && (
               <div className="grid grid-cols-2 gap-3">
                  {WIDGETS.map((widget) => (
                     <div
                        key={widget.id}
                        draggable
                        onDragStart={() => onDragStart(widget)}
                        onDragEnd={onDragEnd}
                        className="flex flex-col items-center justify-center p-4 border rounded-lg cursor-move hover:border-green-400 hover:bg-green-50 transition"
                     >
                        <div className="text-gray-500 mb-2">{widget.icon}</div>
                        <span className="text-sm text-gray-600">{widget.label}</span>
                     </div>
                  ))}
               </div>
            )}

            {activeTab === 'container' && (
               <div className="space-y-3">
                  {CONTAINER_LAYOUTS.map((layout) => (
                     <div
                        key={layout.id}
                        draggable
                        onDragStart={() => onDragStart(layout)}
                        onDragEnd={onDragEnd}
                        className="border rounded-lg p-3 cursor-move hover:border-green-400"
                     >
                        <div className="text-sm text-gray-600 mb-2">{layout.label}</div>
                        <div className="flex gap-2">
                           {layout.id === '1col' && (
                              <div className="flex-1 h-10 border border-dashed border-green-300 rounded" />
                           )}
                           {layout.id === '2col' && (
                              <>
                                 <div className="flex-1 h-10 border border-dashed border-green-300 rounded" />
                                 <div className="flex-1 h-10 border border-dashed border-green-300 rounded" />
                              </>
                           )}
                           {layout.id === '3col' && (
                              <>
                                 <div className="flex-1 h-10 border border-dashed border-green-300 rounded" />
                                 <div className="flex-1 h-10 border border-dashed border-green-300 rounded" />
                                 <div className="flex-1 h-10 border border-dashed border-green-300 rounded" />
                              </>
                           )}
                           {layout.id === '4col' && (
                              <>
                                 <div className="flex-1 h-10 border border-dashed border-green-300 rounded" />
                                 <div className="flex-1 h-10 border border-dashed border-green-300 rounded" />
                                 <div className="flex-1 h-10 border border-dashed border-green-300 rounded" />
                                 <div className="flex-1 h-10 border border-dashed border-green-300 rounded" />
                              </>
                           )}
                           {layout.id === '1-2col' && (
                              <>
                                 <div className="w-1/3 h-10 border border-dashed border-green-300 rounded" />
                                 <div className="w-2/3 h-10 border border-dashed border-green-300 rounded" />
                              </>
                           )}
                           {layout.id === '2-1col' && (
                              <>
                                 <div className="w-2/3 h-10 border border-dashed border-green-300 rounded" />
                                 <div className="w-1/3 h-10 border border-dashed border-green-300 rounded" />
                              </>
                           )}
                        </div>
                     </div>
                  ))}
               </div>
            )}

            {activeTab === 'modules' && (
               <div className="text-center text-gray-500 py-8">
                  <p>Pre-built modules coming soon</p>
               </div>
            )}
         </div>
      </div>
   );
};