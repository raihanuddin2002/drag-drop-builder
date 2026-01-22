import { AlignVerticalSpaceAround, Clock, Code, Image, Menu, Minus, Share2, Square, Table, Type, Video } from "lucide-react";
import { Block, EditorPage, PagePreset } from "./type";

export const NON_EDITABLE_TAGS = ['IMG', 'HR', 'BR', 'STYLE', 'SCRIPT', 'BODY', 'CANVAS', 'IFRAME', 'SPAN', 'B', 'I', 'STRONG', 'EM'];
export const CONTAINER_TAGS = ['DIV', 'SECTION', 'ARTICLE', 'HEADER', 'FOOTER', 'NAV', 'ASIDE', 'MAIN'];

export const RICH_TOOLBAR_FONT_FAMILIES = ['Arial', 'Helvetica', 'Times New Roman', 'Georgia', 'Verdana', 'Courier New', 'Trebuchet MS', 'Impact'];
export const RICH_TOOLBAR_FONT_SIZES = ['8px', '10px', '12px', '14px', '16px', '18px', '20px', '24px', '28px', '32px', '36px'];

// ============================================
// INITIAL HTML
// ============================================
export const INITIAL_PAGE_HTML = (currentPage: Record<string, any>) => {
   const currentPageHeight = currentPage?.height?.value ? `${currentPage?.height?.value}${currentPage?.height?.unit}` : "100%"
   const style = `width: 100%; height: ${currentPageHeight}; padding: 20px; background: white; border: 2px dashed #cbd5e1; border-radius: 4px;`

   return /* html */ `
      <div
         class="page-container"
         data-container="true"
         style=${style}
      >
      </div>
`
};

// ============================================
// PAGE PRESETS
// ============================================
export const PAGE_PRESETS: PagePreset[] = [
   { key: "full_size", name: 'Full Size', width: { value: 100, unit: '%' }, height: { value: 100, unit: 'vh' }, show: true },
   { key: "letter", name: 'Letter (8.5" x 11")', width: { value: 816, unit: 'px' }, height: { value: 1056, unit: 'px' }, show: true },
   { key: "legal", name: 'Legal (8.5" x 14")', width: { value: 816, unit: 'px' }, height: { value: 1344, unit: 'px' }, show: true },
   { key: "a4", name: 'A4', width: { value: 794, unit: 'px' }, height: { value: 1123, unit: 'px' }, default: true, show: true },
   { key: "tabloid", name: 'Tabloid (11" x 17")', width: { value: 1056, unit: 'px' }, height: { value: 1632, unit: 'px' }, show: true },
   { key: "instagram_post", name: 'Instagram Post', width: { value: 1080, unit: 'px' }, height: { value: 1080, unit: 'px' }, show: false },
   { key: "instagram_story", name: 'Instagram Story', width: { value: 1080, unit: 'px' }, height: { value: 1920, unit: 'px' }, show: false },
   { key: "facebook_cover", name: 'Facebook Cover', width: { value: 820, unit: 'px' }, height: { value: 312, unit: 'px' }, show: false },
   { key: "presentation", name: 'Presentation (16:9)', width: { value: 1920, unit: 'px' }, height: { value: 1080, unit: 'px' }, show: false },
];

// Helper to wrap page content in full HTML document for export
export const wrapPageInDocument = (page: EditorPage, styles: string = ''): string => /* html */`
<!DOCTYPE html>
   <html>
      <head>
         <meta charset="UTF-8">
         <meta name="viewport" content="width=device-width, initial-scale=1.0">
         <style>
            * {
               box-sizing: border-box; 
            }
            body { 
               margin: 0; 
               padding: 0; 
                  font-family: system-ui, sans-serif; 
                  background: #f5f5f5; 
               }
               .page-container {
                  width: ${page.width.value}${page.width.unit};
                  min-height: ${page.height.value}${page.height.unit};
                  margin: 0 auto;
                  background: white;
               }
               ${styles}
            </style>
         </head>
         <body>
            ${page.html}
         </body>
      </html>
   `;

// ============================================
// WIDGET DEFINITIONS
// ============================================

export const COMPONENT_BLOCKS: Block[] = [
   {
      id: 'heading',
      label: 'Heading',
      icon: <Type size={20} />,
      category: 'blocks',
      html: /* html */`<h2 style='color: #333; margin: 0;'><br></h2>`
   },
   {
      id: 'text',
      label: 'Text',
      icon: <Type size={20} />,
      category: 'blocks',
      html: /* html */`<p style='margin: 0px;'><br></p>`
   },
   {
      id: 'button',
      label: 'Button',
      icon: <Square size={20} />,
      category: 'blocks',
      html: /* html */`
         <a
            href="#"
            style='display: inline-block; padding: 12px 30px; background: #3b82f6; color: white; text-decoration: none; border-radius: 4px; margin: 10px 0;'
         ><br></a>
      `
   },
   {
      id: 'image',
      label: 'Image',
      icon: <Image size={20} />,
      category: 'blocks',
      html: /* html */`
         <img 
            src="https://via.placeholder.com/600x300" 
            alt="Placeholder" 
            style="width: 100%; height: auto; display: block; margin: 15px 0;"
         />
      `
   },
   {
      id: 'divider',
      label: 'Divider',
      icon: <Minus size={20} />,
      category: 'blocks',
      html: /* html */`<div class='editor-divider' style='border: none; height:2px; background: #e5e7eb; margin: 30px 0;'></div> `
   },
   {
      id: 'spacer',
      label: 'Spacer',
      icon: <AlignVerticalSpaceAround size={20} />,
      category: 'blocks',
      html: /* html */`<div data-element-type='spacer' style='height: 40px;'></div>`
   },
   {
      id: 'table',
      label: 'Table',
      icon: <Table size={20} />,
      category: 'blocks',
      html: '__TABLE_PLACEHOLDER__' // Special marker - will be replaced with actual table after size selection
   },
   // {
   //    id: 'video',
   //    label: 'Video',
   //    icon: <Video size={20} />,
   //    category: 'blocks',
   //    html: /* html */`<div style='background: #f0f0f0; padding: 40px; text-align: center; margin: 15px 0; border-radius: 4px;'>Video Placeholder - Add embed code</div > `
   // },
   // {
   //    id: 'social',
   //    label: 'Social',
   //    icon: <Share2 size={20} />,
   //    category: 'blocks',
   //    html: /* html */`<div style='text-align: center; padding: 15px; margin: 15px 0;'>Social Icons Placeholder</div > `
   // },
   // {
   //    id: 'timer',
   //    label: 'Timer',
   //    icon: <Clock size={20} />,
   //    category: 'blocks',
   //    html: /* html */`<div style='text-align: center; padding: 20px; background: #f9fafb; margin: 15px 0; border-radius: 4px;'>Timer Widget Placeholder</div > `
   // },
   // {
   //    id: 'menu',
   //    label: 'Menu',
   //    icon: <Menu size={20} />,
   //    category: 'blocks',
   //    html: /* html */`<div style='text-align: center; padding: 15px; margin: 15px 0;'>Menu Widget Placeholder</div > `
   // },
   // {
   //    id: 'html',
   //    label: 'HTML',
   //    icon: <Code size={20} />,
   //    category: 'blocks',
   //    html: /* html */`<div data-html-block='true' style='padding: 15px; background: #f5f5f5; margin: 15px 0; font-family: monospace; border-radius: 4px;'>Custom HTML Block</div > `
   // },
];

export const CONTAINER_LAYOUT_BLOCKS: Block[] = [
   {
      id: '1col',
      label: '1 Column',
      icon: <Square size={20} />,
      category: 'container',
      html: /* html */`
            <div style='display: flex; margin:10px 0;' data-column-container='true'>
                <div class='drop-zone' style='flex: 1; min-height: 100px;'></div>
            </div>
        `
   },
   {
      id: '2col',
      label: '2 Columns',
      icon: <Square size={20} />,
      category: 'container',
      html: /* html */`
         <div style='display: flex; margin:10px 0;' data-column-container='true'>
            <div class='drop-zone' style='flex: 1; min-height: 100px;'></div>
            <div class='drop-zone' style='flex: 1; min-height: 100px;'></div>
         </div>
      `
   },
   {
      id: '3col',
      label: '3 Columns',
      icon: <Square size={20} />,
      category: 'container',
      html: /* html */`
         <div style='display: flex; gap: 10px; margin: 10px 0;' data-column-container='true'>
            <div class='drop-zone' style='flex: 1; min-height: 100px;'></div>
            <div class='drop-zone' style='flex: 1; min-height: 100px;'></div>
            <div class='drop-zone' style='flex: 1; min-height: 100px;'></div>
         </div>
      `
   },
   {
      id: '4col',
      label: '4 Columns',
      icon: <Square size={20} />,
      category: 'container',
      html: /* html */`
         <div style='display: flex; margin: 0;' data-column-container='true'>
            <div class='drop-zone' style='flex: 1; min-height: 100px;'></div>
            <div class='drop-zone' style='flex: 1; min-height: 100px;'></div>
            <div class='drop-zone' style='flex: 1; min-height: 100px;'></div>
            <div class='drop-zone' style='flex: 1; min-height: 100px;'></div>
         </div>
      `
   },
   {
      id: '1-2col',
      label: '1:2 Ratio',
      icon: <Square size={20} />,
      category: 'container',
      html: /* html */`
         <div style='display: flex; margin: 0;' data-column-container='true'>
            <div class='drop-zone' style='flex: 1; min-height: 100px;'></div>
            <div class='drop-zone' style='flex: 2; min-height: 100px;'></div>
         </div>
      `
   },
   {
      id: '2-1col',
      label: '2:1 Ratio',
      icon: <Square size={20} />,
      category: 'container',
      html: /* html */`
         <div style='display: flex; margin:10px 0;' data-column-container='true'>
            <div class='drop-zone' style='flex: 2; min-height: 100px;'></div>
            <div class='drop-zone' style='flex: 1; min-height: 100px;'></div>
         </div>
      `
   },
];

// ============================================
// EDITOR STYLES (injected into shadow DOM)
// ============================================
export const EDITOR_STYLES = (data: Record<string, any> | null = null) => {
   const dropZoneOfPageHeight = data?.currentPageHeight?.value ? `${data?.currentPageHeight?.value}${data?.currentPageHeight?.unit}` : '100%';

   return  /* css */`
         /* Global box-sizing and overflow control */
         *, 
         *::before,
         *::after {
               box-sizing: border-box;
         }
         .shadow-root-container {
            width: 100%;
            height: ${dropZoneOfPageHeight};
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

         /* Ensure text content wraps properly */
         p, h1, h2, h3, h4, h5, h6, div, span, a {
            word-wrap: break-word;
            overflow-wrap: break-word;
         }

         [data-eid]:not([data-container="true"]):not(.drop-zone):not([data-column-container="true"]):not([data-table-container="true"]) {
            position: relative;
            max-width: 100%;
         }
         [data-eid]:not([data-container="true"]):not(.drop-zone):not([data-column-container="true"]):not([data-table-container="true"]):hover {
            outline: 2px solid #22c55e !important;
            outline-offset: 2px;
         }
         /* Prevent hover outline on elements inside column/table container */
         [data-column-container="true"] [data-eid]:hover,
         [data-table-container="true"] [data-eid]:hover,
         [data-table-container="true"] table,
         [data-table-container="true"] tr,
         [data-table-container="true"] td,
         [data-table-container="true"] th,
         [data-table-container="true"] table:hover,
         [data-table-container="true"] tr:hover,
         [data-table-container="true"] td:hover,
         [data-table-container="true"] th:hover {
            outline: none !important;
         }
         [data-selected="true"] {
            outline: 2px solid #22c55e !important;
            outline-offset: 2px;
         }
         /* Override: elements inside table container should not have selected outline */
         [data-table-container="true"] [data-selected="true"],
         [data-table-container="true"] table[data-selected="true"],
         [data-table-container="true"] tr[data-selected="true"],
         [data-table-container="true"] td[data-selected="true"],
         [data-table-container="true"] th[data-selected="true"] {
            outline: none !important;
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
            z-index: 1001;
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
         
         .drop-zone {
            transition: all 0.2s;
            position: relative;
         }
      
         .drop-zone.drag-over {
            border-color: #22c55e !important;
            background: rgba(34, 197, 94, 0.1) !important;
            border: 1px dashed #cbd5e1;
         }
         /* Drag-over state for containers */
         [data-container="true"].drag-over,
         [data-column-container="true"].drag-over {
            outline: 2px dashed #22c55e !important;
            outline-offset: 4px;
            background: rgba(34, 197, 94, 0.05) !important;
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
         /* Invisible hover bridge to reach toolbar */
         [data-column-container="true"]::before {
            content: '';
            position: absolute;
            top: -40px;
            left: 0;
            right: 0;
            height: 40px;
            width: 150px;
            pointer-events: auto;
         }
         [data-column-container="true"]:hover {
            outline: 2px solid #3b82f6;
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
            top: -35px !important;
            left: 10px !important;
            transform: none !important;
            z-index: 1000 !important;
            flex-shrink: 0 !important;
         }
         [data-column-container="true"] > .column-toolbar {
            display: none !important;
         }
         [data-column-container="true"]:hover > .column-toolbar,
         [data-column-container="true"][data-selected="true"] > .column-toolbar {
            display: flex !important;
         }

         /* Table container styling - same pattern as column-container */
         [data-table-container="true"] {
            transition: all 0.2s;
            position: relative;
         }
         /* Invisible hover bridge to reach toolbar */
         [data-table-container="true"]::before {
            content: '';
            position: absolute;
            top: -40px;
            left: 0;
            right: 0;
            height: 40px;
            width: 150px;
            pointer-events: auto;
         }
         [data-table-container="true"]:hover {
            outline: 2px solid #3b82f6;
            outline-offset: 4px;
         }
         [data-table-container="true"][data-selected="true"] {
            outline: 2px solid #3b82f6 !important;
            outline-offset: 4px;
         }
         /* Table container toolbar - blue theme, visible on hover */
         .table-toolbar {
            position: absolute !important;
            background: #3b82f6 !important;
            top: -35px !important;
            left: 10px !important;
            transform: none !important;
            z-index: 1000 !important;
            flex-shrink: 0 !important;
         }
         [data-table-container="true"] > .table-toolbar {
            display: none !important;
         }
         [data-table-container="true"]:hover > .table-toolbar,
         [data-table-container="true"][data-selected="true"] > .table-toolbar {
            display: flex !important;
         }
         [data-table-container="true"] td,
         [data-table-container="true"] th {
            position: relative;
         }
         [data-table-container="true"] td:focus,
         [data-table-container="true"] th:focus {
            outline: 2px solid #22c55e !important;
            outline-offset: -2px !important;
            background: rgba(34, 197, 94, 0.05) !important;
         }

         /* Overflow warning indicator for oversized elements */
         [data-overflow-warning="true"] {
            outline: 2px dashed #f59e0b !important;
            outline-offset: 2px;
            position: relative;
         }
         [data-overflow-warning="true"]::after {
            content: "Element exceeds page height";
            position: absolute;
            bottom: -24px;
            left: 0;
            font-size: 11px;
            color: #f59e0b;
            background: white;
            padding: 2px 8px;
            border-radius: 3px;
            box-shadow: 0 1px 3px rgba(0,0,0,0.1);
            white-space: nowrap;
            z-index: 1000;
         }

         /* Merge field token styling */
         .merge-field-token {
            background: linear-gradient(135deg, #dbeafe 0%, #e0e7ff 100%);
            color: #3730a3;
            padding: 1px 6px;
            border-radius: 4px;
            font-family: ui-monospace, SFMono-Regular, 'SF Mono', Menlo, Monaco, 'Courier New', monospace;
            font-size: 0.9em;
            border: 1px solid #a5b4fc;
            white-space: nowrap;
            cursor: default;
            user-select: all;
         }
         .merge-field-token:hover {
            background: linear-gradient(135deg, #bfdbfe 0%, #c7d2fe 100%);
            border-color: #818cf8;
         }
         /* Invalid merge field (not found in data) */
         .merge-field-token.invalid {
            background: linear-gradient(135deg, #fee2e2 0%, #fecaca 100%);
            color: #991b1b;
            border-color: #fca5a5;
         }
         .merge-field-token.invalid:hover {
            background: linear-gradient(135deg, #fecaca 0%, #fca5a5 100%);
         }

         /* Text and heading elements - maintain minimum size when empty */
         p[data-eid],
         h1[data-eid],
         h2[data-eid],
         h3[data-eid],
         h4[data-eid],
         h5[data-eid],
         h6[data-eid],
         a[data-eid] {
            min-height: 1.5em;
            min-width: 50px;
            display: block;
            position: relative;
         }

         /* Empty elements need a zero-width space for cursor positioning */
         p[data-empty="true"],
         h1[data-empty="true"],
         h2[data-empty="true"],
         h3[data-empty="true"],
         h4[data-empty="true"],
         h5[data-empty="true"],
         h6[data-empty="true"],
         a[data-empty="true"] {
            min-height: 1.5em;
         }

         /* Placeholder for empty text blocks - positioned absolutely to not block cursor */
         p[data-empty="true"]::before {
            content: 'Type your text here...';
            color: #9ca3af;
            font-style: italic;
            pointer-events: none;
            position: absolute;
            left: 0;
            top: 0;
            white-space: nowrap;
         }

         /* Placeholder for empty heading blocks */
         h1[data-empty="true"]::before,
         h2[data-empty="true"]::before,
         h3[data-empty="true"]::before,
         h4[data-empty="true"]::before,
         h5[data-empty="true"]::before,
         h6[data-empty="true"]::before {
            content: 'Type your heading here...';
            color: #9ca3af;
            font-style: italic;
            pointer-events: none;
            position: absolute;
            left: 0;
            top: 0;
            white-space: nowrap;
         }

         /* Placeholder for empty button/link blocks */
         a[data-empty="true"]::before {
            content: 'text...';
            color: rgba(255,255,255,0.7);
            font-style: italic;
            pointer-events: none;
            position: absolute;
            left: 50%;
            top: 50%;
            transform: translate(-50%, -50%);
            white-space: nowrap;
         }

         /* Placeholder for empty drop-zone containers - full design */
         .drop-zone:empty::after {
            display: grid;
            content: 'Drag & Drop content here';
            border: 1px dashed #00ab5552;
            font-weight: 600;
            border-radius: 6px;
            text-align: center;
            padding: 20px;
            font-family: Poppins, sans-serif;
            font-size: 11px;
            color: #647381;
            height: 100%;
            width: 100%;
            margin-inline: auto;
            justify-items: center;
            box-sizing: border-box;
            background-color: #00ab551f;
            align-items: center;
         }

         /* Placeholder for empty table cells */
         [data-table-container="true"] td:empty::after,
         [data-table-container="true"] th:empty::after {
            content: 'Type here...';
            color: #9ca3af;
            font-style: italic;
            pointer-events: none;
         }
    `
}