// ============================================
// ELEMENT BUILDER - RENDER ENGINE
// ============================================

import { BuilderElement, Breakpoint, EditorState } from './types';
import { getWidget, widgets } from './widgets';

// ============================================
// EDITOR STYLES (injected into shadow DOM)
// ============================================

export const EDITOR_STYLES = `
  /* Base element styles - no outline by default */
  [data-element-id] {
    position: relative;
    transition: all 0.15s ease;
    margin: 4px 0;
  }

  /* Only show outline on selected element */
  [data-element-id][data-selected="true"] {
    outline: 2px solid #3b82f6 !important;
    outline-offset: 2px;
  }

  /* Parent highlighted state - subtle dashed border */
  [data-element-id][data-parent-highlighted="true"] {
    outline: 2px dashed #94a3b8 !important;
    outline-offset: 4px;
  }

  /* Dragging state */
  [data-element-id][data-dragging="true"] {
    opacity: 0.5;
  }

  /* Element toolbar - positioned on RIGHT side */
  .element-toolbar {
    position: absolute;
    top: -32px;
    right: 0;
    display: none;
    align-items: center;
    gap: 2px;
    background: #3b82f6;
    border-radius: 4px;
    padding: 4px 6px;
    z-index: 1000;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
  }

  [data-element-id][data-selected="true"] > .element-toolbar {
    display: flex;
  }

  .element-toolbar-btn {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 24px;
    height: 24px;
    background: transparent;
    border: none;
    border-radius: 3px;
    cursor: pointer;
    color: white;
    transition: background 0.15s ease;
  }

  .element-toolbar-btn:hover {
    background: rgba(255, 255, 255, 0.2);
  }

  .element-toolbar-btn svg {
    width: 14px;
    height: 14px;
  }

  .element-toolbar-label {
    color: white;
    font-size: 11px;
    font-weight: 500;
    padding: 0 6px;
    border-right: 1px solid rgba(255, 255, 255, 0.3);
    margin-right: 2px;
    white-space: nowrap;
  }

  /* Parent toolbar - positioned on LEFT side */
  .parent-toolbar {
    position: absolute;
    top: -32px;
    left: 0;
    display: none;
    align-items: center;
    gap: 2px;
    background: #64748b;
    border-radius: 4px;
    padding: 4px 6px;
    z-index: 999;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
  }

  [data-element-id][data-parent-highlighted="true"] > .parent-toolbar {
    display: flex;
  }

  .parent-toolbar-label {
    color: white;
    font-size: 11px;
    font-weight: 500;
    padding: 0 6px;
    white-space: nowrap;
  }

  /* Drag handle - on left side, visible on hover or selection */
  .drag-handle {
    position: absolute;
    left: -28px;
    top: 50%;
    transform: translateY(-50%);
    width: 24px;
    height: 24px;
    display: none;
    align-items: center;
    justify-content: center;
    background: #64748b;
    border-radius: 4px;
    cursor: grab;
    color: white;
    z-index: 999;
  }

  .drag-handle svg {
    width: 14px;
    height: 14px;
  }

  [data-element-id]:hover > .drag-handle,
  [data-element-id][data-selected="true"] > .drag-handle {
    display: flex;
  }

  .drag-handle:active {
    cursor: grabbing;
    background: #475569;
  }

  /* Drop zone styles */
  [data-drop-zone="true"] {
    min-height: 60px;
    border: 2px dashed #d1d5db;
    border-radius: 4px;
    transition: all 0.2s;
    position: relative;
  }

  [data-drop-zone="true"]:empty::after {
    content: 'Drop elements here';
    position: absolute;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    color: #9ca3af;
    font-size: 14px;
    pointer-events: none;
  }

  [data-drop-zone="true"].drag-over {
    border-color: #3b82f6;
    background: rgba(59, 130, 246, 0.08);
    box-shadow: inset 0 0 20px rgba(59, 130, 246, 0.1);
  }

  /* Drop indicator - more prominent Elementor style */
  .drop-indicator {
    height: 4px;
    background: linear-gradient(90deg, #3b82f6, #60a5fa);
    border-radius: 2px;
    margin: 4px 0;
    pointer-events: none;
    box-shadow: 0 0 12px rgba(59, 130, 246, 0.6);
    animation: pulse-indicator 1s ease-in-out infinite;
  }

  @keyframes pulse-indicator {
    0%, 100% { opacity: 1; }
    50% { opacity: 0.7; }
  }

  /* Container styles - visible border */
  [data-container="true"] {
    min-height: 100px;
    border: 1px dashed #c7d2fe;
    border-radius: 4px;
    padding: 8px;
    background: rgba(199, 210, 254, 0.05);
  }

  [data-container="true"]:hover {
    border-color: #818cf8;
    background: rgba(129, 140, 248, 0.05);
  }

  [data-container="true"].drag-over {
    border-color: #3b82f6 !important;
    background: rgba(59, 130, 246, 0.1) !important;
    box-shadow: inset 0 0 30px rgba(59, 130, 246, 0.15);
  }

  /* Column drop zone - always visible */
  [data-column="true"] {
    min-height: 80px;
    border: 1px dashed #a5b4fc;
    border-radius: 4px;
    transition: all 0.2s;
    background: rgba(165, 180, 252, 0.05);
    padding: 8px;
  }

  [data-column="true"]:hover {
    border-color: #6366f1;
    background: rgba(99, 102, 241, 0.08);
  }

  [data-column="true"].drag-over {
    border-color: #3b82f6 !important;
    background: rgba(59, 130, 246, 0.12) !important;
    box-shadow: inset 0 0 20px rgba(59, 130, 246, 0.15);
  }

  /* Column container when dragging over */
  [data-columns].drag-over-container {
    background: rgba(59, 130, 246, 0.05);
    border-radius: 4px;
  }

  /* Empty column placeholder */
  [data-column="true"]:empty::after {
    content: '+ Drop widget';
    display: flex;
    align-items: center;
    justify-content: center;
    height: 100%;
    min-height: 60px;
    color: #9ca3af;
    font-size: 12px;
    pointer-events: none;
  }

  /* Prevent text selection while dragging */
  .is-dragging * {
    user-select: none;
  }

  /* Section/Row highlight during drag */
  .section-highlight {
    outline: 2px dashed #f59e0b !important;
    outline-offset: 4px;
    background: rgba(245, 158, 11, 0.05) !important;
  }
`;

// ============================================
// RENDER ELEMENT TO HTML
// ============================================

// SVG icons for toolbar
const TOOLBAR_ICONS = {
  drag: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="9" cy="5" r="1"/><circle cx="9" cy="12" r="1"/><circle cx="9" cy="19" r="1"/><circle cx="15" cy="5" r="1"/><circle cx="15" cy="12" r="1"/><circle cx="15" cy="19" r="1"/></svg>',
  duplicate: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>',
  delete: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/></svg>',
  moveUp: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 19V5M5 12l7-7 7 7"/></svg>',
  moveDown: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 5v14M5 12l7 7 7-7"/></svg>',
  select: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 3l7.07 16.97 2.51-7.39 7.39-2.51L3 3z"/></svg>',
};

// Generate element toolbar HTML - positioned on right side
const generateToolbar = (element: BuilderElement, widget: any): string => {
  return `
    <div class="element-toolbar">
      <span class="element-toolbar-label">${widget.label}</span>
      <button class="element-toolbar-btn" data-action="duplicate" data-target-id="${element.id}" title="Duplicate">${TOOLBAR_ICONS.duplicate}</button>
      <button class="element-toolbar-btn" data-action="delete" data-target-id="${element.id}" title="Delete">${TOOLBAR_ICONS.delete}</button>
    </div>
    <div class="drag-handle" draggable="true" title="Drag to move">${TOOLBAR_ICONS.drag}</div>
  `;
};

// Generate parent toolbar HTML - positioned on left side
const generateParentToolbar = (widget: any): string => {
  return `
    <div class="parent-toolbar">
      <span class="parent-toolbar-label">${widget.label}</span>
    </div>
  `;
};

export const renderElement = (
  element: BuilderElement,
  breakpoint: Breakpoint,
  isEditing: boolean = false
): string => {
  const widget = getWidget(element.type);
  if (!widget) return '';

  // Get base HTML from widget render function
  let html = widget.render(element, breakpoint);

  // If element has children, render them
  if (element.children && element.children.length > 0) {
    const childrenHtml = element.children
      .map((child) => renderElement(child, breakpoint, isEditing))
      .join('');
    html = html.replace('{{children}}', childrenHtml);
  } else if (html.includes('{{children}}')) {
    // Empty container
    html = html.replace('{{children}}', '');
  }

  // Add editor attributes if in editing mode
  if (isEditing) {
    // Wrap in a container with data attributes
    const isContainer = widget.isContainer;
    const attrs = [
      `data-element-id="${element.id}"`,
      `data-element-type="${element.type}"`,
      isContainer ? 'data-container="true"' : '',
      'draggable="true"',
    ].filter(Boolean).join(' ');

    // Generate toolbar HTML
    const toolbar = generateToolbar(element, widget);
    const parentToolbar = generateParentToolbar(widget);

    // Find the first tag and inject attributes and toolbar
    // Insert toolbar after the opening tag
    html = html.replace(/^<(\w+)([^>]*)>/, `<$1$2 ${attrs}>${toolbar}${parentToolbar}`);
  }

  return html;
};

// ============================================
// RENDER ALL ELEMENTS
// ============================================

export const renderElements = (
  elements: BuilderElement[],
  breakpoint: Breakpoint,
  isEditing: boolean = false
): string => {
  return elements
    .map((element) => renderElement(element, breakpoint, isEditing))
    .join('');
};

// ============================================
// RENDER FULL HTML DOCUMENT (for export)
// ============================================

export const renderFullHtml = (
  elements: BuilderElement[],
  globalStyles: EditorState['globalStyles'],
  breakpoint: Breakpoint = 'desktop'
): string => {
  const content = renderElements(elements, breakpoint, false);

  return `<!DOCTYPE html>
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
  padding: 20px;
  font-family: ${globalStyles.fontFamily || 'Arial, sans-serif'};
  background: ${globalStyles.bodyBackground || '#f5f5f5'};
}
.email-container {
  max-width: ${globalStyles.contentWidth || '600px'};
  margin: 0 auto;
  background: white;
  padding: 20px;
}
img {
  max-width: 100%;
  height: auto;
}
a {
  color: inherit;
}

/* Responsive */
@media (max-width: 768px) {
  body {
    padding: 10px;
  }
  .email-container {
    padding: 15px;
  }
}
</style>
</head>
<body>
<div class="email-container">
${content}
</div>
</body>
</html>`;
};

// ============================================
// RENDER FOR EDITOR (with shadow DOM styles)
// ============================================

export const renderForEditor = (
  elements: BuilderElement[],
  globalStyles: EditorState['globalStyles'],
  breakpoint: Breakpoint
): string => {
  const content = renderElements(elements, breakpoint, true);

  return `
<style>
* {
  box-sizing: border-box;
}
body, .editor-root {
  margin: 0;
  padding: 20px;
  font-family: ${globalStyles.fontFamily || 'Arial, sans-serif'};
  background: ${globalStyles.bodyBackground || '#f5f5f5'};
  min-height: 100%;
  width: 100%;
}
.email-container {
  // max-width: ${globalStyles.contentWidth || '600px'};
  width: 100%;
  margin: 0 auto;
  background: white;
  padding: 20px;
  height: 100%;
  border: 2px dashed #e5e7eb;
  border-radius: 4px;
}
.email-container:empty::after {
  content: 'Drag elements here to start building';
  display: block;
  text-align: center;
  color: #9ca3af;
  padding: 40px;
  font-size: 14px;
}
img {
  max-width: 100%;
  height: auto;
}
a {
  color: inherit;
}
</style>
<style>${EDITOR_STYLES}</style>
<div class="editor-root">
  <div class="email-container" data-drop-zone="true" data-root-container="true">
    ${content}
  </div>
</div>`;
};

// ============================================
// PARSE HTML TO ELEMENTS (for import)
// ============================================

// Helper to extract inline styles as object
const parseInlineStyles = (style: string | null): Record<string, string> => {
  if (!style) return {};
  const styles: Record<string, string> = {};
  style.split(';').forEach((rule) => {
    const [prop, val] = rule.split(':').map((s) => s.trim());
    if (prop && val) {
      // Convert kebab-case to camelCase
      const camelProp = prop.replace(/-([a-z])/g, (g) => g[1].toUpperCase());
      styles[camelProp] = val;
    }
  });
  return styles;
};

// Convert DOM node to BuilderElement
const nodeToElement = (node: Element): BuilderElement | null => {
  const tag = node.tagName.toLowerCase();
  const styles = parseInlineStyles(node.getAttribute('style'));
  const id = `el_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

  // Heading (h1-h6)
  if (/^h[1-6]$/.test(tag)) {
    return {
      id,
      type: 'heading',
      settings: {
        text: node.textContent || '',
        tag: tag as 'h1' | 'h2' | 'h3' | 'h4' | 'h5' | 'h6',
        color: styles.color,
        fontSize: styles.fontSize ? { desktop: styles.fontSize } : undefined,
        fontWeight: styles.fontWeight,
        textAlign: styles.textAlign ? { desktop: styles.textAlign as any } : undefined,
        margin: styles.margin,
        padding: styles.padding,
      },
    };
  }

  // Paragraph
  if (tag === 'p') {
    return {
      id,
      type: 'text',
      settings: {
        text: node.textContent || '',
        color: styles.color,
        fontSize: styles.fontSize ? { desktop: styles.fontSize } : undefined,
        fontWeight: styles.fontWeight,
        textAlign: styles.textAlign ? { desktop: styles.textAlign as any } : undefined,
        lineHeight: styles.lineHeight,
        margin: styles.margin,
        padding: styles.padding,
      },
    };
  }

  // Image
  if (tag === 'img') {
    const img = node as HTMLImageElement;
    return {
      id,
      type: 'image',
      settings: {
        src: img.getAttribute('src') || '',
        alt: img.getAttribute('alt') || '',
        width: styles.width ? { desktop: styles.width } : undefined,
        height: styles.height ? { desktop: styles.height } : undefined,
        margin: styles.margin,
        padding: styles.padding,
        borderRadius: styles.borderRadius,
      },
    };
  }

  // Link/Button (anchor tag)
  if (tag === 'a') {
    const anchor = node as HTMLAnchorElement;
    // Check if it looks like a button (has background color or padding)
    const isButton = styles.backgroundColor || styles.background ||
      (styles.padding && styles.display === 'inline-block');

    if (isButton) {
      return {
        id,
        type: 'button',
        settings: {
          text: node.textContent || '',
          url: anchor.getAttribute('href') || '#',
          target: (anchor.getAttribute('target') as '_self' | '_blank') || '_self',
          color: styles.color,
          backgroundColor: styles.backgroundColor || styles.background,
          fontSize: styles.fontSize ? { desktop: styles.fontSize } : undefined,
          fontWeight: styles.fontWeight,
          padding: styles.padding ? { desktop: styles.padding } : undefined,
          borderRadius: styles.borderRadius,
          margin: styles.margin,
        },
      };
    }
    // Regular link - treat as text with link
    return {
      id,
      type: 'html',
      settings: {
        rawHtml: node.outerHTML,
      },
    };
  }

  // Horizontal rule / Divider
  if (tag === 'hr') {
    return {
      id,
      type: 'divider',
      settings: {
        color: styles.borderColor || styles.borderTopColor,
        thickness: styles.borderWidth || styles.borderTopWidth,
        style: (styles.borderStyle || styles.borderTopStyle || 'solid') as 'solid' | 'dashed' | 'dotted',
        width: styles.width ? { desktop: styles.width } : undefined,
        margin: styles.margin,
      },
    };
  }

  // Div - check if it's a spacer or container
  if (tag === 'div') {
    const children = Array.from(node.children);

    // Empty div with height = spacer
    if (children.length === 0 && styles.height && !node.textContent?.trim()) {
      return {
        id,
        type: 'spacer',
        settings: {
          height: { desktop: styles.height },
        },
      };
    }

    // Flex container = columns layout
    if (styles.display === 'flex' && children.length > 0) {
      const columnElements = children
        .map((child) => {
          const childId = `el_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
          const childStyles = parseInlineStyles(child.getAttribute('style'));
          const grandChildren = parseChildNodes(child);

          return {
            id: childId,
            type: 'column' as const,
            settings: {
              padding: childStyles.padding,
              backgroundColor: childStyles.backgroundColor,
              width: childStyles.flex || childStyles.width ? { desktop: childStyles.width || 'auto' } : undefined,
            },
            children: grandChildren,
          };
        });

      return {
        id,
        type: 'columns',
        settings: {
          columns: children.length,
          gap: styles.gap ? { desktop: styles.gap } : undefined,
          margin: styles.margin,
          padding: styles.padding,
        },
        children: columnElements,
      };
    }

    // Div with children - parse recursively
    if (children.length > 0) {
      const childElements = parseChildNodes(node);
      if (childElements.length > 0) {
        // Return children directly if this is just a wrapper div
        if (childElements.length === 1) {
          return childElements[0];
        }
        // Multiple children - wrap in section or return as HTML
        return {
          id,
          type: 'html',
          settings: {
            rawHtml: node.outerHTML,
            margin: styles.margin,
            padding: styles.padding,
          },
        };
      }
    }

    // Div with text content
    if (node.textContent?.trim()) {
      return {
        id,
        type: 'text',
        settings: {
          text: node.textContent.trim(),
          color: styles.color,
          fontSize: styles.fontSize ? { desktop: styles.fontSize } : undefined,
          margin: styles.margin,
          padding: styles.padding,
        },
      };
    }
  }

  // Table - common in email templates, keep as raw HTML
  if (tag === 'table') {
    return {
      id,
      type: 'html',
      settings: {
        rawHtml: node.outerHTML,
      },
    };
  }

  // Script/Style - preserve as HTML
  if (tag === 'script' || tag === 'style') {
    return {
      id,
      type: 'html',
      settings: {
        rawHtml: node.outerHTML,
      },
    };
  }

  // Span with content - convert to text
  if (tag === 'span' && node.textContent?.trim()) {
    return {
      id,
      type: 'text',
      settings: {
        text: node.textContent.trim(),
        color: styles.color,
        fontSize: styles.fontSize ? { desktop: styles.fontSize } : undefined,
      },
    };
  }

  // Unknown element - wrap as raw HTML
  return {
    id,
    type: 'html',
    settings: {
      rawHtml: node.outerHTML,
    },
  };
};

// Parse all child nodes of a container
const parseChildNodes = (container: Element): BuilderElement[] => {
  const elements: BuilderElement[] = [];

  Array.from(container.childNodes).forEach((node) => {
    // Element nodes
    if (node.nodeType === 1) {
      const element = nodeToElement(node as Element);
      if (element) {
        elements.push(element);
      }
    }
    // Text nodes with content
    else if (node.nodeType === 3) {
      const text = node.textContent?.trim();
      if (text) {
        elements.push({
          id: `el_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
          type: 'text',
          settings: {
            text,
          },
        });
      }
    }
  });

  return elements;
};

// Main parser function
export const parseHtmlToElements = (html: string): BuilderElement[] => {
  // Create a DOM parser
  const parser = new DOMParser();
  const doc = parser.parseFromString(html, 'text/html');

  // Try to find the main content container
  const body = doc.body;

  // Look for common email container patterns
  const container =
    body.querySelector('.email-container') ||
    body.querySelector('[class*="container"]') ||
    body.querySelector('table[align="center"]') ||
    body.querySelector('center > table') ||
    body;

  // Parse the container's children
  const elements = parseChildNodes(container);

  // If no elements were parsed, wrap entire body as HTML
  if (elements.length === 0) {
    return [{
      id: `el_${Date.now()}_imported`,
      type: 'html',
      settings: {
        rawHtml: body.innerHTML.trim(),
      },
    }];
  }

  return elements;
};

// ============================================
// FIND ELEMENT BY ID IN TREE
// ============================================

export const findElementById = (
  elements: BuilderElement[],
  id: string
): BuilderElement | null => {
  for (const el of elements) {
    if (el.id === id) return el;
    if (el.children) {
      const found = findElementById(el.children, id);
      if (found) return found;
    }
  }
  return null;
};

// ============================================
// GET ELEMENT PATH (for breadcrumb)
// ============================================

export const getElementPath = (
  elements: BuilderElement[],
  id: string,
  path: BuilderElement[] = []
): BuilderElement[] | null => {
  for (const el of elements) {
    if (el.id === id) {
      return [...path, el];
    }
    if (el.children) {
      const found = getElementPath(el.children, id, [...path, el]);
      if (found) return found;
    }
  }
  return null;
};
