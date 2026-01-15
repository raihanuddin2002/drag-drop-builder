'use client';

import React, { useState, useRef, useEffect, JSX } from 'react';
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
    Code,
    X,
} from 'lucide-react';

// Internal imports
import {
    BuilderElement,
    Breakpoint,
    ElementSettings,
    WidgetControl,
    generateId,
    getResponsiveValue,
} from './types';
import { EditorContext, useCreateEditorStore } from './store';
import { getWidget, createDefaultElement, getAllWidgets } from './widgets';
import { renderForEditor, renderFullHtml, parseHtmlToElements, findElementById } from './render';

// ============================================
// INITIAL ELEMENTS
// ============================================

const INITIAL_ELEMENTS: BuilderElement[] = [
    {
        id: generateId(),
        type: 'heading',
        settings: {
            text: 'Welcome!',
            tag: 'h1',
            color: '#333333',
            fontSize: { desktop: '32px', tablet: '28px', mobile: '24px' },
            textAlign: { desktop: 'center' },
            margin: '0 0 20px 0',
        },
    },
    {
        id: generateId(),
        type: 'text',
        settings: {
            text: 'Start building your email template by dragging elements from the sidebar.',
            color: '#666666',
            fontSize: { desktop: '16px' },
            textAlign: { desktop: 'center' },
            lineHeight: '1.6',
            margin: '0 0 20px 0',
        },
    },
];

// ============================================
// CONTROL COMPONENTS
// ============================================

interface ControlProps {
    control: WidgetControl;
    value: any;
    onChange: (value: any) => void;
    breakpoint: Breakpoint;
}

const ControlInput: React.FC<ControlProps> = ({ control, value, onChange, breakpoint }) => {
    // Handle responsive values
    const currentValue = control.responsive
        ? getResponsiveValue(value, breakpoint, '')
        : value;

    const handleChange = (newValue: any) => {
        if (control.responsive && typeof value === 'object' && value !== null && 'desktop' in value) {
            onChange({ ...value, [breakpoint]: newValue });
        } else if (control.responsive) {
            onChange({ desktop: newValue, [breakpoint]: newValue });
        } else {
            onChange(newValue);
        }
    };

    switch (control.type) {
        case 'text':
        case 'url':
        case 'image':
            return (
                <input
                    type="text"
                    value={currentValue || ''}
                    onChange={(e) => handleChange(e.target.value)}
                    placeholder={control.placeholder}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
            );

        case 'textarea':
            return (
                <textarea
                    value={currentValue || ''}
                    onChange={(e) => handleChange(e.target.value)}
                    placeholder={control.placeholder}
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-y"
                />
            );

        case 'code':
            return (
                <textarea
                    value={currentValue || ''}
                    onChange={(e) => handleChange(e.target.value)}
                    placeholder={control.placeholder}
                    rows={8}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm font-mono bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-y"
                />
            );

        case 'number':
            return (
                <input
                    type="number"
                    value={currentValue || ''}
                    onChange={(e) => handleChange(e.target.value)}
                    min={control.min}
                    max={control.max}
                    step={control.step}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
            );

        case 'select':
            return (
                <select
                    value={currentValue || ''}
                    onChange={(e) => handleChange(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                    <option value="">Select...</option>
                    {control.options?.map((opt) => (
                        <option key={opt.value} value={opt.value}>
                            {opt.label}
                        </option>
                    ))}
                </select>
            );

        case 'color':
            return (
                <div className="flex gap-2">
                    <input
                        type="color"
                        value={currentValue || '#000000'}
                        onChange={(e) => handleChange(e.target.value)}
                        className="w-12 h-10 border border-gray-300 rounded cursor-pointer"
                    />
                    <input
                        type="text"
                        value={currentValue || ''}
                        onChange={(e) => handleChange(e.target.value)}
                        placeholder="#000000"
                        className="flex-1 px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                </div>
            );

        case 'toggle':
            return (
                <button
                    onClick={() => handleChange(!currentValue)}
                    className={`relative w-12 h-6 rounded-full transition-colors ${currentValue ? 'bg-blue-500' : 'bg-gray-300'
                        }`}
                >
                    <span
                        className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-transform ${currentValue ? 'left-7' : 'left-1'
                            }`}
                    />
                </button>
            );

        default:
            return null;
    }
};

// ============================================
// SIDEBAR PANELS
// ============================================

interface WidgetsPanelProps {
    onDragStart: (type: string) => void;
    onDragEnd: () => void;
}

const WidgetsPanel: React.FC<WidgetsPanelProps> = ({ onDragStart, onDragEnd }) => {
    const allWidgets = getAllWidgets().filter((w) => w.type !== 'column');

    const categories = [
        { id: 'basic', label: 'Basic' },
        { id: 'layout', label: 'Layout' },
        { id: 'media', label: 'Media' },
        { id: 'advanced', label: 'Advanced' },
    ];

    return (
        <div className="p-4">
            {categories.map((category) => {
                const categoryWidgets = allWidgets.filter((w) => w.category === category.id);
                if (categoryWidgets.length === 0) return null;

                return (
                    <div key={category.id} className="mb-6">
                        <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">
                            {category.label}
                        </h4>
                        <div className="grid grid-cols-2 gap-2">
                            {categoryWidgets.map((widget) => (
                                <div
                                    key={widget.type}
                                    draggable
                                    onDragStart={() => onDragStart(widget.type)}
                                    onDragEnd={onDragEnd}
                                    className="flex flex-col items-center justify-center p-3 bg-white border-2 border-gray-200 rounded-lg cursor-move hover:border-blue-400 hover:shadow-md transition select-none"
                                >
                                    <span className="text-2xl mb-1">{widget.icon}</span>
                                    <span className="text-xs font-medium text-gray-700">{widget.label}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                );
            })}
        </div>
    );
};

interface SettingsPanelProps {
    element: BuilderElement;
    breakpoint: Breakpoint;
    onUpdate: (settings: Partial<ElementSettings>) => void;
    onDelete: () => void;
    onDuplicate: () => void;
    onClose: () => void;
}

const SettingsPanel: React.FC<SettingsPanelProps> = ({
    element,
    breakpoint,
    onUpdate,
    onDelete,
    onDuplicate,
    onClose,
}) => {
    const widget = getWidget(element.type);
    if (!widget) return null;

    // Group controls by section
    const sections: Record<string, WidgetControl[]> = {};
    widget.controls.forEach((control) => {
        const section = control.section || 'General';
        if (!sections[section]) sections[section] = [];
        sections[section].push(control);
    });

    const [openSections, setOpenSections] = useState<Record<string, boolean>>({
        Content: true,
        Style: true,
    });

    const toggleSection = (section: string) => {
        setOpenSections((prev) => ({ ...prev, [section]: !prev[section] }));
    };

    return (
        <div className="flex flex-col h-full">
            {/* Header */}
            <div className="p-4 border-b bg-gray-50">
                <div className="flex items-center justify-between mb-1">
                    <div className="flex items-center gap-2">
                        <span className="text-xl">{widget.icon}</span>
                        <h3 className="font-semibold text-gray-800">{widget.label}</h3>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-1 text-gray-500 hover:text-gray-700 rounded"
                    >
                        <X size={18} />
                    </button>
                </div>
                <p className="text-xs text-gray-500">ID: {element.id.slice(0, 12)}...</p>
            </div>

            {/* Controls */}
            <div className="flex-1 overflow-y-auto p-4">
                {Object.entries(sections).map(([section, controls]) => (
                    <div key={section} className="mb-4">
                        <button
                            onClick={() => toggleSection(section)}
                            className="flex items-center justify-between w-full text-left text-sm font-medium text-gray-700 mb-2"
                        >
                            {section}
                            <ChevronDown
                                size={16}
                                className={`transform transition-transform ${openSections[section] !== false ? 'rotate-0' : '-rotate-90'
                                    }`}
                            />
                        </button>

                        {openSections[section] !== false && (
                            <div className="space-y-3 pl-1">
                                {controls.map((control) => (
                                    <div key={control.key}>
                                        <label className="flex items-center gap-1 text-xs text-gray-600 mb-1">
                                            {control.label}
                                            {control.responsive && (
                                                <span className="text-blue-500 text-[10px]">({breakpoint})</span>
                                            )}
                                        </label>
                                        <ControlInput
                                            control={control}
                                            value={(element.settings as any)[control.key]}
                                            onChange={(value) => onUpdate({ [control.key]: value })}
                                            breakpoint={breakpoint}
                                        />
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                ))}
            </div>

            {/* Actions */}
            <div className="p-4 border-t space-y-2">
                <button
                    onClick={onDuplicate}
                    className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200"
                >
                    <Copy size={16} />
                    Duplicate
                </button>
                <button
                    onClick={onDelete}
                    className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-red-500 text-white rounded-md hover:bg-red-600"
                >
                    <Trash2 size={16} />
                    Delete
                </button>
            </div>
        </div>
    );
};

// ============================================
// MAIN EDITOR COMPONENT
// ============================================

export default function ElementBuilder(): JSX.Element {
    // Create store
    const { state, actions } = useCreateEditorStore(INITIAL_ELEMENTS);

    // Refs
    const containerRef = useRef<HTMLDivElement>(null);
    const shadowRootRef = useRef<ShadowRoot | null>(null);

    // Local state
    const [draggedWidgetType, setDraggedWidgetType] = useState<string | null>(null);
    const [showJsonModal, setShowJsonModal] = useState(false);
    const [jsonContent, setJsonContent] = useState('');

    // Initialize shadow DOM
    useEffect(() => {
        if (containerRef.current && !shadowRootRef.current) {
            shadowRootRef.current = containerRef.current.attachShadow({ mode: 'open' });
        }
    }, []);

    // Render into shadow DOM
    useEffect(() => {
        const shadow = shadowRootRef.current;
        if (!shadow) return;

        const html = renderForEditor(state.elements, state.globalStyles, state.breakpoint);
        shadow.innerHTML = html;

        // Setup event handlers
        const root = shadow.querySelector('.email-container');
        if (!root) return;

        // Click handler
        const handleClick = (e: Event) => {
            const target = e.target as HTMLElement;

            // Check if toolbar button was clicked
            const toolbarBtn = target.closest('.element-toolbar-btn');
            if (toolbarBtn) {
                e.preventDefault();
                e.stopPropagation();

                const action = toolbarBtn.getAttribute('data-action');
                const targetId = toolbarBtn.getAttribute('data-target-id');

                if (action === 'duplicate' && targetId) {
                    actions.duplicateElement(targetId);
                } else if (action === 'delete' && targetId) {
                    actions.deleteElement(targetId);
                }
                return;
            }

            const elementId = target.closest('[data-element-id]')?.getAttribute('data-element-id');

            if (elementId) {
                e.preventDefault();
                e.stopPropagation();
                actions.selectElement(elementId);
            } else if (target.closest('[data-root-container]')) {
                actions.selectElement(null);
            }
        };

        // Drag start (for existing elements)
        const handleDragStart = (e: DragEvent) => {
            const target = e.target as HTMLElement;
            const elementId = target.getAttribute('data-element-id');

            if (elementId) {
                e.stopPropagation();
                actions.setDragState(elementId, null, null);
                target.setAttribute('data-dragging', 'true');
                e.dataTransfer?.setData('text/plain', elementId);
            }
        };

        // Drag end
        const handleDragEnd = (e: DragEvent) => {
            const target = e.target as HTMLElement;
            target.removeAttribute('data-dragging');
            actions.setDragState(null, null, null);

            // Clear all drag-over states and highlights
            shadow.querySelectorAll('.drag-over').forEach((el) => el.classList.remove('drag-over'));
            shadow.querySelectorAll('.drag-over-element').forEach((el) => el.classList.remove('drag-over-element'));
            shadow.querySelectorAll('.section-highlight').forEach((el) => el.classList.remove('section-highlight'));
            shadow.querySelectorAll('.drop-indicator').forEach((el) => el.remove());
        };

        // Drag over
        const handleDragOver = (e: DragEvent) => {
            e.preventDefault();
            e.stopPropagation();

            const target = e.target as HTMLElement;

            // Clear previous indicators and highlights
            shadow.querySelectorAll('.drop-indicator').forEach((el) => el.remove());
            shadow.querySelectorAll('.drag-over').forEach((el) => el.classList.remove('drag-over'));
            shadow.querySelectorAll('.drag-over-element').forEach((el) => el.classList.remove('drag-over-element'));
            shadow.querySelectorAll('.section-highlight').forEach((el) => el.classList.remove('section-highlight'));

            // Find the closest column first (priority for dropping inside)
            const columnTarget = target.closest('[data-column="true"]');
            // Find any element that's a direct child (not the column itself)
            const elementTarget = target.closest('[data-element-id]');
            // Check if we're on the root drop zone
            const rootDropZone = target.closest('[data-drop-zone="true"]');

            // Determine if we should drop inside a column
            // Check if the elementTarget IS the column or if we're directly over a column
            const isOverColumn = columnTarget && (
                !elementTarget ||
                elementTarget === columnTarget ||
                elementTarget.getAttribute('data-element-type') === 'column'
            );

            if (isOverColumn && columnTarget) {
                // Dropping inside a column
                columnTarget.classList.add('drag-over');
                const columnId = columnTarget.getAttribute('data-element-id');
                actions.setDragState(state.draggedId || draggedWidgetType, columnId, 'inside');
            } else if (elementTarget && elementTarget.getAttribute('data-element-type') !== 'column') {
                // Dropping before/after a non-column element
                const rect = elementTarget.getBoundingClientRect();
                const mouseY = e.clientY;
                const middle = rect.top + rect.height / 2;
                const position = mouseY < middle ? 'before' : 'after';

                // Highlight the element being hovered (Elementor style)
                elementTarget.classList.add('drag-over-element');

                // Also highlight the parent section/container
                const parentContainer = elementTarget.parentElement?.closest('[data-container="true"], [data-column="true"]');
                if (parentContainer) {
                    parentContainer.classList.add('section-highlight');
                }

                // Create indicator
                const indicator = document.createElement('div');
                indicator.className = 'drop-indicator';

                if (position === 'before') {
                    elementTarget.parentNode?.insertBefore(indicator, elementTarget);
                } else {
                    elementTarget.parentNode?.insertBefore(indicator, elementTarget.nextSibling);
                }

                actions.setDragState(
                    state.draggedId || draggedWidgetType,
                    elementTarget.getAttribute('data-element-id'),
                    position
                );
            } else if (rootDropZone) {
                // Dropping into root container
                rootDropZone.classList.add('drag-over');
                actions.setDragState(state.draggedId || draggedWidgetType, null, 'inside');
            }
        };

        // Drop
        const handleDrop = (e: DragEvent) => {
            e.preventDefault();
            e.stopPropagation();

            const target = e.target as HTMLElement;
            const dropZone = target.closest('[data-drop-zone="true"], [data-column="true"], [data-container="true"]');
            const elementTarget = target.closest('[data-element-id]');

            // Clear states and highlights
            shadow.querySelectorAll('.drag-over').forEach((el) => el.classList.remove('drag-over'));
            shadow.querySelectorAll('.drag-over-element').forEach((el) => el.classList.remove('drag-over-element'));
            shadow.querySelectorAll('.section-highlight').forEach((el) => el.classList.remove('section-highlight'));
            shadow.querySelectorAll('.drop-indicator').forEach((el) => el.remove());

            // Handle new widget from sidebar
            if (draggedWidgetType) {
                const newElement = createDefaultElement(draggedWidgetType);
                if (newElement) {
                    if (elementTarget && state.dragPosition && state.dragPosition !== 'inside') {
                        // Find parent and index
                        const targetId = elementTarget.getAttribute('data-element-id');
                        if (targetId) {
                            const parent = findParentElement(state.elements, targetId);
                            const siblings = parent?.children || state.elements;
                            const targetIndex = siblings.findIndex((el) => el.id === targetId);
                            const insertIndex = state.dragPosition === 'before' ? targetIndex : targetIndex + 1;
                            actions.addElement(parent?.id || null, newElement, insertIndex);
                        }
                    } else if (dropZone) {
                        const parentId = dropZone.getAttribute('data-element-id') || null;
                        actions.addElement(parentId, newElement);
                    } else {
                        actions.addElement(null, newElement);
                    }
                }
                setDraggedWidgetType(null);
                return;
            }

            // Handle moving existing element
            if (state.draggedId && state.dragOverId && state.dragPosition) {
                const draggedElement = findElementById(state.elements, state.draggedId);
                if (!draggedElement) return;

                // Don't drop on itself
                if (state.draggedId === state.dragOverId) return;

                if (state.dragPosition === 'inside') {
                    actions.moveElement(state.draggedId, state.dragOverId, 0);
                } else {
                    const draggedParent = findParentElement(state.elements, state.draggedId);
                    const targetParent = findParentElement(state.elements, state.dragOverId);
                    const targetSiblings = targetParent?.children || state.elements;
                    const draggedSiblings = draggedParent?.children || state.elements;

                    let targetIndex = targetSiblings.findIndex((el) => el.id === state.dragOverId);
                    let insertIndex = state.dragPosition === 'before' ? targetIndex : targetIndex + 1;

                    // If moving within the same parent, account for the element being removed
                    const sameParent = (draggedParent?.id || null) === (targetParent?.id || null);
                    if (sameParent) {
                        const draggedIndex = draggedSiblings.findIndex((el) => el.id === state.draggedId);
                        // If dragged element is before target, the target index will shift down after removal
                        if (draggedIndex < targetIndex) {
                            insertIndex = insertIndex - 1;
                        }
                    }

                    actions.moveElement(state.draggedId, targetParent?.id || null, insertIndex);
                }
            }

            actions.setDragState(null, null, null);
        };

        // Add listeners
        root.addEventListener('click', handleClick);
        root.addEventListener('dragstart', handleDragStart as EventListener);
        root.addEventListener('dragend', handleDragEnd as EventListener);
        root.addEventListener('dragover', handleDragOver as EventListener);
        root.addEventListener('drop', handleDrop as EventListener);

        // Update selection highlight and parent highlight
        shadow.querySelectorAll('[data-selected]').forEach((el) => {
            el.removeAttribute('data-selected');
        });
        shadow.querySelectorAll('[data-parent-highlighted]').forEach((el) => {
            el.removeAttribute('data-parent-highlighted');
        });

        if (state.selectedId) {
            const selected = shadow.querySelector(`[data-element-id="${state.selectedId}"]`);
            if (selected) {
                selected.setAttribute('data-selected', 'true');

                // Find and highlight parent element
                const parent = findParentElement(state.elements, state.selectedId);
                if (parent) {
                    const parentEl = shadow.querySelector(`[data-element-id="${parent.id}"]`);
                    if (parentEl) {
                        parentEl.setAttribute('data-parent-highlighted', 'true');
                    }
                }
            }
        }

        return () => {
            root.removeEventListener('click', handleClick);
            root.removeEventListener('dragstart', handleDragStart as EventListener);
            root.removeEventListener('dragend', handleDragEnd as EventListener);
            root.removeEventListener('dragover', handleDragOver as EventListener);
            root.removeEventListener('drop', handleDrop as EventListener);
        };
    }, [state.elements, state.globalStyles, state.breakpoint, state.selectedId, draggedWidgetType, state.draggedId, state.dragOverId, state.dragPosition, actions]);

    // Find parent element helper
    const findParentElement = (elements: BuilderElement[], childId: string): BuilderElement | null => {
        for (const el of elements) {
            if (el.children?.some((c) => c.id === childId)) {
                return el;
            }
            if (el.children) {
                const found = findParentElement(el.children, childId);
                if (found) return found;
            }
        }
        return null;
    };

    // Export HTML
    const handleExportHtml = () => {
        const html = renderFullHtml(state.elements, state.globalStyles, 'desktop');
        const blob = new Blob([html], { type: 'text/html' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'template.html';
        a.click();
        URL.revokeObjectURL(url);
    };

    // Export JSON
    const handleExportJson = () => {
        const json = actions.exportJson();
        setJsonContent(json);
        setShowJsonModal(true);
    };

    // Import HTML
    const handleImportHtml = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (event) => {
            const content = event.target?.result as string;
            if (content) {
                const elements = parseHtmlToElements(content);
                actions.setElements(elements);
            }
        };
        reader.readAsText(file);
        e.target.value = '';
    };

    // Import JSON
    const handleImportJson = () => {
        try {
            actions.importJson(jsonContent);
            setShowJsonModal(false);
        } catch (e) {
            alert('Invalid JSON');
        }
    };

    // Get selected element
    const selectedElement = state.selectedId
        ? findElementById(state.elements, state.selectedId)
        : null;

    return (
        <EditorContext.Provider value={{ state, actions }}>
            <div className="flex h-screen bg-gray-100">
                {/* Left Sidebar - Settings */}
                <div
                    className={`bg-white shadow-lg flex flex-col overflow-hidden border-r transition-all duration-300 ${selectedElement ? 'w-80' : 'w-0'
                        }`}
                >
                    {selectedElement && (
                        <SettingsPanel
                            element={selectedElement}
                            breakpoint={state.breakpoint}
                            onUpdate={(settings) => actions.updateElement(selectedElement.id, settings)}
                            onDelete={() => actions.deleteElement(selectedElement.id)}
                            onDuplicate={() => actions.duplicateElement(selectedElement.id)}
                            onClose={() => actions.selectElement(null)}
                        />
                    )}
                </div>

                {/* Main Canvas */}
                <div className="flex-1 flex flex-col">
                    {/* Toolbar */}
                    <div className="bg-white shadow-sm border-b p-3 flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            {/* Undo/Redo */}
                            <button
                                onClick={actions.undo}
                                disabled={state.history.past.length === 0}
                                className="p-2 rounded text-gray-600 hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
                                title="Undo (Ctrl+Z)"
                            >
                                <Undo2 size={20} />
                            </button>
                            <button
                                onClick={actions.redo}
                                disabled={state.history.future.length === 0}
                                className="p-2 rounded text-gray-600 hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
                                title="Redo (Ctrl+Y)"
                            >
                                <Redo2 size={20} />
                            </button>

                            <div className="w-px h-6 bg-gray-300 mx-2" />

                            {/* Viewport */}
                            <button
                                onClick={() => actions.setBreakpoint('desktop')}
                                className={`p-2 rounded ${state.breakpoint === 'desktop'
                                    ? 'bg-blue-100 text-blue-600'
                                    : 'text-gray-600 hover:bg-gray-100'
                                    }`}
                                title="Desktop"
                            >
                                <Monitor size={20} />
                            </button>
                            <button
                                onClick={() => actions.setBreakpoint('tablet')}
                                className={`p-2 rounded ${state.breakpoint === 'tablet'
                                    ? 'bg-blue-100 text-blue-600'
                                    : 'text-gray-600 hover:bg-gray-100'
                                    }`}
                                title="Tablet"
                            >
                                <Tablet size={20} />
                            </button>
                            <button
                                onClick={() => actions.setBreakpoint('mobile')}
                                className={`p-2 rounded ${state.breakpoint === 'mobile'
                                    ? 'bg-blue-100 text-blue-600'
                                    : 'text-gray-600 hover:bg-gray-100'
                                    }`}
                                title="Mobile"
                            >
                                <Smartphone size={20} />
                            </button>
                        </div>

                        <div className="flex items-center gap-2">
                            {/* Import */}
                            <label className="flex items-center gap-2 px-3 py-2 bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200 cursor-pointer text-sm">
                                <Upload size={16} />
                                Import HTML
                                <input
                                    type="file"
                                    accept=".html,.htm"
                                    onChange={handleImportHtml}
                                    className="hidden"
                                />
                            </label>

                            {/* JSON */}
                            <button
                                onClick={handleExportJson}
                                className="flex items-center gap-2 px-3 py-2 bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200 text-sm"
                            >
                                <Code size={16} />
                                JSON
                            </button>

                            {/* Export */}
                            <button
                                onClick={handleExportHtml}
                                className="flex items-center gap-2 px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 text-sm"
                            >
                                <Download size={16} />
                                Export HTML
                            </button>
                        </div>
                    </div>

                    {/* Canvas */}
                    <div className="flex-1 overflow-auto bg-gray-200 p-8">
                        <div
                            className={`mx-auto bg-white shadow-lg rounded transition-all ${state.breakpoint === 'mobile'
                                ? 'max-w-[375px]'
                                : state.breakpoint === 'tablet'
                                    ? 'max-w-[768px]'
                                    : 'max-w-full'
                                }`}
                        >
                            {draggedWidgetType && (
                                <div className="bg-blue-50 border border-blue-300 p-3 text-center text-sm text-blue-700 rounded-t">
                                    Dragging <strong>{getWidget(draggedWidgetType)?.label}</strong> - Drop into canvas
                                </div>
                            )}
                            <div
                                ref={containerRef}
                                className="min-h-screen"
                                style={{ contain: 'layout' }}
                            />
                        </div>
                    </div>
                </div>

                {/* Right Sidebar - Elements */}
                <div className="w-64 bg-white shadow-lg flex flex-col overflow-hidden border-l">
                    <div className="p-4 border-b bg-gray-50">
                        <h3 className="font-semibold text-gray-800">Elements</h3>
                        <p className="text-xs text-gray-500 mt-1">Drag to canvas to add</p>
                    </div>
                    <div className="flex-1 overflow-y-auto">
                        <WidgetsPanel
                            onDragStart={(type) => setDraggedWidgetType(type)}
                            onDragEnd={() => setDraggedWidgetType(null)}
                        />
                    </div>
                </div>

                {/* JSON Modal */}
                {showJsonModal && (
                    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                        <div className="bg-white rounded-lg shadow-xl w-[700px] max-h-[80vh] flex flex-col">
                            <div className="p-4 border-b flex items-center justify-between">
                                <h3 className="font-semibold text-gray-800">JSON Data</h3>
                                <button
                                    onClick={() => setShowJsonModal(false)}
                                    className="p-1 text-gray-500 hover:text-gray-700"
                                >
                                    <X size={20} />
                                </button>
                            </div>
                            <div className="flex-1 p-4 overflow-auto">
                                <textarea
                                    value={jsonContent}
                                    onChange={(e) => setJsonContent(e.target.value)}
                                    className="w-full h-[400px] p-3 border rounded-md font-mono text-sm"
                                />
                            </div>
                            <div className="p-4 border-t flex justify-end gap-2">
                                <button
                                    onClick={() => {
                                        navigator.clipboard.writeText(jsonContent);
                                    }}
                                    className="px-4 py-2 bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200"
                                >
                                    Copy
                                </button>
                                <button
                                    onClick={handleImportJson}
                                    className="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600"
                                >
                                    Import JSON
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </EditorContext.Provider>
    );
}
