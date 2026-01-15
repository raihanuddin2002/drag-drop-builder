'use client'

import React, { useState, useRef, useEffect, useCallback, JSX } from 'react';
import { Trash2, GripVertical, Smartphone, Monitor, Download, Upload } from 'lucide-react';

interface Component {
    id: string;
    label: string;
    icon: string;
    html: string;
}

interface ElementStyles {
    [key: string]: string;
}

interface ElementInfo {
    tag: string;
    styles: ElementStyles;
    content: string;
    src: string;
    href: string;
}

type Viewport = 'desktop' | 'mobile';

const INITIAL_HTML: string = `<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<style>
* { box-sizing: border-box; }
body { margin: 0; padding: 20px; font-family: Arial, sans-serif; background: #f5f5f5; }
.email-container {
  max-width: 600px;
  margin: 0 auto;
  background: white;
  padding: 20px;
  min-height: 500px;
  border: 2px dashed #cbd5e1;
  border-radius: 4px;
}
</style>
</head>
<body>
<div class="email-container" data-container="true">
  <h1 style="text-align: center; color: #333; margin: 20px 0;">Welcome!</h1>
  <p style="color: #666; line-height: 1.6; margin: 15px 0;">Drag elements to reorder or add new ones from the sidebar.</p>
</div>
</body>
</html>`;

const COMPONENTS: Component[] = [
    { id: 'heading', label: 'Heading', icon: '📝', html: '<h2 style="color: #333; margin: 20px 0;">New Heading</h2>' },
    { id: 'text', label: 'Text', icon: '📄', html: '<p style="color: #666; line-height: 1.6; margin: 15px 0;">Add your text here.</p>' },
    { id: 'button', label: 'Button', icon: '🔘', html: '<a href="#" style="display: inline-block; padding: 12px 30px; background: #007bff; color: white; text-decoration: none; border-radius: 4px; margin: 10px 0;">Click Me</a>' },
    { id: 'image', label: 'Image', icon: '🖼️', html: '<img src="https://via.placeholder.com/600x300" alt="Placeholder" style="width: 100%; height: auto; display: block; margin: 15px 0;" />' },
    {
        id: '2col',
        label: '2 Columns',
        icon: '⬜⬜',
        html: '<div style="display: flex; gap: 15px; margin: 20px 0;" data-column-container="true"><div class="drop-zone" style="flex: 1; padding: 15px; background: #f9fafb; border: 2px dashed #cbd5e1; border-radius: 4px; min-height: 100px;"></div><div class="drop-zone" style="flex: 1; padding: 15px; background: #f9fafb; border: 2px dashed #cbd5e1; border-radius: 4px; min-height: 100px;"></div></div>'
    },
    {
        id: '3col',
        label: '3 Columns',
        icon: '⬜⬜⬜',
        html: '<div style="display: flex; gap: 10px; margin: 20px 0;" data-column-container="true"><div class="drop-zone" style="flex: 1; padding: 10px; background: #f9fafb; border: 2px dashed #cbd5e1; border-radius: 4px; min-height: 100px;"></div><div class="drop-zone" style="flex: 1; padding: 10px; background: #f9fafb; border: 2px dashed #cbd5e1; border-radius: 4px; min-height: 100px;"></div><div class="drop-zone" style="flex: 1; padding: 10px; background: #f9fafb; border: 2px dashed #cbd5e1; border-radius: 4px; min-height: 100px;"></div></div>'
    },
    { id: 'divider', label: 'Divider', icon: '➖', html: '<hr style="border: none; border-top: 2px solid #e5e7eb; margin: 30px 0;" />' },
    { id: 'spacer', label: 'Spacer', icon: '⬜', html: '<div style="height: 40px;"></div>' },
];

const EDITOR_STYLES = `
  [data-xpath]:not([data-container="true"]):not(.drop-zone) {
    cursor: move;
    position: relative;
    transition: outline 0.15s ease, background 0.15s ease;
  }
  [data-xpath]:not([data-container="true"]):not(.drop-zone):hover {
    outline: 2px dashed #3b82f6 !important;
    outline-offset: 2px;
  }
  [data-selected="true"] {
    outline: 2px solid #10b981 !important;
    outline-offset: 2px;
    background: rgba(16, 185, 129, 0.05) !important;
  }
  .drop-zone {
    min-height: 80px;
    border: 2px dashed #cbd5e1;
    padding: 10px;
    transition: all 0.2s;
    position: relative;
  }
  .drop-zone:hover {
    border-color: #3b82f6;
    background: rgba(59, 130, 246, 0.05);
  }
  .drop-zone.drag-over {
    border-color: #10b981 !important;
    background: rgba(16, 185, 129, 0.1) !important;
  }
  .drop-indicator {
    height: 4px;
    background: #10b981;
    margin: 2px 0;
    border-radius: 2px;
    pointer-events: none;
    box-shadow: 0 0 4px rgba(16, 185, 129, 0.5);
  }
  .dragging {
    opacity: 0.4;
  }
  [data-column-container="true"] {
    transition: all 0.2s;
  }
`;

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

// Extract body content from full HTML
const extractBodyContent = (html: string): string => {
    const match = html.match(/<body[^>]*>([\s\S]*)<\/body>/i);
    return match ? match[1] : html;
};

// Extract styles from full HTML
const extractStyles = (html: string): string => {
    const styleMatches = html.match(/<style[^>]*>([\s\S]*?)<\/style>/gi);
    if (!styleMatches) return '';
    return styleMatches.map(s => {
        const content = s.match(/<style[^>]*>([\s\S]*?)<\/style>/i);
        return content ? content[1] : '';
    }).join('\n');
};

export default function EmailEditor(): JSX.Element {
    const [html, setHtml] = useState<string>(INITIAL_HTML);
    const [selectedXPath, setSelectedXPath] = useState<string | null>(null);
    const [selectedElement, setSelectedElement] = useState<HTMLElement | null>(null);
    const [viewport, setViewport] = useState<Viewport>('desktop');
    const [draggedComponent, setDraggedComponent] = useState<Component | null>(null);

    const containerRef = useRef<HTMLDivElement>(null);
    const shadowRootRef = useRef<ShadowRoot | null>(null);
    const draggedElementRef = useRef<HTMLElement | null>(null);

    // Initialize shadow DOM
    useEffect(() => {
        if (!containerRef.current) return;

        if (!shadowRootRef.current) {
            shadowRootRef.current = containerRef.current.attachShadow({ mode: 'open' });
        }
    }, []);

    // Render content into shadow DOM
    useEffect(() => {
        const shadow = shadowRootRef.current;
        if (!shadow) return;

        // Extract and render content
        const bodyContent = extractBodyContent(html);
        const userStyles = extractStyles(html);

        shadow.innerHTML = `
            <style>${userStyles}</style>
            <style>${EDITOR_STYLES}</style>
            <div class="shadow-root-container">${bodyContent}</div>
        `;

        const rootContainer = shadow.querySelector('.shadow-root-container');
        if (!rootContainer) return;

        // Add XPath data attributes to all elements
        const addXPathData = (el: Element, root: HTMLElement): void => {
            if (el.nodeType !== 1) return;
            if (el.tagName !== 'SCRIPT' && el.tagName !== 'STYLE' && !el.classList.contains('shadow-root-container')) {
                const xpath = generateXPath(el as HTMLElement, root);
                el.setAttribute('data-xpath', xpath);

                if (!el.hasAttribute('data-container') && !el.classList.contains('drop-zone')) {
                    el.setAttribute('draggable', 'true');
                }
            }
            Array.from(el.children).forEach(child => addXPathData(child, root));
        };
        addXPathData(rootContainer, rootContainer as HTMLElement);

        // Click handler for selection
        const handleClick = (e: Event) => {
            const mouseEvent = e as MouseEvent;
            mouseEvent.preventDefault();
            mouseEvent.stopPropagation();
            const target = mouseEvent.target as HTMLElement;

            if (target.hasAttribute('data-container') ||
                target.classList.contains('drop-zone') ||
                target.classList.contains('drop-indicator') ||
                target.classList.contains('shadow-root-container')) {
                setSelectedXPath(null);
                setSelectedElement(null);
                return;
            }

            const xpath = target.getAttribute('data-xpath');
            if (xpath) {
                setSelectedXPath(xpath);
                setSelectedElement(target);
            }
        };

        rootContainer.addEventListener('click', handleClick);

        // Setup draggable elements
        const allDraggables = shadow.querySelectorAll('[draggable="true"]');

        allDraggables.forEach((element) => {
            const el = element as HTMLElement;

            const handleDragStart = (e: DragEvent) => {
                e.stopPropagation();
                draggedElementRef.current = el;
                el.classList.add('dragging');
                if (e.dataTransfer) {
                    e.dataTransfer.effectAllowed = 'move';
                    e.dataTransfer.setData('text/plain', 'element');
                }
            };

            const handleDragEnd = () => {
                el.classList.remove('dragging');
                shadow.querySelectorAll('.drop-indicator').forEach(ind => ind.remove());
                shadow.querySelectorAll('.drag-over').forEach(zone => zone.classList.remove('drag-over'));
                draggedElementRef.current = null;
            };

            const handleDragOver = (e: DragEvent) => {
                e.preventDefault();
                e.stopPropagation();

                const dragged = draggedElementRef.current;
                if (!dragged || dragged === el || el.contains(dragged)) return;
                if (draggedComponent) return; // New component, not reordering

                shadow.querySelectorAll('.drop-indicator').forEach(ind => ind.remove());

                const rect = el.getBoundingClientRect();
                const mouseY = e.clientY;
                const elementMiddle = rect.top + rect.height / 2;

                const indicator = document.createElement('div');
                indicator.className = 'drop-indicator';

                if (mouseY < elementMiddle) {
                    el.parentNode?.insertBefore(indicator, el);
                } else {
                    el.parentNode?.insertBefore(indicator, el.nextSibling);
                }
            };

            const handleDrop = (e: DragEvent) => {
                e.preventDefault();
                e.stopPropagation();

                const dragged = draggedElementRef.current;
                if (!dragged || dragged === el || el.contains(dragged)) return;

                const rect = el.getBoundingClientRect();
                const mouseY = e.clientY;
                const elementMiddle = rect.top + rect.height / 2;

                if (mouseY < elementMiddle) {
                    el.parentNode?.insertBefore(dragged, el);
                } else {
                    el.parentNode?.insertBefore(dragged, el.nextSibling);
                }

                shadow.querySelectorAll('.drop-indicator').forEach(ind => ind.remove());
                updateHtmlFromShadow();
            };

            el.addEventListener('dragstart', handleDragStart);
            el.addEventListener('dragend', handleDragEnd);
            el.addEventListener('dragover', handleDragOver);
            el.addEventListener('drop', handleDrop);
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
                    // Adding new component from sidebar
                    zoneEl.insertAdjacentHTML('beforeend', draggedComponent.html);
                    setDraggedComponent(null);
                    updateHtmlFromShadow();
                } else if (draggedElementRef.current) {
                    // Moving existing element to different container
                    // Check: don't allow dropping parent into its own child
                    const dragged = draggedElementRef.current;
                    if (!zoneEl.contains(dragged) && !dragged.contains(zoneEl)) {
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
        };
    }, [html, draggedComponent]);

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

    // Build full HTML from shadow DOM content
    const updateHtmlFromShadow = useCallback(() => {
        const shadow = shadowRootRef.current;
        if (!shadow) return;

        const container = shadow.querySelector('.shadow-root-container');
        if (!container) return;

        // Clone and clean up
        const clone = container.cloneNode(true) as HTMLElement;
        clone.querySelectorAll('[data-xpath]').forEach(el => {
            el.removeAttribute('data-xpath');
            el.removeAttribute('data-selected');
            el.removeAttribute('draggable');
        });
        clone.querySelectorAll('.drop-indicator').forEach(el => el.remove());

        // Rebuild full HTML
        const userStyles = extractStyles(html);
        const newHtml = `<!DOCTYPE html>
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
</html>`;

        setHtml(newHtml);
    }, [html]);

    const updateContent = (value: string): void => {
        const shadow = shadowRootRef.current;
        if (!selectedElement || !shadow) return;

        const el = shadow.querySelector(`[data-xpath="${selectedXPath}"]`) as HTMLElement;
        if (el) {
            if (el.tagName === 'IMG') {
                (el as HTMLImageElement).src = value;
            } else {
                el.textContent = value;
            }
            updateHtmlFromShadow();
        }
    };

    const updateStyle = (prop: string, value: string): void => {
        const shadow = shadowRootRef.current;
        if (!selectedElement || !shadow) return;

        const el = shadow.querySelector(`[data-xpath="${selectedXPath}"]`) as HTMLElement;
        if (el) {
            (el.style as any)[prop] = value;
            updateHtmlFromShadow();
        }
    };

    const updateAttribute = (attr: string, value: string): void => {
        const shadow = shadowRootRef.current;
        if (!selectedElement || !shadow) return;

        const el = shadow.querySelector(`[data-xpath="${selectedXPath}"]`) as HTMLElement;
        if (el) {
            el.setAttribute(attr, value);
            updateHtmlFromShadow();
        }
    };

    const deleteElement = (): void => {
        const shadow = shadowRootRef.current;
        if (!selectedElement || !shadow) return;

        const el = shadow.querySelector(`[data-xpath="${selectedXPath}"]`) as HTMLElement;
        if (el && !el.hasAttribute('data-container')) {
            el.remove();
            updateHtmlFromShadow();
            setSelectedXPath(null);
            setSelectedElement(null);
        }
    };

    const handleSidebarDragStart = (e: React.DragEvent<HTMLDivElement>, component: Component): void => {
        setDraggedComponent(component);
        e.dataTransfer.effectAllowed = 'copy';
        e.dataTransfer.setData('text/plain', 'component');
    };

    const handleSidebarDragEnd = (): void => {
        setDraggedComponent(null);
        const shadow = shadowRootRef.current;
        if (shadow) {
            shadow.querySelectorAll('.drag-over').forEach(zone => zone.classList.remove('drag-over'));
        }
    };

    const exportHTML = (): void => {
        const parser = new DOMParser();
        const doc = parser.parseFromString(html, 'text/html');

        doc.querySelectorAll('[data-xpath]').forEach(el => {
            el.removeAttribute('data-xpath');
            el.removeAttribute('data-selected');
            el.removeAttribute('draggable');
        });

        const cleanHTML = '<!DOCTYPE html>\n' + doc.documentElement.outerHTML;
        const blob = new Blob([cleanHTML], { type: 'text/html' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'email-template.html';
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
                setHtml(content);
                setSelectedXPath(null);
                setSelectedElement(null);
            }
        };
        reader.readAsText(file);
        e.target.value = '';
    };

    const getElementInfo = (): ElementInfo | null => {
        if (!selectedElement) return null;
        const styles = parseStyles(selectedElement.getAttribute('style') || '');
        const tag = selectedElement.tagName.toLowerCase();
        const content = selectedElement.textContent || '';
        const src = selectedElement.getAttribute('src') || '';
        const href = selectedElement.getAttribute('href') || '';
        return { tag, styles, content, src, href };
    };

    const elementInfo = getElementInfo();

    return (
        <div className="flex h-screen bg-gray-100">
            {/* Left Sidebar */}
            <div className="w-80 bg-white shadow-lg flex flex-col overflow-hidden">
                {selectedElement ? (
                    <div className="flex-1 overflow-y-auto">
                        <div className="p-4 border-b bg-gray-50">
                            <div className="flex items-center justify-between mb-2">
                                <h3 className="font-semibold text-gray-800">Edit Element</h3>
                                <button onClick={() => { setSelectedXPath(null); setSelectedElement(null); }} className="text-gray-500 hover:text-gray-700">✕</button>
                            </div>
                            <p className="text-xs text-gray-500">{elementInfo?.tag.toUpperCase()}</p>
                        </div>

                        <div className="p-4 space-y-4">
                            {elementInfo && elementInfo.tag !== 'img' && elementInfo.tag !== 'hr' && elementInfo.tag !== 'div' && (
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        {elementInfo.tag === 'a' ? 'Button Text' : 'Content'}
                                    </label>
                                    <textarea value={elementInfo.content || ''} onChange={(e) => updateContent(e.target.value)} className="w-full px-3 py-2 border rounded-md text-sm" rows={3} />
                                </div>
                            )}

                            {elementInfo?.tag === 'img' && (
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Image URL</label>
                                    <input type="text" value={elementInfo.src || ''} onChange={(e) => updateAttribute('src', e.target.value)} className="w-full px-3 py-2 border rounded-md text-sm" />
                                </div>
                            )}

                            {elementInfo?.tag === 'a' && (
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Link URL</label>
                                    <input type="text" value={elementInfo.href || ''} onChange={(e) => updateAttribute('href', e.target.value)} className="w-full px-3 py-2 border rounded-md text-sm" />
                                </div>
                            )}

                            {elementInfo && (
                                <div className="border-t pt-4">
                                    <h4 className="font-medium text-gray-700 mb-3">Styles</h4>

                                    <div className="mb-3">
                                        <label className="block text-xs text-gray-600 mb-1">Width</label>
                                        <input type="text" value={elementInfo.styles.width || ''} onChange={(e) => updateStyle('width', e.target.value)} placeholder="auto, 100%, 300px" className="w-full px-2 py-1.5 border rounded text-sm" />
                                    </div>

                                    <div className="mb-3">
                                        <label className="block text-xs text-gray-600 mb-1">Color</label>
                                        <div className="flex gap-2">
                                            <input type="color" value={elementInfo.styles.color || '#000000'} onChange={(e) => updateStyle('color', e.target.value)} className="w-12 h-8 border rounded cursor-pointer" />
                                            <input type="text" value={elementInfo.styles.color || ''} onChange={(e) => updateStyle('color', e.target.value)} placeholder="#000000" className="flex-1 px-2 py-1.5 border rounded text-sm" />
                                        </div>
                                    </div>

                                    <div className="mb-3">
                                        <label className="block text-xs text-gray-600 mb-1">Background</label>
                                        <div className="flex gap-2">
                                            <input type="color" value={elementInfo.styles.background || elementInfo.styles.backgroundColor || '#ffffff'} onChange={(e) => updateStyle('background', e.target.value)} className="w-12 h-8 border rounded cursor-pointer" />
                                            <input type="text" value={elementInfo.styles.background || elementInfo.styles.backgroundColor || ''} onChange={(e) => updateStyle('background', e.target.value)} placeholder="transparent" className="flex-1 px-2 py-1.5 border rounded text-sm" />
                                        </div>
                                    </div>

                                    <div className="mb-3">
                                        <label className="block text-xs text-gray-600 mb-1">Font Size</label>
                                        <input type="text" value={elementInfo.styles.fontSize || ''} onChange={(e) => updateStyle('fontSize', e.target.value)} placeholder="16px, 1.5rem" className="w-full px-2 py-1.5 border rounded text-sm" />
                                    </div>

                                    <div className="mb-3">
                                        <label className="block text-xs text-gray-600 mb-1">Font Weight</label>
                                        <select value={elementInfo.styles.fontWeight || 'normal'} onChange={(e) => updateStyle('fontWeight', e.target.value)} className="w-full px-2 py-1.5 border rounded text-sm">
                                            <option value="normal">Normal</option>
                                            <option value="bold">Bold</option>
                                            <option value="100">100</option>
                                            <option value="300">300</option>
                                            <option value="500">500</option>
                                            <option value="700">700</option>
                                            <option value="900">900</option>
                                        </select>
                                    </div>

                                    <div className="mb-3">
                                        <label className="block text-xs text-gray-600 mb-1">Text Align</label>
                                        <div className="flex gap-1">
                                            {(['left', 'center', 'right', 'justify'] as const).map(align => (
                                                <button key={align} onClick={() => updateStyle('textAlign', align)} className={`flex-1 px-2 py-1.5 border rounded text-xs ${elementInfo.styles.textAlign === align ? 'bg-blue-500 text-white' : 'bg-white'}`}>
                                                    {align[0].toUpperCase()}
                                                </button>
                                            ))}
                                        </div>
                                    </div>

                                    <div className="mb-3">
                                        <label className="block text-xs text-gray-600 mb-1">Padding</label>
                                        <input type="text" value={elementInfo.styles.padding || ''} onChange={(e) => updateStyle('padding', e.target.value)} placeholder="10px, 10px 20px" className="w-full px-2 py-1.5 border rounded text-sm" />
                                    </div>

                                    <div className="mb-3">
                                        <label className="block text-xs text-gray-600 mb-1">Margin</label>
                                        <input type="text" value={elementInfo.styles.margin || ''} onChange={(e) => updateStyle('margin', e.target.value)} placeholder="10px, 10px 20px" className="w-full px-2 py-1.5 border rounded text-sm" />
                                    </div>

                                    <div className="mb-3">
                                        <label className="block text-xs text-gray-600 mb-1">Border Radius</label>
                                        <input type="text" value={elementInfo.styles.borderRadius || ''} onChange={(e) => updateStyle('borderRadius', e.target.value)} placeholder="0px, 5px" className="w-full px-2 py-1.5 border rounded text-sm" />
                                    </div>
                                </div>
                            )}

                            <button onClick={deleteElement} className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-red-500 text-white rounded-md hover:bg-red-600">
                                <Trash2 size={16} />
                                Delete Element
                            </button>
                        </div>
                    </div>
                ) : (
                    <div className="flex-1 overflow-y-auto">
                        <div className="p-4 border-b bg-gray-50">
                            <h3 className="font-semibold text-gray-800">Components</h3>
                            <p className="text-xs text-gray-500 mt-1">Drag to canvas to add or reorder</p>
                        </div>
                        <div className="p-4 grid grid-cols-2 gap-3">
                            {COMPONENTS.map(comp => (
                                <div
                                    key={comp.id}
                                    draggable
                                    onDragStart={(e) => handleSidebarDragStart(e, comp)}
                                    onDragEnd={handleSidebarDragEnd}
                                    className="flex flex-col items-center justify-center p-4 bg-white border-2 border-gray-200 rounded-lg cursor-move hover:border-blue-400 hover:shadow-md transition select-none"
                                >
                                    <span className="text-2xl mb-1">{comp.icon}</span>
                                    <span className="text-xs font-medium text-gray-700">{comp.label}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </div>

            {/* Main Canvas */}
            <div className="flex-1 flex flex-col">
                <div className="bg-white shadow-sm border-b p-3 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <button onClick={() => setViewport('desktop')} className={`p-2 rounded ${viewport === 'desktop' ? 'bg-blue-100 text-blue-600' : 'text-gray-600 hover:bg-gray-100'}`} title="Desktop View">
                            <Monitor size={20} />
                        </button>
                        <button onClick={() => setViewport('mobile')} className={`p-2 rounded ${viewport === 'mobile' ? 'bg-blue-100 text-blue-600' : 'text-gray-600 hover:bg-gray-100'}`} title="Mobile View">
                            <Smartphone size={20} />
                        </button>
                    </div>

                    <div className="flex items-center gap-2">
                        <label className="flex items-center gap-2 px-4 py-2 bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200 cursor-pointer">
                            <Upload size={16} />
                            Import HTML
                            <input type="file" accept=".html,.htm" onChange={importHTML} className="hidden" />
                        </label>
                        <button onClick={exportHTML} className="flex items-center gap-2 px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600">
                            <Download size={16} />
                            Export HTML
                        </button>
                    </div>
                </div>

                <div className="flex-1 overflow-auto bg-gray-200 p-8">
                    <div className={`mx-auto bg-white shadow-lg rounded ${viewport === 'mobile' ? 'max-w-[375px]' : 'max-w-[800px]'} transition-all`}>
                        {draggedComponent && (
                            <div className="bg-blue-50 border border-blue-300 p-3 text-center text-sm text-blue-700 rounded-t">
                                <GripVertical className="inline mr-2" size={16} />
                                Dragging <strong>{draggedComponent.label}</strong> - Drop into container
                            </div>
                        )}
                        <div
                            ref={containerRef}
                            className="min-h-[600px]"
                            style={{ contain: 'layout' }}
                        />
                    </div>
                </div>
            </div>
        </div>
    );
}

