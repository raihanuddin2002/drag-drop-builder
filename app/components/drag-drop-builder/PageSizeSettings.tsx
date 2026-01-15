import { useEffect, useState } from "react";
import { PAGE_PRESETS } from "./data";
import { Page, PagePreset } from "./type";
import { ArrowLeftRight, ChevronDown, FileText } from "lucide-react";

export type PageSizeSettingsProps = {
   currentPage: Page;
   onChangeSize: (width: number, height: number) => void;
}

export const PageSizeSettings: React.FC<PageSizeSettingsProps> = ({
   currentPage,
   onChangeSize,
}) => {
   const [isOpen, setIsOpen] = useState(false);
   const [customWidth, setCustomWidth] = useState(currentPage.width.toString());
   const [customHeight, setCustomHeight] = useState(currentPage.height.toString());

   // Update local state when current page changes
   useEffect(() => {
      setCustomWidth(currentPage.width.toString());
      setCustomHeight(currentPage.height.toString());
   }, [currentPage.width, currentPage.height]);

   const getCurrentPresetName = () => {
      const preset = PAGE_PRESETS.find(
         p => p.width === currentPage.width && p.height === currentPage.height
      );
      return preset?.name ?? 'Custom';
   };

   const handlePresetSelect = (preset: PagePreset) => {
      onChangeSize(preset.width, preset.height);
      setCustomWidth(preset.width.toString());
      setCustomHeight(preset.height.toString());
      if (preset.name !== 'Custom') {
         setIsOpen(false);
      }
   };

   const handleCustomSizeApply = () => {
      const w = parseInt(customWidth) || 800;
      const h = parseInt(customHeight) || 600;
      onChangeSize(w, h);
   };

   const handleSwapDimensions = () => {
      onChangeSize(currentPage.height, currentPage.width);
      setCustomWidth(currentPage.height.toString());
      setCustomHeight(currentPage.width.toString());
   };

   return (
      <div className="relative">
         <button
            onClick={() => setIsOpen(!isOpen)}
            className="flex items-center gap-2 px-3 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded"
         >
            <FileText size={16} />
            <span>{getCurrentPresetName()}</span>
            <span className="text-xs text-gray-400">
               {currentPage.width} x {currentPage.height}
            </span>
            <ChevronDown size={14} />
         </button>

         {isOpen && (
            <>
               <div
                  className="fixed inset-0 z-40"
                  onClick={() => setIsOpen(false)}
               />
               <div className="absolute top-full left-0 mt-1 z-50 bg-white rounded-lg shadow-lg border w-72">
                  {/* Presets List */}
                  <div className="p-2 border-b max-h-60 overflow-y-auto">
                     <div className="text-xs font-medium text-gray-500 px-2 py-1">Page Size Presets</div>
                     {PAGE_PRESETS.filter(p => p.name !== 'Custom').map((preset) => (
                        <button
                           key={preset.name}
                           onClick={() => handlePresetSelect(preset)}
                           className={`w-full px-2 py-2 text-left text-sm rounded hover:bg-gray-100 flex items-center justify-between ${currentPage.width === preset.width && currentPage.height === preset.height
                              ? 'bg-green-50 text-green-700'
                              : 'text-gray-700'
                              }`}
                        >
                           <span>{preset.name}</span>
                           <span className="text-xs text-gray-400">
                              {preset.width} x {preset.height}
                           </span>
                        </button>
                     ))}
                  </div>

                  {/* Custom Size */}
                  <div className="p-3">
                     <div className="text-xs font-medium text-gray-500 mb-2">Custom Size</div>
                     <div className="flex items-center gap-2">
                        <div className="flex-1">
                           <label className="text-xs text-gray-500">Width</label>
                           <input
                              type="number"
                              value={customWidth}
                              onChange={(e) => setCustomWidth(e.target.value)}
                              className="w-full px-2 py-1 border rounded text-sm"
                              min="100"
                              max="5000"
                           />
                        </div>
                        <button
                           onClick={handleSwapDimensions}
                           className="mt-4 p-1 hover:bg-gray-100 rounded"
                           title="Swap dimensions"
                        >
                           <ArrowLeftRight size={16} className="text-gray-500" />
                        </button>
                        <div className="flex-1">
                           <label className="text-xs text-gray-500">Height</label>
                           <input
                              type="number"
                              value={customHeight}
                              onChange={(e) => setCustomHeight(e.target.value)}
                              className="w-full px-2 py-1 border rounded text-sm"
                              min="100"
                              max="5000"
                           />
                        </div>
                     </div>
                     <button
                        onClick={handleCustomSizeApply}
                        className="w-full mt-2 px-3 py-1.5 bg-green-500 text-white text-sm rounded hover:bg-green-600"
                     >
                        Apply Size
                     </button>
                  </div>
               </div>
            </>
         )}
      </div>
   );
};