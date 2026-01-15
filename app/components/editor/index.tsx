'use client';

import React, { useState, useRef, useEffect, useCallback, JSX } from 'react';
import {
   Trash2,
   Copy,
   Smartphone,
   Monitor,
   Tablet,
   Download,
   Upload,
   Undo2,
   Redo2,
   ChevronDown,
   ChevronUp,
   X,
   GripVertical,
   Bold,
   Italic,
   Underline,
   Strikethrough,
   List,
   ListOrdered,
   Link,
   Superscript,
   Subscript,
   Image,
   Type,
   Square,
   Minus,
   Video,
   Share2,
   Clock,
   Menu,
   Code,
   ChevronRight,
   Plus,
   FileText,
   MoreVertical,
   ArrowLeftRight,
} from 'lucide-react';

// ============================================
// TYPES
// ============================================

type Breakpoint = 'desktop' | 'tablet' | 'mobile';

interface ElementStyles {
   [key: string]: string;
}

interface ElementInfo {
   tag: string;
   styles: ElementStyles;
   content: string;
   innerHTML: string;
   src: string;
   href: string;
   alt: string;
   isHtmlBlock: boolean;
   customCss: string;
}

interface Component {
   id: string;
   label: string;
   icon: JSX.Element;
   html: string;
   category: 'blocks' | 'container';
}

interface Page {
   id: string;
   name: string;
   width: number;
   height: number;
   html: string;
}

interface PagePreset {
   name: string;
   width: number;
   height: number;
}

// ============================================
// PAGE PRESETS
// ============================================

const PAGE_PRESETS: PagePreset[] = [
   { name: 'Custom', width: 800, height: 600 },
   { name: 'Letter (8.5" x 11")', width: 816, height: 1056 },
   { name: 'Legal (8.5" x 14")', width: 816, height: 1344 },
   { name: 'A4', width: 794, height: 1123 },
   { name: 'Tabloid (11" x 17")', width: 1056, height: 1632 },
   { name: 'Instagram Post', width: 1080, height: 1080 },
   { name: 'Instagram Story', width: 1080, height: 1920 },
   { name: 'Facebook Cover', width: 820, height: 312 },
   { name: 'Presentation (16:9)', width: 1920, height: 1080 },
];

const generatePageId = (): string => `page-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

// ============================================
// INITIAL HTML
// ============================================

const INITIAL_PAGE_HTML =/* html */ `
<div
    class="page-container"
    data-container="true"
    style="width: 100%; height: 100%; padding: 20px; background: white; border: 2px dashed #cbd5e1; border-radius: 4px;"
>
</div>`;

const createDefaultPage = (name: string = 'Page 1', preset?: PagePreset): Page => ({
   id: generatePageId(),
   name,
   width: preset?.width ?? 800,
   height: preset?.height ?? 600,
   html: INITIAL_PAGE_HTML,
});

// Helper to wrap page content in full HTML document for export
const wrapPageInDocument = (page: Page, styles: string = ''): string => /* html */`<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<style>
* { box-sizing: border-box; }
body { margin: 0; padding: 0; font-family: system-ui, sans-serif; background: #f5f5f5; }
.page-container {
  width: ${page.width}px;
  min-height: ${page.height}px;
  margin: 0 auto;
  background: white;
}
${styles}
</style>
</head>
<body>
${page.html}
</body>
</html>`;

// ============================================
// WIDGET DEFINITIONS
// ============================================

const WIDGETS: Component[] = [
   { id: 'image', label: 'Image', icon: <Image size={20} />, category: 'blocks', html: '<img src="https://via.placeholder.com/600x300" alt="Placeholder" style="width: 100%; height: auto; display: block; margin: 15px 0;" />' },
   { id: 'text', label: 'Text', icon: <Type size={20} />, category: 'blocks', html: '<p style="color: #666; line-height: 1.6; margin: 0;">Add your text here.</p>' },
   { id: 'button', label: 'Button', icon: <Square size={20} />, category: 'blocks', html: '<a href="#" style="display: inline-block; padding: 12px 30px; background: #3b82f6; color: white; text-decoration: none; border-radius: 4px; margin: 10px 0;">Click Me</a>' },
   { id: 'spacer', label: 'Spacer', icon: <Minus size={20} />, category: 'blocks', html: '<div data-element-type="spacer" style="height: 40px;"></div>' },
   { id: 'heading', label: 'Heading', icon: <Type size={20} />, category: 'blocks', html: '<h2 style="color: #333; margin: 0;">New Heading</h2>' },
   { id: 'video', label: 'Video', icon: <Video size={20} />, category: 'blocks', html: '<div style="background: #f0f0f0; padding: 40px; text-align: center; margin: 15px 0; border-radius: 4px;">Video Placeholder - Add embed code</div>' },
   { id: 'social', label: 'Social', icon: <Share2 size={20} />, category: 'blocks', html: '<div style="text-align: center; padding: 15px; margin: 15px 0;">Social Icons Placeholder</div>' },
   { id: 'timer', label: 'Timer', icon: <Clock size={20} />, category: 'blocks', html: '<div style="text-align: center; padding: 20px; background: #f9fafb; margin: 15px 0; border-radius: 4px;">Timer Widget Placeholder</div>' },
   { id: 'menu', label: 'Menu', icon: <Menu size={20} />, category: 'blocks', html: '<div style="text-align: center; padding: 15px; margin: 15px 0;">Menu Widget Placeholder</div>' },
   { id: 'html', label: 'HTML', icon: <Code size={20} />, category: 'blocks', html: '<div data-html-block="true" style="padding: 15px; background: #f5f5f5; margin: 15px 0; font-family: monospace; border-radius: 4px;">Custom HTML Block</div>' },
   { id: 'divider', label: 'Divider', icon: <Minus size={20} />, category: 'blocks', html: '<hr style="border: none; border-top: 2px solid #e5e7eb; margin: 30px 0;" />' },
];

const CONTAINER_LAYOUTS: Component[] = [
   {
      id: '1col', label: '1 Column', icon: <Square size={20} />, category: 'container',
      html: '<div style="display: flex; gap: 15px; margin: 10px 0;" data-column-container="true"><div class="drop-zone" style="flex: 1; min-height: 100px;"></div></div>'
   },
   {
      id: '2col', label: '2 Columns', icon: <Square size={20} />, category: 'container',
      html: '<div style="display: flex; gap: 15px; margin: 10px 0;" data-column-container="true"><div class="drop-zone" style="flex: 1; min-height: 100px;"></div><div class="drop-zone" style="flex: 1; min-height: 100px;"></div></div>'
   },
   {
      id: '3col', label: '3 Columns', icon: <Square size={20} />, category: 'container',
      html: '<div style="display: flex; gap: 10px; margin:10px 0;" data-column-container="true"><div class="drop-zone" style="flex: 1; padding: 10px; min-height: 100px;"></div><div class="drop-zone" style="flex: 1; padding: 10px; min-height: 100px;"></div><div class="drop-zone" style="flex: 1; padding: 10px; min-height: 100px;"></div></div>'
   },
   {
      id: '4col', label: '4 Columns', icon: <Square size={20} />, category: 'container',
      html: '<div style="display: flex; gap: 10px; margin:10px 0;" data-column-container="true"><div class="drop-zone" style="flex: 1; padding: 10px; min-height: 100px;"></div><div class="drop-zone" style="flex: 1; padding: 10px; min-height: 100px;"></div><div class="drop-zone" style="flex: 1; padding: 10px; min-height: 100px;"></div><div class="drop-zone" style="flex: 1; padding: 10px; min-height: 100px;"></div></div>'
   },
   {
      id: '1-2col', label: '1:2 Ratio', icon: <Square size={20} />, category: 'container',
      html: '<div style="display: flex; gap: 15px; margin:10px 0;" data-column-container="true"><div class="drop-zone" style="flex: 1; min-height: 100px;"></div><div class="drop-zone" style="flex: 2; min-height: 100px;"></div></div>'
   },
   {
      id: '2-1col', label: '2:1 Ratio', icon: <Square size={20} />, category: 'container',
      html: '<div style="display: flex; gap: 15px; margin:10px 0;" data-column-container="true"><div class="drop-zone" style="flex: 2; min-height: 100px;"></div><div class="drop-zone" style="flex: 1; min-height: 100px;"></div></div>'
   },
];

// ============================================
// EDITOR STYLES (injected into shadow DOM)
// ============================================
const EDITOR_STYLES = (data: Record<string, any> | null = null) => {
   return  /* css */`
        /* Global box-sizing and overflow control */
        *, 
        *::before,
        *::after {
            box-sizing: border-box;
        }
        .shadow-root-container {
            width: 100%;
            height: ${data?.currentPageHeight}px;
            overflow: visible;
        }
        .page-container, [data-container="true"] {
            max-width: 100%;
            overflow: visible;
        }
        img {
            max-width: 100%;
            height: auto;
        }

        [data-xpath]:not([data-container="true"]):not(.drop-zone):not([data-column-container="true"]) {
            position: relative;
            transition: outline 0.15s ease, background 0.15s ease;
            max-width: 100%;
        }
        [data-xpath]:not([data-container="true"]):not(.drop-zone):not([data-column-container="true"]):hover {
            outline: 1px dashed #22c55e !important;
            outline-offset: 2px;
        }
        /* Prevent hover outline on elements inside a selected column container */
        [data-column-container="true"][data-selected="true"] [data-xpath]:hover {
            outline: none !important;
        }
        [data-selected="true"] {
            outline: 2px solid #22c55e !important;
            outline-offset: 2px;
        }

        /* Element Toolbar */
        .element-toolbar {
            display: none;
            position: absolute;
            top: -32px;
            left: 50%;
            transform: translateX(-50%);
            background: #22c55e;
            border-radius: 4px;
            padding: 4px;
            gap: 2px;
            z-index: 1000;
            white-space: nowrap;
        }
        [data-selected="true"] > .element-toolbar {
            display: flex;
        }
        .element-toolbar-btn {
            width: 24px;
            height: 24px;
            display: flex;
            align-items: center;
            justify-content: center;
            background: transparent;
            border: none;
            color: white;
            cursor: pointer;
            border-radius: 3px;
            padding: 0;
        }
        .element-toolbar-btn:hover {
            background: rgba(255,255,255,0.2);
        }
        .element-toolbar-btn[data-action="drag"] {
            cursor: grab;
        }
        .element-toolbar-btn[data-action="drag"]:active {
            cursor: grabbing;
        }

        /* Inline editing */
        [contenteditable="true"] {
            outline: none;
            cursor: text;
        }
        [contenteditable="true"]:focus {
            background: rgba(34, 197, 94, 0.03);
        }

        .drop-zone {
            min-height: 80px;
            border: 1px dashed #cbd5e1;
            padding: 10px;
            transition: all 0.2s;
            position: relative;
        }
        .drop-zone:hover {
            border-color: #22c55e;
            background: rgba(34, 197, 94, 0.05);
        }
        .drop-zone.drag-over {
            border-color: #22c55e !important;
            background: rgba(34, 197, 94, 0.1) !important;
        }
        .drop-indicator {
            height: 4px;
            background: #22c55e;
            margin: 2px 0;
            border-radius: 2px;
            pointer-events: none;
            box-shadow: 0 0 4px rgba(34, 197, 94, 0.5);
        }
        .dragging {
            opacity: 0.4;
        }
        [data-column-container="true"] {
            transition: all 0.2s;
            position: relative;
        }
        [data-column-container="true"]:hover {
            outline: 1px dashed #3b82f6;
            outline-offset: 4px;
        }
        [data-column-container="true"][data-selected="true"] {
            outline: 2px solid #3b82f6 !important;
            outline-offset: 4px;
        }
        /* Column container toolbar - blue theme, visible on hover */
        .column-toolbar {
            position: absolute !important;
            background: #3b82f6 !important;
            top: -36px !important;
            left: 10px !important;
            transform: none !important;
            z-index: 1001 !important;
            flex-shrink: 0 !important;
        }
        [data-column-container="true"] > .column-toolbar {
            display: none !important;
        }
        [data-column-container="true"]:hover > .column-toolbar,
        [data-column-container="true"][data-selected="true"] > .column-toolbar {
            display: flex !important;
        }
    `
}

// ============================================
// UTILITY FUNCTIONS
// ============================================

const generateXPath = (el: HTMLElement, root: HTMLElement): string => {
   if (!el || el === root || !el.parentElement) return '';
   const parent = el.parentElement;
   const siblings = Array.from(parent.children);
   const index = siblings.filter(s => s.tagName === el.tagName).indexOf(el) + 1;
   const tag = el.tagName.toLowerCase();
   const parentPath = generateXPath(parent, root);
   return parentPath ? `${parentPath}/${tag}[${index}]` : `/${tag}[${index}]`;
};

const parseStyles = (styleStr: string): ElementStyles => {
   if (!styleStr) return {};
   return styleStr.split(';').reduce((acc: ElementStyles, rule: string) => {
      const [prop, val] = rule.split(':').map(s => s.trim());
      if (prop && val) acc[prop] = val;
      return acc;
   }, {});
};

const extractBodyContent = (html: string): string => {
   const match = html.match(/<body[^>]*>([\s\S]*)<\/body>/i);
   return match ? match[1] : html;
};

const extractStyles = (html: string): string => {
   const styleMatches = html.match(/<style[^>]*>([\s\S]*?)<\/style>/gi);
   if (!styleMatches) return '';
   return styleMatches.map(s => {
      const content = s.match(/<style[^>]*>([\s\S]*?)<\/style>/i);
      return content ? content[1] : '';
   }).join('\n');
};

// Check if element is editable (not img, hr, spacer, html-block)
const isEditableElement = (el: HTMLElement): boolean => {
   const tag = el.tagName.toLowerCase();
   if (tag === 'img' || tag === 'hr') return false;
   if (el.hasAttribute('data-html-block')) return false;
   if (el.hasAttribute('data-element-type') && el.getAttribute('data-element-type') === 'spacer') return false;
   return true;
};

// ============================================
// RICH TEXT TOOLBAR
// ============================================

interface RichTextToolbarProps {
   onFormat: (command: string, value?: string) => void;
}

const RichTextToolbar: React.FC<RichTextToolbarProps> = ({ onFormat }) => {
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
      <div className="flex items-center gap-1 bg-white border-b px-4 py-2 flex-wrap">
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
            {['8px', '10px', '12px', '14px', '16px', '18px', '20px', '24px', '28px', '32px', '36px'].map(size => (
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
            {['Arial', 'Helvetica', 'Times New Roman', 'Georgia', 'Verdana', 'Courier New'].map(font => (
               <option key={font} value={font}>{font}</option>
            ))}
         </select>
      </div>
   );
};

// ============================================
// LEFT SIDEBAR - ELEMENTS
// ============================================

interface ElementsSidebarProps {
   onDragStart: (component: Component) => void;
   onDragEnd: () => void;
}

const ElementsSidebar: React.FC<ElementsSidebarProps> = ({ onDragStart, onDragEnd }) => {
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

// ============================================
// SETTINGS PANEL
// ============================================

// Style Input component that uses local state and applies on blur
interface StyleInputProps {
   value: string;
   onChange: (value: string) => void;
   placeholder?: string;
   className?: string;
   type?: string;
}

const StyleInput: React.FC<StyleInputProps> = ({ value, onChange, placeholder, className, type = 'text' }) => {
   const [localValue, setLocalValue] = useState(value);

   // Sync local state when external value changes (e.g., selecting different element)
   useEffect(() => {
      setLocalValue(value);
   }, [value]);

   return (
      <input
         type={type}
         value={localValue}
         onChange={(e) => setLocalValue(e.target.value)}
         onBlur={() => {
            if (localValue !== value) {
               onChange(localValue);
            }
         }}
         onKeyDown={(e) => {
            if (e.key === 'Enter') {
               onChange(localValue);
               (e.target as HTMLInputElement).blur();
            }
         }}
         placeholder={placeholder}
         className={className}
      />
   );
};

interface SettingsPanelProps {
   elementInfo: ElementInfo | null;
   onUpdateContent: (value: string, isHtml?: boolean) => void;
   onUpdateStyle: (prop: string, value: string) => void;
   onUpdateAttribute: (attr: string, value: string) => void;
   onUpdateCustomCss: (css: string) => void;
   onDelete: () => void;
   onDuplicate: () => void;
   onClose: () => void;
}

const SettingsPanel: React.FC<SettingsPanelProps> = ({
   elementInfo,
   onUpdateContent,
   onUpdateStyle,
   onUpdateAttribute,
   onUpdateCustomCss,
   onDelete,
   onDuplicate,
   onClose,
}) => {
   const [activeTab, setActiveTab] = useState<'content' | 'style' | 'advanced'>('style');

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
                     <div className="flex gap-2">
                        <input
                           type="color"
                           value={elementInfo.styles.color || '#000000'}
                           onChange={(e) => onUpdateStyle('color', e.target.value)}
                           className="w-12 h-8 border rounded cursor-pointer"
                        />
                        <StyleInput
                           value={elementInfo.styles.color || ''}
                           onChange={(v) => onUpdateStyle('color', v)}
                           placeholder="#000000"
                           className="flex-1 px-2 py-1.5 border rounded text-sm"
                        />
                     </div>
                  </div>

                  <div>
                     <label className="block text-xs text-gray-600 mb-1">Background</label>
                     <div className="flex gap-2">
                        <input
                           type="color"
                           value={elementInfo.styles.background || elementInfo.styles.backgroundColor || '#ffffff'}
                           onChange={(e) => onUpdateStyle('background', e.target.value)}
                           className="w-12 h-8 border rounded cursor-pointer"
                        />
                        <StyleInput
                           value={elementInfo.styles.background || elementInfo.styles.backgroundColor || ''}
                           onChange={(v) => onUpdateStyle('background', v)}
                           placeholder="transparent"
                           className="flex-1 px-2 py-1.5 border rounded text-sm"
                        />
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

// ============================================
// PAGE PANEL COMPONENT (Bottom navigation)
// ============================================

interface PagePanelProps {
   pages: Page[];
   currentIndex: number;
   onSelectPage: (index: number) => void;
   onAddPage: () => void;
   onDuplicatePage: (index: number) => void;
   onDeletePage: (index: number) => void;
   onRenamePage: (index: number, name: string) => void;
}

const PagePanel: React.FC<PagePanelProps> = ({
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
                  className={`flex-shrink-0 cursor-pointer group relative ${currentIndex === index ? 'ring-2 ring-green-500' : ''
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
                           transform: `scale(${Math.min(80 / page.width, 60 / page.height)})`,
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
               className="flex-shrink-0 w-20 h-[60px] border border-dashed border-gray-600 rounded flex items-center justify-center text-gray-500 hover:border-green-500 hover:text-green-500 transition-colors"
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

// ============================================
// PAGE SIZE SETTINGS COMPONENT
// ============================================

interface PageSizeSettingsProps {
   currentPage: Page;
   onChangeSize: (width: number, height: number) => void;
}

const PageSizeSettings: React.FC<PageSizeSettingsProps> = ({
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

// ============================================
// MAIN EDITOR COMPONENT
// ============================================

export default function ElementBuilder(): JSX.Element {
   // Multi-page state
   const [pages, setPages] = useState<Page[]>(() => [createDefaultPage('Page 1')]);
   const [currentPageIndex, setCurrentPageIndex] = useState<number>(0);
   const currentPage = pages[currentPageIndex];

   // Selection state
   const [selectedXPath, setSelectedXPath] = useState<string | null>(null);
   const [selectedElement, setSelectedElement] = useState<HTMLElement | null>(null);
   const [breakpoint, setBreakpoint] = useState<Breakpoint>('desktop');
   const [draggedComponent, setDraggedComponent] = useState<Component | null>(null);

   // History tracks entire pages array for global undo/redo
   const [history, setHistory] = useState<{ past: Page[][]; future: Page[][] }>({ past: [], future: [] });

   // Helper to get/set current page html
   const html = currentPage.html;
   const setHtml = useCallback((newHtml: string) => {
      setPages(prev => prev.map((page, idx) =>
         idx === currentPageIndex ? { ...page, html: newHtml } : page
      ));
   }, [currentPageIndex]);

   const containerRef = useRef<HTMLDivElement>(null);
   const shadowRootRef = useRef<ShadowRoot | null>(null);
   const draggedElementRef = useRef<HTMLElement | null>(null);

   // Save to history (saves entire pages array)
   const saveHistory = useCallback(() => {
      setHistory(prev => ({
         past: [...prev.past.slice(-50), pages],
         future: []
      }));
   }, [pages]);

   // Undo
   const undo = useCallback(() => {
      setHistory(prev => {
         if (prev.past.length === 0) return prev;
         const newPast = [...prev.past];
         const previous = newPast.pop()!;
         const currentPages = pages;
         setPages(previous);
         // Adjust currentPageIndex if needed
         if (currentPageIndex >= previous.length) {
            setCurrentPageIndex(previous.length - 1);
         }
         return {
            past: newPast,
            future: [currentPages, ...prev.future]
         };
      });
   }, [pages, currentPageIndex]);

   // Redo
   const redo = useCallback(() => {
      setHistory(prev => {
         if (prev.future.length === 0) return prev;
         const [next, ...newFuture] = prev.future;
         const currentPages = pages;
         setPages(next);
         return {
            past: [...prev.past, currentPages],
            future: newFuture
         };
      });
   }, [pages]);

   // Page manipulation functions
   const addPage = useCallback(() => {
      saveHistory();
      const newPage = createDefaultPage(`Page ${pages.length + 1}`, {
         name: 'Custom',
         width: currentPage.width,
         height: currentPage.height,
      });
      setPages(prev => [...prev, newPage]);
      setCurrentPageIndex(pages.length);
   }, [pages.length, currentPage.width, currentPage.height, saveHistory]);

   const duplicatePage = useCallback((index: number) => {
      saveHistory();
      const pageToDuplicate = pages[index];
      const newPage: Page = {
         ...pageToDuplicate,
         id: generatePageId(),
         name: `${pageToDuplicate.name} (Copy)`,
      };
      const newPages = [...pages];
      newPages.splice(index + 1, 0, newPage);
      setPages(newPages);
      setCurrentPageIndex(index + 1);
   }, [pages, saveHistory]);

   const deletePage = useCallback((index: number) => {
      if (pages.length <= 1) return;
      saveHistory();
      setPages(prev => prev.filter((_, i) => i !== index));
      if (currentPageIndex >= index && currentPageIndex > 0) {
         setCurrentPageIndex(prev => prev - 1);
      }
   }, [pages.length, currentPageIndex, saveHistory]);

   const renamePage = useCallback((index: number, name: string) => {
      saveHistory();
      setPages(prev => prev.map((page, i) =>
         i === index ? { ...page, name } : page
      ));
   }, [saveHistory]);

   const changePageSize = useCallback((width: number, height: number) => {
      saveHistory();
      setPages(prev => prev.map((page, idx) =>
         idx === currentPageIndex ? { ...page, width, height } : page
      ));
   }, [currentPageIndex, saveHistory]);

   // Initialize shadow DOM - must reinitialize when page changes
   useEffect(() => {
      if (!containerRef.current) return;

      // Check if we need to attach a new shadow root
      // (shadow root might be attached to a different element)
      if (!containerRef.current.shadowRoot) {
         shadowRootRef.current = containerRef.current.attachShadow({ mode: 'open' });
      } else {
         shadowRootRef.current = containerRef.current.shadowRoot;
      }
   }, [currentPageIndex]);

   // Build full HTML from shadow DOM content
   const updateHtmlFromShadow = useCallback(() => {
      const shadow = shadowRootRef.current;
      if (!shadow) return;

      const container = shadow.querySelector('.shadow-root-container');
      if (!container) return;

      const clone = container.cloneNode(true) as HTMLElement;
      // Clean up editor attributes
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

      const userStyles = extractStyles(html);
      const newHtml = /*html*/`
            <!DOCTYPE html>
                <html>
                    <head>
                        <meta charset="UTF-8">
                        <meta name="viewport" content="width=device-width, initial-scale=1.0">
                        <style>
                        ${userStyles}
                        </style>
                    </head>
                    <body>
                        ${clone.innerHTML}
                    </body>
                </html>
            `;

      setHtml(newHtml);
   }, [html]);

   // Duplicate element
   const duplicateElement = useCallback(() => {
      const shadow = shadowRootRef.current;
      if (!selectedXPath || !shadow) return;

      const el = shadow.querySelector(`[data-xpath="${selectedXPath}"]`) as HTMLElement;
      if (el && !el.hasAttribute('data-container')) {
         saveHistory();
         const clone = el.cloneNode(true) as HTMLElement;
         // Remove editor-specific attributes from clone
         clone.removeAttribute('data-xpath');
         clone.removeAttribute('data-selected');
         clone.removeAttribute('contenteditable');
         clone.querySelectorAll('.element-toolbar').forEach(t => t.remove());
         el.parentNode?.insertBefore(clone, el.nextSibling);
         updateHtmlFromShadow();
      }
   }, [selectedElement, selectedXPath, saveHistory, updateHtmlFromShadow]);

   // Render content into shadow DOM (main)
   useEffect(() => {
      const shadow = shadowRootRef.current;
      if (!shadow) return;

      const bodyContent = extractBodyContent(html);
      const userStyles = extractStyles(html);

      shadow.innerHTML = /*html*/`
            <style>${userStyles}</style>
            <style>${EDITOR_STYLES({ currentPageHeight: currentPage?.height })}</style>
            <div class="shadow-root-container">${bodyContent}</div>
        `;

      const rootContainer = shadow.querySelector('.shadow-root-container');
      if (!rootContainer) return;

      // Drag & Drop adding imported html
      const normalizeForEditor = (root: HTMLElement) => {
         const nonEditableTags = [
            'HR', 'IMG', 'BODY', 'STYLE', 'SCRIPT',
            'META', 'CANVAS', 'IFRAME'
         ];

         const containerTags = [
            'DIV', 'SECTION', 'ARTICLE', 'MAIN', 'TR', 'TD'
         ];

         root.querySelectorAll('*').forEach(el => {
            // Remove foreign state
            el.removeAttribute('data-xpath');
            el.removeAttribute('data-selected');
            el.removeAttribute('contenteditable');
            el.removeAttribute('draggable');

            // ✅ semantic hints ONLY
            if (!nonEditableTags.includes(el.tagName)) {
               el.setAttribute('data-editable', 'true');
            }

            // Only add data-container to the main page-container, not to column containers or widget DIVs
            if (containerTags.includes(el.tagName) &&
               el.classList.contains('page-container') &&
               !el.hasAttribute('data-column-container')) {
               el.setAttribute('data-container', 'true');
            }
         });
      };
      normalizeForEditor(rootContainer as HTMLElement);
      // Add XPath data attributes and toolbar to all elements
      const addXPathData = (el: Element, root: HTMLElement): void => {
         if (el.nodeType !== 1) return;
         if (
            el.tagName !== 'SCRIPT'
            && el.tagName !== 'STYLE'
            // && el.tagName !== "SPAN"
            // && el.tagName !== "B"
            // && el.tagName !== "I"
            && !el.classList.contains('shadow-root-container')
            && !el.classList.contains('element-toolbar')
         ) {
            const xpath = generateXPath(el as HTMLElement, root);
            el.setAttribute('data-xpath', xpath);

            // Add toolbar to editable elements AND column containers (but not main container or drop zones)
            const isColumnContainer = el.hasAttribute('data-column-container');
            const shouldHaveToolbar = !el.hasAttribute('data-container') && !el.classList.contains('drop-zone');

            if (shouldHaveToolbar) {
               // Add element toolbar
               const toolbar = document.createElement('div');
               toolbar.className = isColumnContainer ? 'element-toolbar column-toolbar' : 'element-toolbar';
               toolbar.innerHTML = /*html*/`
                        <button class="element-toolbar-btn" data-action="drag" title="Drag">
                            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="9" cy="5" r="1"/><circle cx="9" cy="12" r="1"/><circle cx="9" cy="19" r="1"/><circle cx="15" cy="5" r="1"/><circle cx="15" cy="12" r="1"/><circle cx="15" cy="19" r="1"/></svg>
                        </button>
                        <button class="element-toolbar-btn" data-action="duplicate" title="Duplicate">
                            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>
                        </button>
                        <button class="element-toolbar-btn" data-action="delete" title="Delete">
                            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/></svg>
                        </button>
                    `;
               el.insertBefore(toolbar, el.firstChild);

               // Make element editable if it's an editable type (not img, hr, spacer, html-block, column-container)
               if (!isColumnContainer && isEditableElement(el as HTMLElement)) {
                  el.setAttribute('contenteditable', 'true');
               }
            }
         }
         Array.from(el.children).forEach(child => {
            if (!child.classList.contains('element-toolbar')) {
               addXPathData(child, root);
            }
         });
      };
      addXPathData(rootContainer, rootContainer as HTMLElement);

      // Click handler for selection
      const handleClick = (e: Event) => {
         const mouseEvent = e as MouseEvent;
         const target = mouseEvent.target as HTMLElement;

         // Handle toolbar button clicks
         const toolbarBtn = target.closest('.element-toolbar-btn');
         if (toolbarBtn) {
            mouseEvent.preventDefault();
            mouseEvent.stopPropagation();
            const action = toolbarBtn.getAttribute('data-action');
            const parentElement = toolbarBtn.closest('[data-xpath]');
            const xpath = parentElement?.getAttribute('data-xpath');

            if (xpath && action) {
               if (action === 'delete') {
                  const el = shadow.querySelector(`[data-xpath="${xpath}"]`) as HTMLElement;
                  if (el && !el.hasAttribute('data-container')) {
                     saveHistory();
                     el.remove();
                     updateHtmlFromShadow();
                     setSelectedXPath(null);
                     setSelectedElement(null);
                  }
               } else if (action === 'duplicate') {
                  const el = shadow.querySelector(`[data-xpath="${xpath}"]`) as HTMLElement;
                  if (el && !el.hasAttribute('data-container')) {
                     saveHistory();
                     const clone = el.cloneNode(true) as HTMLElement;
                     clone.removeAttribute('data-xpath');
                     clone.removeAttribute('data-selected');
                     el.parentNode?.insertBefore(clone, el.nextSibling);
                     updateHtmlFromShadow();
                  }
               }
            }
            return;
         }

         // Ignore clicks on toolbar itself
         if (target.closest('.element-toolbar')) {
            return;
         }

         // Check if click is on a drop-zone inside a column container
         const parentColumnContainer = target.closest('[data-column-container="true"]') as HTMLElement;

         // If clicking on a drop-zone inside a column container, select the column container
         if (target.classList.contains('drop-zone') && parentColumnContainer) {
            const xpath = parentColumnContainer.getAttribute('data-xpath');
            if (xpath) {
               mouseEvent.preventDefault();
               mouseEvent.stopPropagation();
               setSelectedXPath(xpath);
               setSelectedElement(parentColumnContainer);
            }
            return;
         }

         // Handle main container/drop-zone clicks - deselect
         if (target.hasAttribute('data-container') ||
            target.classList.contains('drop-zone') ||
            target.classList.contains('drop-indicator') ||
            target.classList.contains('shadow-root-container')) {
            setSelectedXPath(null);
            setSelectedElement(null);
            return;
         }

         // Check if clicking directly on a column container
         if (target.hasAttribute('data-column-container')) {
            const xpath = target.getAttribute('data-xpath');
            if (xpath) {
               mouseEvent.preventDefault();
               mouseEvent.stopPropagation();
               setSelectedXPath(xpath);
               setSelectedElement(target);
            }
            return;
         }

         // Find the element with xpath (could be the target or a parent)
         const elementWithXPath = target.closest('[data-xpath]') as HTMLElement;
         if (elementWithXPath && !elementWithXPath.classList.contains('element-toolbar')) {
            const xpath = elementWithXPath.getAttribute('data-xpath');
            if (xpath) {
               // Don't prevent default for contenteditable elements
               if (!elementWithXPath.hasAttribute('contenteditable')) {
                  mouseEvent.preventDefault();
               }
               mouseEvent.stopPropagation();
               setSelectedXPath(xpath);
               setSelectedElement(elementWithXPath);
            }
         }
      };

      rootContainer.addEventListener('click', handleClick);

      // Handle input/blur for contenteditable elements
      const handleInput = () => {
         // Debounced save on input
      };

      const handleBlur = (e: Event) => {
         const target = e.target as HTMLElement;
         if (target.hasAttribute('contenteditable') && target.hasAttribute('data-xpath')) {
            saveHistory();
            updateHtmlFromShadow();
         }
      };

      rootContainer.addEventListener('input', handleInput);
      rootContainer.addEventListener('focusout', handleBlur as EventListener);

      // Setup drag and drop for all elements (including column containers)
      const allEditableElements = shadow.querySelectorAll('[data-xpath]:not([data-container]):not(.drop-zone)');

      allEditableElements.forEach(element => {
         const el = element as HTMLElement;
         const dragBtn = el.querySelector('.element-toolbar-btn[data-action="drag"]');

         if (dragBtn) {
            (dragBtn as HTMLElement).draggable = true;
            dragBtn.addEventListener('dragstart', (e: Event) => {
               const dragEvent = e as DragEvent;
               dragEvent.stopPropagation();
               draggedElementRef.current = el;
               el.classList.add('dragging');
               if (dragEvent.dataTransfer) {
                  dragEvent.dataTransfer.effectAllowed = 'move';
                  dragEvent.dataTransfer.setData('text/plain', 'element');
               }
            });

            dragBtn.addEventListener('dragend', () => {
               el.classList.remove('dragging');
               shadow.querySelectorAll('.drop-indicator').forEach(ind => ind.remove());
               shadow.querySelectorAll('.drag-over').forEach(zone => zone.classList.remove('drag-over'));
               draggedElementRef.current = null;
            });
         }

         // Dragover - show indicator
         el.addEventListener('dragover', (e: Event) => {
            const dragEvent = e as DragEvent;
            dragEvent.preventDefault();
            dragEvent.stopPropagation();

            const dragged = draggedElementRef.current;
            if (!dragged || dragged === el || el.contains(dragged) || dragged.contains(el)) return;
            if (draggedComponent) return;

            shadow.querySelectorAll('.drop-indicator').forEach(ind => ind.remove());
            const rect = el.getBoundingClientRect();
            const indicator = document.createElement('div');
            indicator.className = 'drop-indicator';

            if (dragEvent.clientY < rect.top + rect.height / 2) {
               el.parentNode?.insertBefore(indicator, el);
            } else {
               el.parentNode?.insertBefore(indicator, el.nextSibling);
            }
         });

         // Drop - move element
         el.addEventListener('drop', (e: Event) => {
            const dragEvent = e as DragEvent;
            dragEvent.preventDefault();
            dragEvent.stopPropagation();

            const dragged = draggedElementRef.current;
            if (!dragged || dragged === el || el.contains(dragged) || dragged.contains(el)) return;

            saveHistory();
            const rect = el.getBoundingClientRect();
            if (dragEvent.clientY < rect.top + rect.height / 2) {
               el.parentNode?.insertBefore(dragged, el);
            } else {
               el.parentNode?.insertBefore(dragged, el.nextSibling);
            }

            shadow.querySelectorAll('.drop-indicator').forEach(ind => ind.remove());
            updateHtmlFromShadow();
         });
      });

      // Setup drop zones (for new components and moving elements into columns)
      const dropZones = shadow.querySelectorAll('.drop-zone, [data-container="true"]');

      dropZones.forEach((zone) => {
         const zoneEl = zone as HTMLElement;

         const handleDragOver = (e: DragEvent) => {
            e.preventDefault();
            e.stopPropagation();
            zoneEl.classList.add('drag-over');
         };

         const handleDragLeave = (e: DragEvent) => {
            if (e.target === zoneEl) {
               zoneEl.classList.remove('drag-over');
            }
         };

         const handleDrop = (e: DragEvent) => {
            e.preventDefault();
            e.stopPropagation();
            zoneEl.classList.remove('drag-over');
            shadow.querySelectorAll('.drop-indicator').forEach(ind => ind.remove());

            if (draggedComponent) {
               saveHistory();
               zoneEl.insertAdjacentHTML('beforeend', draggedComponent.html);
               setDraggedComponent(null);
               updateHtmlFromShadow();
            } else if (draggedElementRef.current) {
               const dragged = draggedElementRef.current;
               if (!zoneEl.contains(dragged) && !dragged.contains(zoneEl)) {
                  saveHistory();
                  zoneEl.appendChild(dragged);
                  updateHtmlFromShadow();
               }
            }
         };

         zoneEl.addEventListener('dragover', handleDragOver);
         zoneEl.addEventListener('dragleave', handleDragLeave);
         zoneEl.addEventListener('drop', handleDrop);
      });

      return () => {
         rootContainer.removeEventListener('click', handleClick);
         rootContainer.removeEventListener('input', handleInput);
         rootContainer.removeEventListener('focusout', handleBlur as EventListener);
      };
   }, [html, draggedComponent, saveHistory, updateHtmlFromShadow, currentPageIndex]);

   // Update selection highlight
   useEffect(() => {
      const shadow = shadowRootRef.current;
      if (!shadow) return;

      shadow.querySelectorAll('[data-selected]').forEach(el => el.removeAttribute('data-selected'));

      if (selectedXPath) {
         const el = shadow.querySelector(`[data-xpath="${selectedXPath}"]`);
         if (el) {
            el.setAttribute('data-selected', 'true');
            setSelectedElement(el as HTMLElement);
         }
      }
   }, [selectedXPath, html]);

   const updateContent = (value: string, isHtml: boolean = false): void => {
      const shadow = shadowRootRef.current;
      if (!selectedXPath || !shadow) return;

      const el = shadow.querySelector(`[data-xpath="${selectedXPath}"]`) as HTMLElement;
      if (el) {
         saveHistory();
         if (isHtml) {
            // For HTML blocks, update innerHTML
            el.innerHTML = value;
            // Re-add toolbar
            const toolbar = document.createElement('div');
            toolbar.className = 'element-toolbar';
            toolbar.innerHTML = /* html */`
                    <button class="element-toolbar-btn" data-action="drag" title="Drag">
                        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="9" cy="5" r="1"/><circle cx="9" cy="12" r="1"/><circle cx="9" cy="19" r="1"/><circle cx="15" cy="5" r="1"/><circle cx="15" cy="12" r="1"/><circle cx="15" cy="19" r="1"/></svg>
                    </button>
                    <button class="element-toolbar-btn" data-action="duplicate" title="Duplicate">
                        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>
                    </button>
                    <button class="element-toolbar-btn" data-action="delete" title="Delete">
                        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/></svg>
                    </button>
                `;
            el.insertBefore(toolbar, el.firstChild);
         } else if (el.tagName === 'IMG') {
            (el as HTMLImageElement).src = value;
         } else {
            el.textContent = value;
         }
         updateHtmlFromShadow();
      }
   };

   const updateStyle = (prop: string, value: string): void => {
      const shadow = shadowRootRef.current;
      if (!selectedXPath || !shadow) return;

      const el = shadow.querySelector(`[data-xpath="${selectedXPath}"]`) as HTMLElement;
      if (el) {
         saveHistory();
         (el.style as any)[prop] = value;
         updateHtmlFromShadow();
      }
   };

   const updateAttribute = (attr: string, value: string): void => {
      const shadow = shadowRootRef.current;
      if (!selectedXPath || !shadow) return;

      const el = shadow.querySelector(`[data-xpath="${selectedXPath}"]`) as HTMLElement;
      if (el) {
         saveHistory();
         el.setAttribute(attr, value);
         updateHtmlFromShadow();
      }
   };

   const updateCustomCss = (css: string): void => {
      const shadow = shadowRootRef.current;
      if (!selectedXPath || !shadow) return;

      const el = shadow.querySelector(`[data-xpath="${selectedXPath}"]`) as HTMLElement;
      if (el) {
         saveHistory();
         el.setAttribute('style', css);
         updateHtmlFromShadow();
      }
   };

   const deleteElement = (): void => {
      const shadow = shadowRootRef.current;
      if (!selectedXPath || !shadow) return;

      const el = shadow.querySelector(`[data-xpath="${selectedXPath}"]`) as HTMLElement;
      if (el && !el.hasAttribute('data-container')) {
         saveHistory();
         el.remove();
         updateHtmlFromShadow();
         setSelectedXPath(null);
         setSelectedElement(null);
      }
   };

   const handleSidebarDragStart = (component: Component): void => {
      setDraggedComponent(component);
   };

   const handleSidebarDragEnd = (): void => {
      setDraggedComponent(null);
      const shadow = shadowRootRef.current;
      if (shadow) {
         shadow.querySelectorAll('.drag-over').forEach(zone => zone.classList.remove('drag-over'));
      }
   };

   const handleFormat = useCallback((command: string, value?: string) => {
      const shadow = shadowRootRef.current;
      if (!shadow) return;

      // Get selection from shadow root or document
      const selection = (shadow as any).getSelection?.() ?? document.getSelection();
      if (!selection || selection.rangeCount === 0) return;

      // Handle fontSize specially - execCommand expects 1-7, but we want px values
      if (command === 'fontSize' && value) {
         const range = selection.getRangeAt(0);
         if (!range.collapsed) {
            // Wrap selection in a span with font-size style
            const span = document.createElement('span');
            span.style.fontSize = value;
            try {
               range.surroundContents(span);
               saveHistory();
               updateHtmlFromShadow();
            } catch (e) {
               // If surroundContents fails (selection spans multiple elements), use execCommand fallback
               // Map px to legacy font sizes (1-7)
               const pxValue = parseInt(value);
               let legacySize = '3'; // default
               if (pxValue <= 10) legacySize = '1';
               else if (pxValue <= 13) legacySize = '2';
               else if (pxValue <= 16) legacySize = '3';
               else if (pxValue <= 18) legacySize = '4';
               else if (pxValue <= 24) legacySize = '5';
               else if (pxValue <= 32) legacySize = '6';
               else legacySize = '7';
               document.execCommand('fontSize', false, legacySize);
               updateHtmlFromShadow();
            }
         }
         return;
      }

      // Handle fontName specially
      if (command === 'fontName' && value) {
         const range = selection.getRangeAt(0);
         if (!range.collapsed) {
            // Wrap selection in a span with font-family style
            const span = document.createElement('span');
            span.style.fontFamily = value;
            try {
               range.surroundContents(span);
               saveHistory();
               updateHtmlFromShadow();
            } catch (e) {
               // Fallback to execCommand
               document.execCommand(command, false, value);
               updateHtmlFromShadow();
            }
         }
         return;
      }

      // execCommand is deprecated but still works for rich text editing
      document.execCommand(command, false, value);

      // Save changes after formatting
      setTimeout(() => {
         updateHtmlFromShadow();
      }, 0);
   }, [updateHtmlFromShadow, saveHistory]);

   // Clean page HTML for export (remove editor-specific attributes)
   const cleanPageHtml = (pageHtml: string): string => {
      const parser = new DOMParser();
      const doc = parser.parseFromString(`<div>${pageHtml}</div>`, 'text/html');
      const container = doc.body.firstElementChild;
      if (!container) return pageHtml;

      container.querySelectorAll('[data-xpath]').forEach(el => {
         el.removeAttribute('data-xpath');
         el.removeAttribute('data-selected');
         el.removeAttribute('draggable');
         el.removeAttribute('contenteditable');
      });
      container.querySelectorAll('.element-toolbar').forEach(el => el.remove());
      container.querySelectorAll('[data-editable]').forEach(el => el.removeAttribute('data-editable'));

      return container.innerHTML;
   };

   // Export all pages as a single HTML file with page breaks
   const exportHTML = (): void => {
      const pageStyles = pages.map((page, idx) => /* css */`
            .page-${idx + 1} {
                width: ${page.width}px;
                min-height: ${page.height}px;
                margin: 0 auto 40px auto;
                background: white;
                box-shadow: 0 2px 8px rgba(0,0,0,0.1);
                page-break-after: always;
            }
            @media print {
                .page-${idx + 1} {
                    box-shadow: none;
                    margin: 0;
                }
            }
        `).join('\n');

      const pagesHtml = pages.map((page, idx) => `
            <div class="page-${idx + 1}" data-page-name="${page.name}">
                ${cleanPageHtml(page.html)}
            </div>
        `).join('\n');

      const fullHtml = /* html */`<!DOCTYPE html>
                <html>
                <head>
                <meta charset="UTF-8">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                <title>Exported Document</title>
                <style>
                * { box-sizing: border-box; }
                body { margin: 0; padding: 20px; font-family: system-ui, sans-serif; background: #f5f5f5; }
                ${pageStyles}
                </style>
                </head>
                <body>
                ${pagesHtml}
                </body>
                </html>
            `;

      const blob = new Blob([fullHtml], { type: 'text/html' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'document.html';
      a.click();
      URL.revokeObjectURL(url);
   };

   // Export current page only
   const exportCurrentPage = (): void => {
      const page = currentPage;
      const cleanHtml = cleanPageHtml(page.html);
      const fullHtml = wrapPageInDocument({ ...page, html: cleanHtml });

      const blob = new Blob([fullHtml], { type: 'text/html' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${page.name.replace(/\s+/g, '-').toLowerCase()}.html`;
      a.click();
      URL.revokeObjectURL(url);
   };

   const importHTML = (e: React.ChangeEvent<HTMLInputElement>): void => {
      const file = e.target.files?.[0];
      if (!file) return;

      const reader = new FileReader();
      reader.onload = (event) => {
         const content = event.target?.result as string;
         if (content) {
            saveHistory();
            // Extract body content for the current page
            const bodyMatch = content.match(/<body[^>]*>([\s\S]*)<\/body>/i);
            const bodyContent = bodyMatch ? bodyMatch[1].trim() : content;
            setHtml(bodyContent || INITIAL_PAGE_HTML);
            setSelectedXPath(null);
            setSelectedElement(null);
         }
      };
      reader.readAsText(file);
      e.target.value = '';
   };


   const getElementInfo = (): ElementInfo | null => {
      const shadow = shadowRootRef.current;
      if (!selectedXPath || !shadow) return null;

      // Always query the current element from shadow DOM to avoid stale references
      const el = shadow.querySelector(`[data-xpath="${selectedXPath}"]`) as HTMLElement;
      if (!el) return null;

      const customCss = el.getAttribute('style') || '';
      const styles = parseStyles(customCss);
      const tag = el.tagName.toLowerCase();
      const content = el.textContent || '';
      // Get innerHTML without the toolbar
      const clone = el.cloneNode(true) as HTMLElement;
      clone.querySelectorAll('.element-toolbar').forEach(t => t.remove());
      const innerHTML = clone.innerHTML;
      const src = el.getAttribute('src') || '';
      const href = el.getAttribute('href') || '';
      const alt = el.getAttribute('alt') || '';
      const isHtmlBlock = el.hasAttribute('data-html-block');
      return { tag, styles, content, innerHTML, src, href, alt, isHtmlBlock, customCss };
   };

   const elementInfo = getElementInfo();

   // Get scale factor for preview based on breakpoint
   const getPreviewScale = () => {
      switch (breakpoint) {
         case 'mobile': return Math.min(1, 375 / currentPage.width);
         case 'tablet': return Math.min(1, 768 / currentPage.width);
         default: return 1;
      }
   };

   const previewScale = getPreviewScale();

   return (
      <div className="flex h-screen bg-gray-100">
         {/* Left Sidebar - Elements */}
         <div className="w-52 bg-white border-r flex flex-col">
            <ElementsSidebar
               onDragStart={handleSidebarDragStart}
               onDragEnd={handleSidebarDragEnd}
            />
         </div>

         {/* Main Canvas Area */}
         <div className="flex-1 flex flex-col">
            {/* Rich Text Toolbar */}
            <RichTextToolbar onFormat={handleFormat} />

            {/* Main Toolbar */}
            <div className="bg-white border-b p-2 flex items-center justify-between">
               <div className="flex items-center gap-2">
                  <button
                     onClick={undo}
                     disabled={history.past.length === 0}
                     className="p-2 rounded text-gray-600 hover:bg-gray-100 disabled:opacity-50"
                     title="Undo"
                  >
                     <Undo2 size={18} />
                  </button>
                  <button
                     onClick={redo}
                     disabled={history.future.length === 0}
                     className="p-2 rounded text-gray-600 hover:bg-gray-100 disabled:opacity-50"
                     title="Redo"
                  >
                     <Redo2 size={18} />
                  </button>

                  <div className="w-px h-6 bg-gray-300 mx-2" />

                  {/* Page Size Settings */}
                  <PageSizeSettings
                     currentPage={currentPage}
                     onChangeSize={changePageSize}
                  />

                  <div className="w-px h-6 bg-gray-300 mx-2" />

                  <button
                     onClick={() => setBreakpoint('desktop')}
                     className={`p-2 rounded ${breakpoint === 'desktop' ? 'bg-green-100 text-green-600' : 'text-gray-600 hover:bg-gray-100'}`}
                     title="Desktop (100%)"
                  >
                     <Monitor size={18} />
                  </button>
                  <button
                     onClick={() => setBreakpoint('tablet')}
                     className={`p-2 rounded ${breakpoint === 'tablet' ? 'bg-green-100 text-green-600' : 'text-gray-600 hover:bg-gray-100'}`}
                     title="Tablet Preview"
                  >
                     <Tablet size={18} />
                  </button>
                  <button
                     onClick={() => setBreakpoint('mobile')}
                     className={`p-2 rounded ${breakpoint === 'mobile' ? 'bg-green-100 text-green-600' : 'text-gray-600 hover:bg-gray-100'}`}
                     title="Mobile Preview"
                  >
                     <Smartphone size={18} />
                  </button>
               </div>

               <div className="flex items-center gap-2">
                  <label className="flex items-center gap-2 px-4 py-2 bg-gray-100 text-gray-700 rounded hover:bg-gray-200 cursor-pointer text-sm">
                     <Upload size={16} />
                     Import
                     <input type="file" accept=".html,.htm" onChange={importHTML} className="hidden" />
                  </label>
                  <button
                     onClick={exportCurrentPage}
                     className="flex items-center gap-2 px-4 py-2 bg-gray-100 text-gray-700 rounded hover:bg-gray-200 text-sm"
                     title="Export current page only"
                  >
                     <Download size={16} />
                     Page
                  </button>
                  <button
                     onClick={exportHTML}
                     className="flex items-center gap-2 px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600 text-sm"
                     title="Export all pages"
                  >
                     <Download size={16} />
                     Export All
                  </button>
               </div>
            </div>

            {/* Canvas - Vertical Scrolling Pages */}
            <div className="flex-1 overflow-auto bg-gray-300 p-6">
               <div className="flex flex-col items-center gap-8">
                  {pages.map((page, index) => (
                     <div key={page.id} className="relative">
                        {/* Page Label */}
                        <div className="absolute -top-6 left-0 flex items-center gap-2">
                           <span className="text-sm font-medium text-gray-600">
                              {page.name}
                           </span>
                           <span className="text-xs text-gray-400">
                              {page.width} x {page.height}
                           </span>
                           {pages.length > 1 && (
                              <button
                                 onClick={(e) => {
                                    e.stopPropagation();
                                    deletePage(index);
                                 }}
                                 className="p-1 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded"
                                 title="Delete page"
                              >
                                 <Trash2 size={14} />
                              </button>
                           )}
                           <button
                              onClick={(e) => {
                                 e.stopPropagation();
                                 duplicatePage(index);
                              }}
                              className="p-1 text-gray-400 hover:text-green-500 hover:bg-green-50 rounded"
                              title="Duplicate page"
                           >
                              <Copy size={14} />
                           </button>
                        </div>

                        {/* Page Canvas */}
                        <div
                           onClick={() => currentPageIndex !== index && setCurrentPageIndex(index)}
                           className={`bg-white shadow-lg rounded transition-all ${currentPageIndex === index
                              ? 'ring-2 ring-green-500 ring-offset-2'
                              : 'cursor-pointer hover:ring-2 hover:ring-gray-300 hover:ring-offset-2'
                              }`}
                           style={{
                              width: page.width,
                              minHeight: page.height,
                              overflow: 'visible',
                           }}
                        >
                           {currentPageIndex === index ? (
                              <>
                                 {draggedComponent && (
                                    <div className="bg-green-50 border border-green-300 p-3 text-center text-sm text-green-700 rounded-t">
                                       <GripVertical className="inline mr-2" size={16} />
                                       Dragging <strong>{draggedComponent.label}</strong> - Drop into container
                                    </div>
                                 )}
                                 <div
                                    key={`editor-${page.id}`}
                                    ref={containerRef}
                                    onClick={(e) => e.stopPropagation()}
                                    onDragOver={(e) => e.stopPropagation()}
                                    onDrop={(e) => e.stopPropagation()}
                                    style={{
                                       width: '100%',
                                       minHeight: page.height,
                                       overflow: 'visible',
                                       // paddingTop: '40px',
                                    }}
                                 />
                              </>
                           ) : (
                              /* Preview for non-active pages */
                              <div
                                 className="pointer-events-none opacity-90"
                                 style={{
                                    width: '100%',
                                    minHeight: page.height,
                                    overflow: 'hidden',
                                 }}
                                 dangerouslySetInnerHTML={{ __html: page.html }}
                              />
                           )}
                        </div>
                     </div>
                  ))}

                  {/* Add Page Button */}
                  <button
                     onClick={addPage}
                     className="flex items-center gap-2 px-6 py-3 border border-dashed border-gray-400 rounded-lg text-gray-500 hover:border-green-500 hover:text-green-600 hover:bg-green-50 transition-colors"
                  >
                     <Plus size={20} />
                     Add New Page
                  </button>
               </div>
            </div>
         </div>

         {/* Right Sidebar - Settings */}
         <div className={`bg-white border-l transition-all duration-300 ${selectedXPath ? 'w-72' : 'w-0'} overflow-hidden`}>
            {selectedXPath && elementInfo && (
               <SettingsPanel
                  elementInfo={elementInfo}
                  onUpdateContent={updateContent}
                  onUpdateStyle={updateStyle}
                  onUpdateAttribute={updateAttribute}
                  onUpdateCustomCss={updateCustomCss}
                  onDelete={deleteElement}
                  onDuplicate={duplicateElement}
                  onClose={() => {
                     setSelectedXPath(null);
                     setSelectedElement(null);
                  }}
               />
            )}
         </div>
      </div>
   );
}
