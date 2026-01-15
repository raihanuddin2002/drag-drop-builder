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
} from 'lucide-react';

// ============================================
// TYPES
// ============================================

type Breakpoint = 'desktop' | 'tablet' | 'mobile';

interface ElementSettings {
    // Content
    text?: string;
    tag?: string;
    src?: string;
    alt?: string;
    href?: string;
    // Style
    color?: string;
    backgroundColor?: string;
    fontSize?: string | Record<Breakpoint, string>;
    fontFamily?: string;
    fontWeight?: string;
    textAlign?: string | Record<Breakpoint, string>;
    lineHeight?: string;
    padding?: string;
    margin?: string;
    borderRadius?: string;
    border?: string;
    width?: string;
    height?: string;
    // Advanced
    customClass?: string;
    customId?: string;
    customCss?: string;
    // Layout
    columns?: number;
    columnGap?: string;
}

interface BuilderElement {
    id: string;
    type: string;
    settings: ElementSettings;
    children?: BuilderElement[];
}

// ============================================
// UTILITY FUNCTIONS
// ============================================

const generateId = () => Math.random().toString(36).substring(2, 11);

const getResponsiveValue = (value: any, breakpoint: Breakpoint, defaultValue: string = '') => {
    if (typeof value === 'object' && value !== null) {
        return value[breakpoint] || value.desktop || defaultValue;
    }
    return value || defaultValue;
};

// ============================================
// WIDGET DEFINITIONS
// ============================================

const WIDGETS = [
    { type: 'image', label: 'Image', icon: <Image size={20} />, category: 'blocks' },
    { type: 'text', label: 'Text', icon: <Type size={20} />, category: 'blocks' },
    { type: 'button', label: 'Button', icon: <Square size={20} />, category: 'blocks' },
    { type: 'spacer', label: 'Spacer', icon: <Minus size={20} />, category: 'blocks' },
    { type: 'heading', label: 'Heading', icon: <Type size={20} />, category: 'blocks' },
    { type: 'video', label: 'Video', icon: <Video size={20} />, category: 'blocks' },
    { type: 'social', label: 'Social', icon: <Share2 size={20} />, category: 'blocks' },
    { type: 'timer', label: 'Timer', icon: <Clock size={20} />, category: 'blocks' },
    { type: 'menu', label: 'Menu', icon: <Menu size={20} />, category: 'blocks' },
    { type: 'html', label: 'HTML', icon: <Code size={20} />, category: 'blocks' },
];

const CONTAINER_LAYOUTS = [
    { columns: 1, label: '1 Column' },
    { columns: 2, label: '2 Columns' },
    { columns: 3, label: '3 Columns' },
    { columns: 4, label: '4 Columns' },
    { columns: '1:2', label: '1:2 Ratio' },
    { columns: '2:1', label: '2:1 Ratio' },
];

// ============================================
// INITIAL ELEMENTS
// ============================================

const INITIAL_ELEMENTS: BuilderElement[] = [];

// ============================================
// RICH TEXT TOOLBAR
// ============================================

interface RichTextToolbarProps {
    onFormat: (command: string, value?: string) => void;
}

const RichTextToolbar: React.FC<RichTextToolbarProps> = ({ onFormat }) => {
    const [fontSize, setFontSize] = useState('12px');
    const [fontFamily, setFontFamily] = useState('Arial');

    return (
        <div className="flex items-center gap-1 bg-white border-b px-4 py-2">
            <button
                onClick={() => onFormat('bold')}
                className="p-2 hover:bg-gray-100 rounded"
                title="Bold"
            >
                <Bold size={16} />
            </button>
            <button
                onClick={() => onFormat('italic')}
                className="p-2 hover:bg-gray-100 rounded"
                title="Italic"
            >
                <Italic size={16} />
            </button>
            <button
                onClick={() => onFormat('underline')}
                className="p-2 hover:bg-gray-100 rounded"
                title="Underline"
            >
                <Underline size={16} />
            </button>
            <button
                onClick={() => onFormat('strikeThrough')}
                className="p-2 hover:bg-gray-100 rounded"
                title="Strikethrough"
            >
                <Strikethrough size={16} />
            </button>

            <div className="w-px h-6 bg-gray-300 mx-1" />

            <button
                onClick={() => onFormat('insertUnorderedList')}
                className="p-2 hover:bg-gray-100 rounded"
                title="Bullet List"
            >
                <List size={16} />
            </button>
            <button
                onClick={() => onFormat('insertOrderedList')}
                className="p-2 hover:bg-gray-100 rounded"
                title="Numbered List"
            >
                <ListOrdered size={16} />
            </button>

            <div className="w-px h-6 bg-gray-300 mx-1" />

            <button
                onClick={() => onFormat('superscript')}
                className="p-2 hover:bg-gray-100 rounded"
                title="Superscript"
            >
                <Superscript size={16} />
            </button>
            <button
                onClick={() => onFormat('subscript')}
                className="p-2 hover:bg-gray-100 rounded"
                title="Subscript"
            >
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
                onChange={(e) => {
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
                onChange={(e) => {
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
// ELEMENT TOOLBAR (inside canvas)
// ============================================

interface ElementToolbarProps {
    elementId: string;
    elementType: string;
    onAction: (action: string, elementId: string) => void;
}

const ElementToolbarHtml = (elementId: string, elementType: string): string => {
    return `
        <div class="element-toolbar">
            <button class="element-toolbar-btn" data-action="drag" data-target-id="${elementId}" title="Drag">
                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="9" cy="5" r="1"/><circle cx="9" cy="12" r="1"/><circle cx="9" cy="19" r="1"/><circle cx="15" cy="5" r="1"/><circle cx="15" cy="12" r="1"/><circle cx="15" cy="19" r="1"/></svg>
            </button>
            <button class="element-toolbar-btn" data-action="duplicate" data-target-id="${elementId}" title="Copy">
                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>
            </button>
            <button class="element-toolbar-btn" data-action="delete" data-target-id="${elementId}" title="Delete">
                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/></svg>
            </button>
            <button class="element-toolbar-btn" data-action="moveUp" data-target-id="${elementId}" title="Move Up">
                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 19V5M5 12l7-7 7 7"/></svg>
            </button>
            <button class="element-toolbar-btn" data-action="moveDown" data-target-id="${elementId}" title="Move Down">
                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 5v14M5 12l7 7 7-7"/></svg>
            </button>
        </div>
    `;
};

// ============================================
// SETTINGS PANEL
// ============================================

interface SettingsPanelProps {
    element: BuilderElement;
    breakpoint: Breakpoint;
    onUpdate: (settings: Partial<ElementSettings>) => void;
    onClose: () => void;
}

const SettingsPanel: React.FC<SettingsPanelProps> = ({
    element,
    breakpoint,
    onUpdate,
    onClose,
}) => {
    const [activeTab, setActiveTab] = useState<'style' | 'advanced'>('style');

    return (
        <div className="flex flex-col h-full">
            {/* Header */}
            <div className="p-4 border-b bg-gray-50 flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <button onClick={onClose} className="text-gray-500 hover:text-gray-700">
                        <ChevronRight size={18} />
                    </button>
                    <span className="font-medium capitalize">{element.type}</span>
                </div>
            </div>

            {/* Tabs */}
            <div className="flex border-b">
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

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-4">
                {activeTab === 'style' && (
                    <div className="space-y-4">
                        {/* Padding & Margin */}
                        <div>
                            <label className="text-sm font-medium text-gray-700 mb-2 block">Padding & Margin</label>
                            <div className="grid grid-cols-2 gap-2">
                                <input
                                    type="text"
                                    placeholder="Padding"
                                    value={element.settings.padding || ''}
                                    onChange={(e) => onUpdate({ padding: e.target.value })}
                                    className="px-2 py-1 border rounded text-sm"
                                />
                                <input
                                    type="text"
                                    placeholder="Margin"
                                    value={element.settings.margin || ''}
                                    onChange={(e) => onUpdate({ margin: e.target.value })}
                                    className="px-2 py-1 border rounded text-sm"
                                />
                            </div>
                        </div>

                        {/* Background Color */}
                        <div>
                            <label className="text-sm font-medium text-gray-700 mb-2 block">Background Color</label>
                            <div className="flex gap-2">
                                <input
                                    type="color"
                                    value={element.settings.backgroundColor || '#ffffff'}
                                    onChange={(e) => onUpdate({ backgroundColor: e.target.value })}
                                    className="w-10 h-8 border rounded cursor-pointer"
                                />
                                <input
                                    type="text"
                                    value={element.settings.backgroundColor || ''}
                                    onChange={(e) => onUpdate({ backgroundColor: e.target.value })}
                                    placeholder="#ffffff"
                                    className="flex-1 px-2 py-1 border rounded text-sm"
                                />
                            </div>
                        </div>

                        {/* Border */}
                        <div>
                            <label className="text-sm font-medium text-gray-700 mb-2 block">Border</label>
                            <input
                                type="text"
                                value={element.settings.border || ''}
                                onChange={(e) => onUpdate({ border: e.target.value })}
                                placeholder="1px solid #ccc"
                                className="w-full px-2 py-1 border rounded text-sm"
                            />
                        </div>

                        {/* Border Radius */}
                        <div>
                            <label className="text-sm font-medium text-gray-700 mb-2 block">Border Radius</label>
                            <input
                                type="text"
                                value={element.settings.borderRadius || ''}
                                onChange={(e) => onUpdate({ borderRadius: e.target.value })}
                                placeholder="4px"
                                className="w-full px-2 py-1 border rounded text-sm"
                            />
                        </div>

                        {/* Width & Height */}
                        <div>
                            <label className="text-sm font-medium text-gray-700 mb-2 block">Dimensions</label>
                            <div className="grid grid-cols-2 gap-2">
                                <input
                                    type="text"
                                    placeholder="Width"
                                    value={element.settings.width || ''}
                                    onChange={(e) => onUpdate({ width: e.target.value })}
                                    className="px-2 py-1 border rounded text-sm"
                                />
                                <input
                                    type="text"
                                    placeholder="Height"
                                    value={element.settings.height || ''}
                                    onChange={(e) => onUpdate({ height: e.target.value })}
                                    className="px-2 py-1 border rounded text-sm"
                                />
                            </div>
                        </div>
                    </div>
                )}

                {activeTab === 'advanced' && (
                    <div className="space-y-4">
                        {/* Custom Class */}
                        <div>
                            <label className="text-sm font-medium text-gray-700 mb-2 block">CSS Class</label>
                            <input
                                type="text"
                                value={element.settings.customClass || ''}
                                onChange={(e) => onUpdate({ customClass: e.target.value })}
                                placeholder="my-custom-class"
                                className="w-full px-2 py-1 border rounded text-sm"
                            />
                        </div>

                        {/* Custom ID */}
                        <div>
                            <label className="text-sm font-medium text-gray-700 mb-2 block">CSS ID</label>
                            <input
                                type="text"
                                value={element.settings.customId || ''}
                                onChange={(e) => onUpdate({ customId: e.target.value })}
                                placeholder="my-element-id"
                                className="w-full px-2 py-1 border rounded text-sm"
                            />
                        </div>

                        {/* Custom CSS */}
                        <div>
                            <label className="text-sm font-medium text-gray-700 mb-2 block">Custom CSS</label>
                            <textarea
                                value={element.settings.customCss || ''}
                                onChange={(e) => onUpdate({ customCss: e.target.value })}
                                placeholder=".my-class { color: red; }"
                                rows={6}
                                className="w-full px-2 py-1 border rounded text-sm font-mono"
                            />
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

// ============================================
// LEFT SIDEBAR - ELEMENTS
// ============================================

interface ElementsSidebarProps {
    onDragStart: (type: string, columns?: number | string) => void;
    onDragEnd: () => void;
}

const ElementsSidebar: React.FC<ElementsSidebarProps> = ({ onDragStart, onDragEnd }) => {
    const [activeTab, setActiveTab] = useState<'block' | 'container' | 'modules'>('block');

    return (
        <div className="flex flex-col h-full">
            {/* Tabs */}
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

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-4">
                {activeTab === 'block' && (
                    <div className="grid grid-cols-2 gap-3">
                        {WIDGETS.map((widget) => (
                            <div
                                key={widget.type}
                                draggable
                                onDragStart={() => onDragStart(widget.type)}
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
                        {CONTAINER_LAYOUTS.map((layout, idx) => (
                            <div
                                key={idx}
                                draggable
                                onDragStart={() => onDragStart('container', layout.columns)}
                                onDragEnd={onDragEnd}
                                className="border rounded-lg p-3 cursor-move hover:border-green-400"
                            >
                                <div className="flex gap-2">
                                    {typeof layout.columns === 'number' ? (
                                        Array.from({ length: layout.columns }).map((_, i) => (
                                            <div key={i} className="flex-1 h-10 border-2 border-dashed border-green-300 bg-green-50 rounded" />
                                        ))
                                    ) : layout.columns === '1:2' ? (
                                        <>
                                            <div className="w-1/3 h-10 border-2 border-dashed border-green-300 bg-green-50 rounded" />
                                            <div className="w-2/3 h-10 border-2 border-dashed border-green-300 bg-green-50 rounded" />
                                        </>
                                    ) : (
                                        <>
                                            <div className="w-2/3 h-10 border-2 border-dashed border-green-300 bg-green-50 rounded" />
                                            <div className="w-1/3 h-10 border-2 border-dashed border-green-300 bg-green-50 rounded" />
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
// MAIN EDITOR COMPONENT
// ============================================

export default function ElementBuilder(): JSX.Element {
    const iframeRef = useRef<HTMLIFrameElement>(null);
    const [elements, setElements] = useState<BuilderElement[]>(INITIAL_ELEMENTS);
    const [selectedId, setSelectedId] = useState<string | null>(null);
    const [breakpoint, setBreakpoint] = useState<Breakpoint>('desktop');
    const [draggedWidgetType, setDraggedWidgetType] = useState<string | null>(null);
    const [draggedColumns, setDraggedColumns] = useState<number | string | null>(null);
    const [dragOverBottom, setDragOverBottom] = useState(false);
    const [history, setHistory] = useState<{ past: BuilderElement[][]; future: BuilderElement[][] }>({ past: [], future: [] });

    // Find element by ID
    const findElementById = useCallback((els: BuilderElement[], id: string): BuilderElement | null => {
        for (const el of els) {
            if (el.id === id) return el;
            if (el.children) {
                const found = findElementById(el.children, id);
                if (found) return found;
            }
        }
        return null;
    }, []);

    // Find parent element
    const findParentElement = useCallback((els: BuilderElement[], childId: string): BuilderElement | null => {
        for (const el of els) {
            if (el.children?.some(c => c.id === childId)) return el;
            if (el.children) {
                const found = findParentElement(el.children, childId);
                if (found) return found;
            }
        }
        return null;
    }, []);

    // Save to history
    const saveHistory = useCallback(() => {
        setHistory(prev => ({
            past: [...prev.past, elements],
            future: []
        }));
    }, [elements]);

    // Undo
    const undo = useCallback(() => {
        setHistory(prev => {
            if (prev.past.length === 0) return prev;
            const newPast = [...prev.past];
            const previous = newPast.pop()!;
            return {
                past: newPast,
                future: [elements, ...prev.future]
            };
        });
        setHistory(prev => {
            if (prev.past.length > 0) {
                const lastState = history.past[history.past.length - 1];
                setElements(lastState);
            }
            return prev;
        });
    }, [elements, history.past]);

    // Redo
    const redo = useCallback(() => {
        setHistory(prev => {
            if (prev.future.length === 0) return prev;
            const [next, ...newFuture] = prev.future;
            setElements(next);
            return {
                past: [...prev.past, elements],
                future: newFuture
            };
        });
    }, [elements]);

    // Add element
    const addElement = useCallback((parentId: string | null, element: BuilderElement, index?: number) => {
        saveHistory();
        setElements(prev => {
            if (!parentId) {
                if (index !== undefined) {
                    const newElements = [...prev];
                    newElements.splice(index, 0, element);
                    return newElements;
                }
                return [...prev, element];
            }
            const updateChildren = (els: BuilderElement[]): BuilderElement[] => {
                return els.map(el => {
                    if (el.id === parentId) {
                        const children = el.children || [];
                        if (index !== undefined) {
                            const newChildren = [...children];
                            newChildren.splice(index, 0, element);
                            return { ...el, children: newChildren };
                        }
                        return { ...el, children: [...children, element] };
                    }
                    if (el.children) {
                        return { ...el, children: updateChildren(el.children) };
                    }
                    return el;
                });
            };
            return updateChildren(prev);
        });
    }, [saveHistory]);

    // Update element
    const updateElement = useCallback((id: string, settings: Partial<ElementSettings>) => {
        saveHistory();
        setElements(prev => {
            const update = (els: BuilderElement[]): BuilderElement[] => {
                return els.map(el => {
                    if (el.id === id) {
                        return { ...el, settings: { ...el.settings, ...settings } };
                    }
                    if (el.children) {
                        return { ...el, children: update(el.children) };
                    }
                    return el;
                });
            };
            return update(prev);
        });
    }, [saveHistory]);

    // Delete element
    const deleteElement = useCallback((id: string) => {
        saveHistory();
        setElements(prev => {
            const remove = (els: BuilderElement[]): BuilderElement[] => {
                return els.filter(el => el.id !== id).map(el => {
                    if (el.children) {
                        return { ...el, children: remove(el.children) };
                    }
                    return el;
                });
            };
            return remove(prev);
        });
        if (selectedId === id) setSelectedId(null);
    }, [saveHistory, selectedId]);

    // Duplicate element
    const duplicateElement = useCallback((id: string) => {
        saveHistory();
        const element = findElementById(elements, id);
        if (!element) return;

        const cloneWithNewIds = (el: BuilderElement): BuilderElement => ({
            ...el,
            id: generateId(),
            children: el.children?.map(cloneWithNewIds)
        });

        const parent = findParentElement(elements, id);
        const newElement = cloneWithNewIds(element);

        setElements(prev => {
            if (!parent) {
                const idx = prev.findIndex(el => el.id === id);
                const newElements = [...prev];
                newElements.splice(idx + 1, 0, newElement);
                return newElements;
            }
            const update = (els: BuilderElement[]): BuilderElement[] => {
                return els.map(el => {
                    if (el.id === parent.id) {
                        const idx = el.children?.findIndex(c => c.id === id) ?? -1;
                        const children = [...(el.children || [])];
                        children.splice(idx + 1, 0, newElement);
                        return { ...el, children };
                    }
                    if (el.children) {
                        return { ...el, children: update(el.children) };
                    }
                    return el;
                });
            };
            return update(prev);
        });
    }, [elements, findElementById, findParentElement, saveHistory]);

    // Move element up/down
    const moveElement = useCallback((id: string, direction: 'up' | 'down') => {
        saveHistory();
        setElements(prev => {
            const move = (els: BuilderElement[]): BuilderElement[] => {
                const idx = els.findIndex(el => el.id === id);
                if (idx !== -1) {
                    const newIdx = direction === 'up' ? idx - 1 : idx + 1;
                    if (newIdx >= 0 && newIdx < els.length) {
                        const newEls = [...els];
                        [newEls[idx], newEls[newIdx]] = [newEls[newIdx], newEls[idx]];
                        return newEls;
                    }
                    return els;
                }
                return els.map(el => {
                    if (el.children) {
                        return { ...el, children: move(el.children) };
                    }
                    return el;
                });
            };
            return move(prev);
        });
    }, [saveHistory]);

    // Create default element
    const createDefaultElement = (type: string, columns?: number | string): BuilderElement => {
        const id = generateId();

        if (type === 'container') {
            const colCount = typeof columns === 'number' ? columns : 2;
            return {
                id,
                type: 'container',
                settings: { columns: colCount, columnGap: '0' },
                children: Array.from({ length: colCount }).map(() => ({
                    id: generateId(),
                    type: 'column',
                    settings: {},
                    children: []
                }))
            };
        }

        const defaults: Record<string, ElementSettings> = {
            heading: { text: 'Heading', tag: 'h2' },
            text: { text: 'Enter your text here...' },
            button: { text: 'Click Me', backgroundColor: '#3b82f6', color: '#ffffff', padding: '10px 20px', borderRadius: '4px' },
            image: { src: 'https://via.placeholder.com/300x200', alt: 'Image' },
            spacer: { height: '40px' },
            video: { src: '' },
            social: {},
            timer: {},
            menu: {},
            html: { text: '<div>Custom HTML</div>' },
        };

        return { id, type, settings: defaults[type] || {} };
    };

    // Render element HTML
    const renderElementHtml = (element: BuilderElement): string => {
        const { id, type, settings, children } = element;
        const style = `
            padding: ${settings.padding || '0'};
            margin: ${settings.margin || '0'};
            background-color: ${settings.backgroundColor || 'transparent'};
            border: ${settings.border || 'none'};
            border-radius: ${settings.borderRadius || '0'};
            ${settings.width ? `width: ${settings.width};` : ''}
            ${settings.height ? `height: ${settings.height};` : ''}
        `.trim();

        const customClass = settings.customClass || '';
        const customId = settings.customId ? `id="${settings.customId}"` : '';
        const toolbar = ElementToolbarHtml(id, type);

        if (type === 'container') {
            const cols = children?.map(col => `
                <div class="column" data-element-id="${col.id}" data-element-type="column" style="flex: 1; min-height: 60px;">
                    ${toolbar}
                    ${col.children?.map(c => renderElementHtml(c)).join('') || '<div class="empty-column">Drop here</div>'}
                </div>
            `).join('') || '';

            return `
                <div class="container-element ${customClass}" ${customId} data-element-id="${id}" data-element-type="container" style="display: flex; gap: ${settings.columnGap || '0'}; ${style}">
                    ${toolbar}
                    ${cols}
                </div>
            `;
        }

        if (type === 'column') {
            return `
                <div class="column ${customClass}" ${customId} data-element-id="${id}" data-element-type="column" style="flex: 1; min-height: 60px; ${style}">
                    ${toolbar}
                    ${children?.map(c => renderElementHtml(c)).join('') || '<div class="empty-column">Drop here</div>'}
                </div>
            `;
        }

        const content: Record<string, string> = {
            heading: `<${settings.tag || 'h2'} style="margin: 0;">${settings.text || ''}</${settings.tag || 'h2'}>`,
            text: `<p style="margin: 0;">${settings.text || ''}</p>`,
            button: `<button style="background: ${settings.backgroundColor}; color: ${settings.color}; padding: ${settings.padding}; border: none; border-radius: ${settings.borderRadius}; cursor: pointer;">${settings.text || 'Button'}</button>`,
            image: `<img src="${settings.src}" alt="${settings.alt || ''}" style="max-width: 100%; display: block;" />`,
            spacer: `<div style="height: ${settings.height || '40px'};"></div>`,
            video: settings.src ? `<video src="${settings.src}" controls style="max-width: 100%;"></video>` : '<div style="background: #f0f0f0; padding: 20px; text-align: center;">Video Placeholder</div>',
            social: '<div style="text-align: center;">Social Icons</div>',
            timer: '<div style="text-align: center;">Timer Widget</div>',
            menu: '<div style="text-align: center;">Menu Widget</div>',
            html: settings.text || '',
        };

        return `
            <div class="element ${customClass}" ${customId} data-element-id="${id}" data-element-type="${type}" style="${style}">
                ${toolbar}
                ${content[type] || ''}
            </div>
        `;
    };

    // Generate iframe content
    const generateIframeContent = () => {
        const elementsHtml = elements.map(el => renderElementHtml(el)).join('');
        const customCss = elements
            .map(el => el.settings.customCss || '')
            .filter(Boolean)
            .join('\n');

        return `
<!DOCTYPE html>
<html>
<head>
    <style>
        * { box-sizing: border-box; }
        body { margin: 0; padding: 20px; font-family: system-ui, sans-serif; min-height: 100vh; }

        .email-container {
            min-height: calc(100vh - 40px);
            position: relative;
        }

        /* Element base - no extra spacing */
        [data-element-id] {
            position: relative;
            transition: outline 0.15s ease;
        }

        /* Selected element */
        [data-selected="true"] {
            outline: 2px solid #22c55e !important;
            outline-offset: 2px;
        }

        /* Parent highlight */
        [data-parent-highlighted="true"] {
            outline: 2px dashed #94a3b8 !important;
            outline-offset: 4px;
        }

        /* Element toolbar - inside element, top center */
        .element-toolbar {
            display: none;
            position: absolute;
            top: 0;
            left: 50%;
            transform: translateX(-50%) translateY(-100%);
            background: #22c55e;
            border-radius: 4px 4px 0 0;
            padding: 4px;
            gap: 2px;
            z-index: 1000;
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

        /* Container styles */
        .container-element {
            min-height: 60px;
        }

        .column {
            min-height: 60px;
            border: 1px dashed #e5e7eb;
        }

        .column:hover {
            border-color: #22c55e;
        }

        .empty-column {
            display: flex;
            align-items: center;
            justify-content: center;
            height: 100%;
            min-height: 60px;
            color: #9ca3af;
            font-size: 12px;
        }

        /* Drop indicator */
        .drop-indicator {
            height: 3px;
            background: #22c55e;
            margin: 4px 0;
            border-radius: 2px;
        }

        /* Drag over bottom indicator */
        .drag-over-bottom {
            position: fixed;
            bottom: 0;
            left: 0;
            right: 0;
            height: 60px;
            background: linear-gradient(transparent, rgba(34, 197, 94, 0.3));
            pointer-events: none;
            z-index: 9999;
        }

        .drag-over-bottom::after {
            content: 'Drop here to add at the end';
            position: absolute;
            bottom: 10px;
            left: 50%;
            transform: translateX(-50%);
            color: #22c55e;
            font-size: 12px;
            font-weight: 500;
        }

        .drag-over {
            background-color: rgba(34, 197, 94, 0.1) !important;
        }

        [data-dragging="true"] {
            opacity: 0.5;
        }

        ${customCss}
    </style>
</head>
<body>
    <div class="email-container" data-drop-zone="true" data-root-container="true">
        ${elementsHtml || '<div style="text-align: center; color: #9ca3af; padding: 40px;">Drag elements here to start building</div>'}
    </div>
    <div class="drag-over-bottom" style="display: none;"></div>
</body>
</html>`;
    };

    // Setup iframe events
    useEffect(() => {
        const iframe = iframeRef.current;
        if (!iframe) return;

        const setupIframe = () => {
            const doc = iframe.contentDocument;
            if (!doc) return;

            doc.open();
            doc.write(generateIframeContent());
            doc.close();

            const root = doc.querySelector('.email-container');
            const bottomIndicator = doc.querySelector('.drag-over-bottom') as HTMLElement;
            if (!root) return;

            // Click handler
            const handleClick = (e: Event) => {
                const target = e.target as HTMLElement;
                const toolbarBtn = target.closest('.element-toolbar-btn');

                if (toolbarBtn) {
                    e.preventDefault();
                    e.stopPropagation();
                    const action = toolbarBtn.getAttribute('data-action');
                    const targetId = toolbarBtn.getAttribute('data-target-id');

                    if (targetId) {
                        if (action === 'duplicate') duplicateElement(targetId);
                        else if (action === 'delete') deleteElement(targetId);
                        else if (action === 'moveUp') moveElement(targetId, 'up');
                        else if (action === 'moveDown') moveElement(targetId, 'down');
                    }
                    return;
                }

                const elementId = target.closest('[data-element-id]')?.getAttribute('data-element-id');
                if (elementId) {
                    e.preventDefault();
                    e.stopPropagation();
                    setSelectedId(elementId);
                } else if (target.closest('[data-root-container]')) {
                    setSelectedId(null);
                }
            };

            // Drag start from toolbar drag button
            const handleDragStart = (e: DragEvent) => {
                const target = e.target as HTMLElement;

                if (!target.closest('.element-toolbar-btn[data-action="drag"]')) {
                    // Allow drag from toolbar drag button only for existing elements
                    const elementWrapper = target.closest('[data-element-id]');
                    if (elementWrapper && !draggedWidgetType) {
                        e.preventDefault();
                        return;
                    }
                }

                const dragBtn = target.closest('.element-toolbar-btn[data-action="drag"]');
                if (dragBtn) {
                    const elementId = dragBtn.getAttribute('data-target-id');
                    if (elementId) {
                        const elementWrapper = doc.querySelector(`[data-element-id="${elementId}"]`);
                        if (elementWrapper) {
                            (elementWrapper as HTMLElement).setAttribute('data-dragging', 'true');
                            e.dataTransfer?.setData('text/plain', elementId);
                        }
                    }
                }
            };

            // Drag end
            const handleDragEnd = () => {
                doc.querySelectorAll('.drag-over').forEach(el => el.classList.remove('drag-over'));
                doc.querySelectorAll('.drop-indicator').forEach(el => el.remove());
                doc.querySelectorAll('[data-dragging]').forEach(el => el.removeAttribute('data-dragging'));
                if (bottomIndicator) bottomIndicator.style.display = 'none';
                setDragOverBottom(false);
            };

            // Drag over
            const handleDragOver = (e: DragEvent) => {
                e.preventDefault();
                e.stopPropagation();

                const target = e.target as HTMLElement;

                // Clear previous indicators
                doc.querySelectorAll('.drop-indicator').forEach(el => el.remove());
                doc.querySelectorAll('.drag-over').forEach(el => el.classList.remove('drag-over'));

                // Check if near bottom of canvas
                const rect = root.getBoundingClientRect();
                const isNearBottom = e.clientY > rect.bottom - 60;

                if (isNearBottom || e.clientY > doc.body.scrollHeight - 60) {
                    if (bottomIndicator) bottomIndicator.style.display = 'block';
                    setDragOverBottom(true);
                    return;
                } else {
                    if (bottomIndicator) bottomIndicator.style.display = 'none';
                    setDragOverBottom(false);
                }

                const columnTarget = target.closest('[data-element-type="column"]');
                const elementTarget = target.closest('[data-element-id]');
                const rootDropZone = target.closest('[data-drop-zone="true"]');

                if (columnTarget && draggedWidgetType) {
                    columnTarget.classList.add('drag-over');
                } else if (elementTarget) {
                    const rect = elementTarget.getBoundingClientRect();
                    const position = e.clientY < rect.top + rect.height / 2 ? 'before' : 'after';

                    const indicator = doc.createElement('div');
                    indicator.className = 'drop-indicator';

                    if (position === 'before') {
                        elementTarget.parentNode?.insertBefore(indicator, elementTarget);
                    } else {
                        elementTarget.parentNode?.insertBefore(indicator, elementTarget.nextSibling);
                    }
                } else if (rootDropZone) {
                    rootDropZone.classList.add('drag-over');
                }
            };

            // Drop
            const handleDrop = (e: DragEvent) => {
                e.preventDefault();
                e.stopPropagation();

                const target = e.target as HTMLElement;
                doc.querySelectorAll('.drag-over').forEach(el => el.classList.remove('drag-over'));
                doc.querySelectorAll('.drop-indicator').forEach(el => el.remove());
                if (bottomIndicator) bottomIndicator.style.display = 'none';

                // Check if dropped at bottom
                const rect = root.getBoundingClientRect();
                const isAtBottom = e.clientY > rect.bottom - 60 || dragOverBottom;

                if (draggedWidgetType) {
                    const newElement = createDefaultElement(draggedWidgetType, draggedColumns || undefined);

                    if (isAtBottom) {
                        addElement(null, newElement);
                    } else {
                        const columnTarget = target.closest('[data-element-type="column"]');
                        const elementTarget = target.closest('[data-element-id]');

                        if (columnTarget) {
                            const columnId = columnTarget.getAttribute('data-element-id');
                            addElement(columnId, newElement);
                        } else if (elementTarget) {
                            const targetId = elementTarget.getAttribute('data-element-id');
                            if (targetId) {
                                const parent = findParentElement(elements, targetId);
                                const siblings = parent?.children || elements;
                                const idx = siblings.findIndex(el => el.id === targetId);
                                const rect = elementTarget.getBoundingClientRect();
                                const insertIdx = e.clientY < rect.top + rect.height / 2 ? idx : idx + 1;
                                addElement(parent?.id || null, newElement, insertIdx);
                            }
                        } else {
                            addElement(null, newElement);
                        }
                    }

                    setDraggedWidgetType(null);
                    setDraggedColumns(null);
                }

                setDragOverBottom(false);
            };

            root.addEventListener('click', handleClick);
            doc.addEventListener('dragstart', handleDragStart as EventListener);
            doc.addEventListener('dragend', handleDragEnd);
            doc.addEventListener('dragover', handleDragOver as EventListener);
            doc.addEventListener('drop', handleDrop as EventListener);

            // Update selection
            doc.querySelectorAll('[data-selected]').forEach(el => el.removeAttribute('data-selected'));
            doc.querySelectorAll('[data-parent-highlighted]').forEach(el => el.removeAttribute('data-parent-highlighted'));

            if (selectedId) {
                const selected = doc.querySelector(`[data-element-id="${selectedId}"]`);
                if (selected) {
                    selected.setAttribute('data-selected', 'true');
                    const parent = findParentElement(elements, selectedId);
                    if (parent) {
                        const parentEl = doc.querySelector(`[data-element-id="${parent.id}"]`);
                        if (parentEl) parentEl.setAttribute('data-parent-highlighted', 'true');
                    }
                }
            }

            return () => {
                root.removeEventListener('click', handleClick);
                doc.removeEventListener('dragstart', handleDragStart as EventListener);
                doc.removeEventListener('dragend', handleDragEnd);
                doc.removeEventListener('dragover', handleDragOver as EventListener);
                doc.removeEventListener('drop', handleDrop as EventListener);
            };
        };

        iframe.onload = setupIframe;
        setupIframe();
    }, [elements, selectedId, draggedWidgetType, draggedColumns, dragOverBottom, addElement, deleteElement, duplicateElement, moveElement, findParentElement]);

    // Rich text format handler
    const handleFormat = (command: string, value?: string) => {
        const iframe = iframeRef.current;
        if (!iframe?.contentDocument) return;
        iframe.contentDocument.execCommand(command, false, value);
    };

    // Export HTML
    const handleExportHtml = () => {
        const html = generateIframeContent();
        const blob = new Blob([html], { type: 'text/html' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'template.html';
        a.click();
        URL.revokeObjectURL(url);
    };

    const selectedElement = selectedId ? findElementById(elements, selectedId) : null;

    return (
        <div className="flex h-screen bg-gray-100">
            {/* Left Sidebar - Elements */}
            <div className="w-52 bg-white border-r flex flex-col">
                <ElementsSidebar
                    onDragStart={(type, columns) => {
                        setDraggedWidgetType(type);
                        if (columns) setDraggedColumns(columns);
                    }}
                    onDragEnd={() => {
                        setDraggedWidgetType(null);
                        setDraggedColumns(null);
                    }}
                />
            </div>

            {/* Main Canvas */}
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

                        <button
                            onClick={() => setBreakpoint('desktop')}
                            className={`p-2 rounded ${breakpoint === 'desktop' ? 'bg-green-100 text-green-600' : 'text-gray-600 hover:bg-gray-100'}`}
                        >
                            <Monitor size={18} />
                        </button>
                        <button
                            onClick={() => setBreakpoint('tablet')}
                            className={`p-2 rounded ${breakpoint === 'tablet' ? 'bg-green-100 text-green-600' : 'text-gray-600 hover:bg-gray-100'}`}
                        >
                            <Tablet size={18} />
                        </button>
                        <button
                            onClick={() => setBreakpoint('mobile')}
                            className={`p-2 rounded ${breakpoint === 'mobile' ? 'bg-green-100 text-green-600' : 'text-gray-600 hover:bg-gray-100'}`}
                        >
                            <Smartphone size={18} />
                        </button>
                    </div>

                    <button
                        onClick={handleExportHtml}
                        className="flex items-center gap-2 px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600 text-sm"
                    >
                        <Download size={16} />
                        Export
                    </button>
                </div>

                {/* Canvas */}
                <div className="flex-1 overflow-auto bg-gray-200 p-4">
                    <div
                        className={`mx-auto bg-white shadow-lg rounded transition-all ${
                            breakpoint === 'mobile' ? 'max-w-[375px]' :
                            breakpoint === 'tablet' ? 'max-w-[768px]' : 'max-w-full'
                        }`}
                    >
                        <iframe
                            ref={iframeRef}
                            className="w-full min-h-[600px] border-0"
                            title="Editor Canvas"
                        />
                    </div>
                </div>
            </div>

            {/* Right Sidebar - Settings */}
            <div className={`bg-white border-l transition-all duration-300 ${selectedElement ? 'w-72' : 'w-0'} overflow-hidden`}>
                {selectedElement && (
                    <SettingsPanel
                        element={selectedElement}
                        breakpoint={breakpoint}
                        onUpdate={(settings) => updateElement(selectedElement.id, settings)}
                        onClose={() => setSelectedId(null)}
                    />
                )}
            </div>
        </div>
    );
}
