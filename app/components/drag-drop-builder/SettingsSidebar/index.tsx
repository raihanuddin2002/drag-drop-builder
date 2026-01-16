import { ChevronRight, Copy, Trash2 } from "lucide-react";
import { ElementInfo } from "../type";
import { useState, useMemo } from "react";
import { StyleInput } from "./StyleInput";

// Helper functions for color conversion
const rgbToHex = (rgb: string): string => {
   const match = rgb.match(/^rgba?\((\d+),\s*(\d+),\s*(\d+)/);
   if (!match) return '#000000';
   const r = parseInt(match[1]).toString(16).padStart(2, '0');
   const g = parseInt(match[2]).toString(16).padStart(2, '0');
   const b = parseInt(match[3]).toString(16).padStart(2, '0');
   return `#${r}${g}${b}`;
};

const getOpacityFromColor = (color: string): number => {
   const match = color.match(/^rgba?\(\d+,\s*\d+,\s*\d+,?\s*([\d.]+)?\)/);
   if (match && match[1] !== undefined) {
      return parseFloat(match[1]);
   }
   return 1;
};

const hexToRgba = (hex: string, opacity: number): string => {
   const r = parseInt(hex.slice(1, 3), 16);
   const g = parseInt(hex.slice(3, 5), 16);
   const b = parseInt(hex.slice(5, 7), 16);
   if (opacity === 1) {
      return hex;
   }
   return `rgba(${r}, ${g}, ${b}, ${opacity})`;
};

const parseColorToHex = (color: string): string => {
   if (!color) return '#000000';
   if (color.startsWith('#')) return color.slice(0, 7);
   if (color.startsWith('rgb')) return rgbToHex(color);
   return '#000000';
};

interface SettingsPanelProps {
   elementInfo: ElementInfo | null;
   elementKey: string; // Changes when different element is selected
   onUpdateContent: (value: string, isHtml?: boolean) => void;
   onUpdateStyle: (prop: string, value: string, livePreview?: boolean) => void;
   onUpdateAttribute: (attr: string, value: string) => void;
   onUpdateCustomCss: (css: string) => void;
   onCommitChanges: () => void; // Save history and sync HTML after live preview
   onDelete: () => void;
   onDuplicate: () => void;
   onClose: () => void;
}

export const SettingsPanel: React.FC<SettingsPanelProps> = ({
   elementInfo,
   elementKey,
   onUpdateContent,
   onUpdateStyle,
   onUpdateAttribute,
   onUpdateCustomCss,
   onCommitChanges,
   onDelete,
   onDuplicate,
   onClose,
}) => {
   const [activeTab, setActiveTab] = useState<'content' | 'style' | 'advanced'>('style');

   // Parse current color values
   const colorHex = useMemo(() => parseColorToHex(elementInfo?.styles.color || ''), [elementInfo?.styles.color]);
   const colorOpacity = useMemo(() => getOpacityFromColor(elementInfo?.styles.color || ''), [elementInfo?.styles.color]);
   const bgHex = useMemo(() => parseColorToHex(elementInfo?.styles.background || elementInfo?.styles.backgroundColor || ''), [elementInfo?.styles.background, elementInfo?.styles.backgroundColor]);
   const bgOpacity = useMemo(() => getOpacityFromColor(elementInfo?.styles.background || elementInfo?.styles.backgroundColor || ''), [elementInfo?.styles.background, elementInfo?.styles.backgroundColor]);

   if (!elementInfo) return null;

   const showContentEditor = elementInfo.isHtmlBlock || elementInfo.tag === 'img';

   return (
      <div className="flex flex-col h-full">
         <div className="p-4 border-b bg-gray-50 flex items-center justify-between">
            <div className="flex items-center gap-2">
               <button onClick={onClose} className="text-gray-500 hover:text-gray-700">
                  <ChevronRight size={18} />
               </button>
               <span className="font-medium capitalize">{elementInfo.isHtmlBlock ? 'HTML Block' : elementInfo.tag.toUpperCase()}</span>
            </div>
         </div>

         <div className="flex border-b">
            <button
               onClick={() => setActiveTab('content')}
               className={`flex-1 py-2 text-sm ${activeTab === 'content' ? 'border-b-2 border-green-500 text-green-600' : 'text-gray-500'}`}
            >
               Content
            </button>
            <button
               onClick={() => setActiveTab('style')}
               className={`flex-1 py-2 text-sm ${activeTab === 'style' ? 'border-b-2 border-green-500 text-green-600' : 'text-gray-500'}`}
            >
               Style
            </button>
            <button
               onClick={() => setActiveTab('advanced')}
               className={`flex-1 py-2 text-sm ${activeTab === 'advanced' ? 'border-b-2 border-green-500 text-green-600' : 'text-gray-500'}`}
            >
               Advanced
            </button>
         </div>

         <div className="flex-1 overflow-y-auto p-4">
            {activeTab === 'content' && (
               <div className="space-y-4">
                  {/* HTML Block - show content editor in sidebar */}
                  {elementInfo.isHtmlBlock && (
                     <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">HTML Content</label>
                        <textarea
                           value={elementInfo.innerHTML || ''}
                           onChange={(e) => onUpdateContent(e.target.value, true)}
                           className="w-full px-3 py-2 border rounded-md text-sm font-mono"
                           rows={8}
                           placeholder="Enter HTML content..."
                        />
                     </div>
                  )}

                  {/* Image settings */}
                  {elementInfo.tag === 'img' && (
                     <>
                        <div>
                           <label className="block text-sm font-medium text-gray-700 mb-1">Image URL</label>
                           <input
                              type="text"
                              value={elementInfo.src || ''}
                              onChange={(e) => onUpdateAttribute('src', e.target.value)}
                              className="w-full px-3 py-2 border rounded-md text-sm"
                           />
                        </div>
                        <div>
                           <label className="block text-sm font-medium text-gray-700 mb-1">Alt Text</label>
                           <input
                              type="text"
                              value={elementInfo.alt || ''}
                              onChange={(e) => onUpdateAttribute('alt', e.target.value)}
                              className="w-full px-3 py-2 border rounded-md text-sm"
                           />
                        </div>
                     </>
                  )}

                  {/* Link URL for buttons */}
                  {elementInfo.tag === 'a' && (
                     <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Link URL</label>
                        <input
                           type="text"
                           value={elementInfo.href || ''}
                           onChange={(e) => onUpdateAttribute('href', e.target.value)}
                           className="w-full px-3 py-2 border rounded-md text-sm"
                        />
                     </div>
                  )}

                  {/* Info for inline editable elements */}
                  {!showContentEditor && elementInfo.tag !== 'hr' && (
                     <div className="text-sm text-gray-500 bg-gray-50 p-3 rounded">
                        Click on the element in the canvas to edit text directly. Use the toolbar above for formatting.
                     </div>
                  )}
               </div>
            )}

            {activeTab === 'style' && (
               <div className="space-y-4">
                  <div>
                     <label className="block text-xs text-gray-600 mb-1">Width</label>
                     <StyleInput
                        value={elementInfo.styles.width || ''}
                        onChange={(v) => onUpdateStyle('width', v)}
                        placeholder="auto, 100%, 300px"
                        className="w-full px-2 py-1.5 border rounded text-sm"
                     />
                  </div>

                  <div>
                     <label className="block text-xs text-gray-600 mb-1">Height</label>
                     <StyleInput
                        value={elementInfo.styles.height || ''}
                        onChange={(v) => onUpdateStyle('height', v)}
                        placeholder="auto, 100px"
                        className="w-full px-2 py-1.5 border rounded text-sm"
                     />
                  </div>

                  <div>
                     <label className="block text-xs text-gray-600 mb-1">Color</label>
                     <div className="flex gap-2 items-center">
                        <input
                           type="color"
                           defaultValue={colorHex}
                           key={`${elementKey}-color`}
                           onChange={(e) => onUpdateStyle('color', hexToRgba(e.target.value, colorOpacity), true)}
                           onBlur={() => onCommitChanges()}
                           className="w-10 h-8 border rounded cursor-pointer"
                        />
                        <StyleInput
                           value={colorHex}
                           onBlur={(v) => onUpdateStyle('color', hexToRgba(v.startsWith('#') ? v : `#${v}`, colorOpacity))}
                           placeholder="#000000"
                           className="flex-1 px-2 py-1.5 border rounded text-sm font-mono"
                        />
                     </div>
                     <div className="flex gap-2 items-center mt-2">
                        <label className="text-xs text-gray-500 w-14">Opacity</label>
                        <input
                           type="range"
                           min="0"
                           max="1"
                           step="0.01"
                           value={colorOpacity}
                           onChange={(e) => onUpdateStyle('color', hexToRgba(colorHex, parseFloat(e.target.value)))}
                           className="flex-1 h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
                        />
                        <span className="text-xs text-gray-600 w-10 text-right">{Math.round(colorOpacity * 100)}%</span>
                     </div>
                  </div>

                  <div>
                     <label className="block text-xs text-gray-600 mb-1">Background</label>
                     <div className="flex gap-2 items-center">
                        <input
                           type="color"
                           defaultValue={bgHex}
                           key={`${elementKey}-bg`}
                           onChange={(e) => onUpdateStyle('background', hexToRgba(e.target.value, bgOpacity), true)}
                           onBlur={() => onCommitChanges()}
                           className="w-10 h-8 border rounded cursor-pointer"
                        />
                        <StyleInput
                           value={bgHex}
                           onBlur={(v) => onUpdateStyle('background', hexToRgba(v.startsWith('#') ? v : `#${v}`, bgOpacity))}
                           placeholder="#ffffff"
                           className="flex-1 px-2 py-1.5 border rounded text-sm font-mono"
                        />
                     </div>
                     <div className="flex gap-2 items-center mt-2">
                        <label className="text-xs text-gray-500 w-14">Opacity</label>
                        <input
                           type="range"
                           min="0"
                           max="1"
                           step="0.01"
                           value={bgOpacity}
                           onChange={(e) => onUpdateStyle('background', hexToRgba(bgHex, parseFloat(e.target.value)))}
                           className="flex-1 h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
                        />
                        <span className="text-xs text-gray-600 w-10 text-right">{Math.round(bgOpacity * 100)}%</span>
                     </div>
                  </div>

                  <div>
                     <label className="block text-xs text-gray-600 mb-1">Font Size</label>
                     <StyleInput
                        value={elementInfo.styles['font-size'] || elementInfo.styles.fontSize || ''}
                        onChange={(v) => onUpdateStyle('fontSize', v)}
                        placeholder="16px, 1.5rem"
                        className="w-full px-2 py-1.5 border rounded text-sm"
                     />
                  </div>

                  <div>
                     <label className="block text-xs text-gray-600 mb-1">Font Family</label>
                     <select
                        value={(elementInfo.styles['font-family'] || elementInfo.styles.fontFamily || 'Arial').replace(/['"]/g, '').split(',')[0].trim()}
                        onChange={(e) => onUpdateStyle('fontFamily', e.target.value)}
                        className="w-full px-2 py-1.5 border rounded text-sm"
                     >
                        <option value="Arial">Arial</option>
                        <option value="Helvetica">Helvetica</option>
                        <option value="Times New Roman">Times New Roman</option>
                        <option value="Georgia">Georgia</option>
                        <option value="Verdana">Verdana</option>
                        <option value="Courier New">Courier New</option>
                        <option value="Trebuchet MS">Trebuchet MS</option>
                        <option value="Impact">Impact</option>
                     </select>
                  </div>

                  <div>
                     <label className="block text-xs text-gray-600 mb-1">Font Weight</label>
                     <select
                        value={elementInfo.styles['font-weight'] || elementInfo.styles.fontWeight || 'normal'}
                        onChange={(e) => onUpdateStyle('fontWeight', e.target.value)}
                        className="w-full px-2 py-1.5 border rounded text-sm"
                     >
                        <option value="normal">Normal</option>
                        <option value="bold">Bold</option>
                        <option value="100">100</option>
                        <option value="300">300</option>
                        <option value="500">500</option>
                        <option value="700">700</option>
                        <option value="900">900</option>
                     </select>
                  </div>

                  <div>
                     <label className="block text-xs text-gray-600 mb-1">Text Align</label>
                     <div className="flex gap-1">
                        {(['left', 'center', 'right', 'justify'] as const).map(align => (
                           <button
                              key={align}
                              onClick={() => onUpdateStyle('textAlign', align)}
                              className={`flex-1 px-2 py-1.5 border rounded text-xs ${(elementInfo.styles['text-align'] || elementInfo.styles.textAlign) === align ? 'bg-green-500 text-white' : 'bg-white'}`}
                           >
                              {align[0].toUpperCase()}
                           </button>
                        ))}
                     </div>
                  </div>

                  <div>
                     <label className="block text-xs text-gray-600 mb-1">Line Height</label>
                     <StyleInput
                        value={elementInfo.styles['line-height'] || elementInfo.styles.lineHeight || ''}
                        onChange={(v) => onUpdateStyle('lineHeight', v)}
                        placeholder="1.5, 24px"
                        className="w-full px-2 py-1.5 border rounded text-sm"
                     />
                  </div>

                  <div>
                     <label className="block text-xs text-gray-600 mb-1">Padding</label>
                     <StyleInput
                        value={elementInfo.styles.padding || ''}
                        onChange={(v) => onUpdateStyle('padding', v)}
                        placeholder="10px, 10px 20px"
                        className="w-full px-2 py-1.5 border rounded text-sm"
                     />
                  </div>

                  <div>
                     <label className="block text-xs text-gray-600 mb-1">Margin</label>
                     <StyleInput
                        value={elementInfo.styles.margin || ''}
                        onChange={(v) => onUpdateStyle('margin', v)}
                        placeholder="10px, 10px 20px"
                        className="w-full px-2 py-1.5 border rounded text-sm"
                     />
                  </div>

                  {/* 
 <SpacingEditor
                     marginTop={elementInfo.styles['margin-top'] || elementInfo.styles.marginTop || ''}
                     marginRight={elementInfo.styles['margin-right'] || elementInfo.styles.marginRight || ''}
                     marginBottom={elementInfo.styles['margin-bottom'] || elementInfo.styles.marginBottom || ''}
                     marginLeft={elementInfo.styles['margin-left'] || elementInfo.styles.marginLeft || ''}
                     paddingTop={elementInfo.styles['padding-top'] || elementInfo.styles.paddingTop || ''}
                     paddingRight={elementInfo.styles['padding-right'] || elementInfo.styles.paddingRight || ''}
                     paddingBottom={elementInfo.styles['padding-bottom'] || elementInfo.styles.paddingBottom || ''}
                     paddingLeft={elementInfo.styles['padding-left'] || elementInfo.styles.paddingLeft || ''}
                     onUpdateStyle={onUpdateStyle}
                  />
*/}
                  <div>
                     <label className="block text-xs text-gray-600 mb-1">Border</label>
                     <StyleInput
                        value={elementInfo.styles.border || ''}
                        onChange={(v) => onUpdateStyle('border', v)}
                        placeholder="1px solid #ccc"
                        className="w-full px-2 py-1.5 border rounded text-sm"
                     />
                  </div>

                  <div>
                     <label className="block text-xs text-gray-600 mb-1">Border Radius</label>
                     <StyleInput
                        value={elementInfo.styles['border-radius'] || elementInfo.styles.borderRadius || ''}
                        onChange={(v) => onUpdateStyle('borderRadius', v)}
                        placeholder="0px, 5px"
                        className="w-full px-2 py-1.5 border rounded text-sm"
                     />
                  </div>
               </div>
            )}

            {activeTab === 'advanced' && (
               <div className="space-y-4">
                  <div>
                     <label className="block text-sm font-medium text-gray-700 mb-2">CSS Class</label>
                     <input
                        type="text"
                        onChange={(e) => onUpdateAttribute('class', e.target.value)}
                        placeholder="my-custom-class"
                        className="w-full px-2 py-1 border rounded text-sm"
                     />
                  </div>

                  <div>
                     <label className="block text-sm font-medium text-gray-700 mb-2">CSS ID</label>
                     <input
                        type="text"
                        onChange={(e) => onUpdateAttribute('id', e.target.value)}
                        placeholder="my-element-id"
                        className="w-full px-2 py-1 border rounded text-sm"
                     />
                  </div>

                  <div>
                     <label className="block text-sm font-medium text-gray-700 mb-2">Custom CSS</label>
                     <textarea
                        value={elementInfo.customCss || ''}
                        onChange={(e) => onUpdateCustomCss(e.target.value)}
                        placeholder="color: red; font-size: 20px;"
                        className="w-full px-2 py-1 border rounded text-sm font-mono"
                        rows={4}
                     />
                     <p className="text-xs text-gray-500 mt-1">Add inline CSS styles directly</p>
                  </div>
               </div>
            )}
         </div>

         <div className="p-4 border-t space-y-2">
            <button
               onClick={onDuplicate}
               className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200"
            >
               <Copy size={16} />
               Duplicate Element
            </button>
            <button
               onClick={onDelete}
               className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-red-500 text-white rounded-md hover:bg-red-600"
            >
               <Trash2 size={16} />
               Delete Element
            </button>
         </div>
      </div>
   );
};