import { useEffect, useState } from "react";
import { PAGE_PRESETS } from "./data";
import { Height, EditorPage, PagePreset, Width } from "./type";
import { ArrowLeftRight, ChevronDown, FileText } from "lucide-react";

export type PageSizeSettingsProps = {
   currentPage: EditorPage;
   onChangeSize: ({ width, height }: { width: Width; height: Height }) => void;
}

export const defaultPagePreset = PAGE_PRESETS.find(p => p.default) || PAGE_PRESETS[0];

export const PageSizeSettings: React.FC<PageSizeSettingsProps> = ({
   currentPage,
   onChangeSize,
}) => {
   const [isOpen, setIsOpen] = useState(false);
   const [customWidth, setCustomWidth] = useState<Width>(defaultPagePreset?.width);
   const [customHeight, setCustomHeight] = useState<Height>(defaultPagePreset?.height);

   // Update local state when current page changes
   useEffect(() => {
      setCustomWidth({ value: currentPage.width.value, unit: currentPage.width.unit });
      setCustomHeight({ value: currentPage.height.value, unit: currentPage.height.unit });
   }, [currentPage.width.value, currentPage.height.value]);

   const getCurrentPresetName = () => {
      const preset = PAGE_PRESETS.find(
         p => p.width.value === currentPage.width?.value && p.height?.value === currentPage.height?.value
      );
      return preset?.name ?? 'Custom';
   };

   const handlePresetSelect = (preset: PagePreset) => {
      onChangeSize({
         width: { value: preset.width.value, unit: preset.width.unit },
         height: { value: preset.height.value, unit: preset.height.unit }
      });
      setCustomWidth({ value: preset.width?.value, unit: preset.width.unit });
      setCustomHeight({ value: preset.height.value, unit: preset.height.unit });
      if (preset.name !== 'Custom') {
         setIsOpen(false);
      }
   };

   const handleCustomSizeApply = () => {
      const w = customWidth.value || 800;
      const h = customHeight.value || 600;

      onChangeSize({
         width: { value: w, unit: customWidth.unit },
         height: { value: h, unit: customHeight.unit }
      });
   };

   const handleSwapDimensions = () => {
      onChangeSize({
         width: { value: currentPage.height.value, unit: currentPage.height.unit },
         height: { value: currentPage.width.value, unit: currentPage.width.unit }
      });
      setCustomWidth({ value: currentPage.height.value, unit: currentPage.height.unit });
      setCustomHeight({ value: currentPage.width.value, unit: currentPage.width.unit });
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
               {currentPage.width.value} x {currentPage.height.value}
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
                     {PAGE_PRESETS
                        .filter(p => p.name !== 'Custom' && p.show)
                        .map((preset) => (
                           <button
                              key={preset.name}
                              onClick={() => handlePresetSelect(preset)}
                              className={`w-full px-2 py-2 text-left text-sm rounded hover:bg-gray-100 flex items-center justify-between ${currentPage.width.value === preset.width.value && currentPage.height.value === preset.height.value
                                 ? 'bg-green-50 text-green-700'
                                 : 'text-gray-700'
                                 }`}
                           >
                              <span>{preset.name}</span>
                              <span className="text-xs text-gray-400">
                                 {preset.width.value}{preset.width.unit} x {preset.height.value}{preset.height.unit}
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
                              value={customWidth.value}
                              onChange={(e) => setCustomWidth({ value: parseInt(e.target.value || "0"), unit: "px" })}
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
                              value={customHeight.value}
                              onChange={(e) => setCustomHeight({ value: parseInt(e.target.value || "0"), unit: "px" })}
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