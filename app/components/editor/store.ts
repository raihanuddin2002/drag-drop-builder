// ============================================
// ELEMENT BUILDER - STATE MANAGEMENT
// ============================================

import { createContext, useContext, useReducer, useCallback, useMemo } from 'react';
import {
    BuilderElement,
    EditorState,
    EditorActions,
    Breakpoint,
    ElementSettings,
    generateId,
} from './types';

// ============================================
// INITIAL STATE
// ============================================

const initialState: EditorState = {
    elements: [],
    globalStyles: {
        fontFamily: 'Arial, sans-serif',
        primaryColor: '#007bff',
        secondaryColor: '#6c757d',
        bodyBackground: '#f5f5f5',
        contentWidth: '600px',
    },
    selectedId: null,
    hoveredId: null,
    breakpoint: 'desktop',
    draggedId: null,
    dragOverId: null,
    dragPosition: null,
    history: {
        past: [],
        future: [],
    },
};

// ============================================
// ACTION TYPES
// ============================================

type Action =
    | { type: 'SET_ELEMENTS'; payload: BuilderElement[] }
    | { type: 'ADD_ELEMENT'; payload: { parentId: string | null; element: BuilderElement; index?: number } }
    | { type: 'UPDATE_ELEMENT'; payload: { id: string; settings: Partial<ElementSettings> } }
    | { type: 'DELETE_ELEMENT'; payload: string }
    | { type: 'DUPLICATE_ELEMENT'; payload: string }
    | { type: 'MOVE_ELEMENT'; payload: { id: string; newParentId: string | null; index: number } }
    | { type: 'SELECT_ELEMENT'; payload: string | null }
    | { type: 'HOVER_ELEMENT'; payload: string | null }
    | { type: 'SET_BREAKPOINT'; payload: Breakpoint }
    | { type: 'SET_DRAG_STATE'; payload: { draggedId: string | null; dragOverId?: string | null; position?: 'before' | 'after' | 'inside' | null } }
    | { type: 'UNDO' }
    | { type: 'REDO' }
    | { type: 'SAVE_HISTORY' }
    | { type: 'UPDATE_GLOBAL_STYLES'; payload: Partial<EditorState['globalStyles']> }
    | { type: 'IMPORT_JSON'; payload: BuilderElement[] };

// ============================================
// HELPER FUNCTIONS
// ============================================

// Deep clone elements
const cloneElements = (elements: BuilderElement[]): BuilderElement[] => {
    return JSON.parse(JSON.stringify(elements));
};

// Find element by ID (recursive)
const findElementById = (
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

// Find parent of element
const findParentOfElement = (
    elements: BuilderElement[],
    id: string,
    parent: BuilderElement | null = null
): BuilderElement | null => {
    for (const el of elements) {
        if (el.id === id) return parent;
        if (el.children) {
            const found = findParentOfElement(el.children, id, el);
            if (found !== undefined) return found;
        }
    }
    return null;
};

// Update element in tree (immutable)
const updateElementInTree = (
    elements: BuilderElement[],
    id: string,
    settings: Partial<ElementSettings>
): BuilderElement[] => {
    return elements.map((el) => {
        if (el.id === id) {
            return { ...el, settings: { ...el.settings, ...settings } };
        }
        if (el.children) {
            return { ...el, children: updateElementInTree(el.children, id, settings) };
        }
        return el;
    });
};

// Delete element from tree (immutable)
const deleteElementFromTree = (
    elements: BuilderElement[],
    id: string
): BuilderElement[] => {
    return elements
        .filter((el) => el.id !== id)
        .map((el) => {
            if (el.children) {
                return { ...el, children: deleteElementFromTree(el.children, id) };
            }
            return el;
        });
};

// Add element to tree (immutable)
const addElementToTree = (
    elements: BuilderElement[],
    parentId: string | null,
    newElement: BuilderElement,
    index?: number
): BuilderElement[] => {
    // If no parent, add to root
    if (parentId === null) {
        if (index !== undefined) {
            const newElements = [...elements];
            newElements.splice(index, 0, newElement);
            return newElements;
        }
        return [...elements, newElement];
    }

    // Add to specific parent
    return elements.map((el) => {
        if (el.id === parentId) {
            const children = el.children || [];
            if (index !== undefined) {
                const newChildren = [...children];
                newChildren.splice(index, 0, newElement);
                return { ...el, children: newChildren };
            }
            return { ...el, children: [...children, newElement] };
        }
        if (el.children) {
            return { ...el, children: addElementToTree(el.children, parentId, newElement, index) };
        }
        return el;
    });
};

// Duplicate element with new IDs
const duplicateElementWithNewIds = (element: BuilderElement): BuilderElement => {
    const newElement: BuilderElement = {
        ...element,
        id: generateId(),
        settings: { ...element.settings },
    };
    if (element.children) {
        newElement.children = element.children.map(duplicateElementWithNewIds);
    }
    return newElement;
};

// Move element in tree
const moveElementInTree = (
    elements: BuilderElement[],
    id: string,
    newParentId: string | null,
    index: number
): BuilderElement[] => {
    // Find and remove element
    let movedElement: BuilderElement | null = null;

    const removeElement = (els: BuilderElement[]): BuilderElement[] => {
        return els
            .filter((el) => {
                if (el.id === id) {
                    movedElement = el;
                    return false;
                }
                return true;
            })
            .map((el) => {
                if (el.children) {
                    return { ...el, children: removeElement(el.children) };
                }
                return el;
            });
    };

    let newElements = removeElement(elements);

    if (!movedElement) return elements;

    // Add to new position
    return addElementToTree(newElements, newParentId, movedElement, index);
};

// ============================================
// REDUCER
// ============================================

const reducer = (state: EditorState, action: Action): EditorState => {
    switch (action.type) {
        case 'SET_ELEMENTS':
            return { ...state, elements: action.payload };

        case 'ADD_ELEMENT': {
            const { parentId, element, index } = action.payload;
            return {
                ...state,
                elements: addElementToTree(state.elements, parentId, element, index),
            };
        }

        case 'UPDATE_ELEMENT': {
            const { id, settings } = action.payload;
            return {
                ...state,
                elements: updateElementInTree(state.elements, id, settings),
            };
        }

        case 'DELETE_ELEMENT':
            return {
                ...state,
                elements: deleteElementFromTree(state.elements, action.payload),
                selectedId: state.selectedId === action.payload ? null : state.selectedId,
            };

        case 'DUPLICATE_ELEMENT': {
            const element = findElementById(state.elements, action.payload);
            if (!element) return state;

            const parent = findParentOfElement(state.elements, action.payload);
            const parentId = parent?.id || null;

            // Find index of original element
            const siblings = parent?.children || state.elements;
            const originalIndex = siblings.findIndex((el) => el.id === action.payload);

            const duplicated = duplicateElementWithNewIds(element);
            return {
                ...state,
                elements: addElementToTree(state.elements, parentId, duplicated, originalIndex + 1),
            };
        }

        case 'MOVE_ELEMENT': {
            const { id, newParentId, index } = action.payload;
            return {
                ...state,
                elements: moveElementInTree(state.elements, id, newParentId, index),
            };
        }

        case 'SELECT_ELEMENT':
            return { ...state, selectedId: action.payload };

        case 'HOVER_ELEMENT':
            return { ...state, hoveredId: action.payload };

        case 'SET_BREAKPOINT':
            return { ...state, breakpoint: action.payload };

        case 'SET_DRAG_STATE':
            return {
                ...state,
                draggedId: action.payload.draggedId,
                dragOverId: action.payload.dragOverId ?? state.dragOverId,
                dragPosition: action.payload.position ?? state.dragPosition,
            };

        case 'SAVE_HISTORY':
            return {
                ...state,
                history: {
                    past: [...state.history.past, cloneElements(state.elements)].slice(-50), // Keep last 50
                    future: [],
                },
            };

        case 'UNDO': {
            if (state.history.past.length === 0) return state;
            const past = [...state.history.past];
            const previous = past.pop()!;
            return {
                ...state,
                elements: previous,
                history: {
                    past,
                    future: [cloneElements(state.elements), ...state.history.future],
                },
            };
        }

        case 'REDO': {
            if (state.history.future.length === 0) return state;
            const future = [...state.history.future];
            const next = future.shift()!;
            return {
                ...state,
                elements: next,
                history: {
                    past: [...state.history.past, cloneElements(state.elements)],
                    future,
                },
            };
        }

        case 'UPDATE_GLOBAL_STYLES':
            return {
                ...state,
                globalStyles: { ...state.globalStyles, ...action.payload },
            };

        case 'IMPORT_JSON':
            return {
                ...state,
                elements: action.payload,
                selectedId: null,
                history: { past: [], future: [] },
            };

        default:
            return state;
    }
};

// ============================================
// CONTEXT
// ============================================

interface EditorContextValue {
    state: EditorState;
    actions: EditorActions;
}

export const EditorContext = createContext<EditorContextValue | null>(null);

// ============================================
// HOOK
// ============================================

export const useEditorStore = () => {
    const context = useContext(EditorContext);
    if (!context) {
        throw new Error('useEditorStore must be used within EditorProvider');
    }
    return context;
};

// ============================================
// PROVIDER HOOK (to be used in component)
// ============================================

export const useCreateEditorStore = (initialElements?: BuilderElement[]) => {
    const [state, dispatch] = useReducer(reducer, {
        ...initialState,
        elements: initialElements || [],
    });

    const actions: EditorActions = useMemo(() => ({
        addElement: (parentId, element, index) => {
            dispatch({ type: 'SAVE_HISTORY' });
            dispatch({ type: 'ADD_ELEMENT', payload: { parentId, element, index } });
        },

        updateElement: (id, settings) => {
            dispatch({ type: 'UPDATE_ELEMENT', payload: { id, settings } });
        },

        deleteElement: (id) => {
            dispatch({ type: 'SAVE_HISTORY' });
            dispatch({ type: 'DELETE_ELEMENT', payload: id });
        },

        duplicateElement: (id) => {
            dispatch({ type: 'SAVE_HISTORY' });
            dispatch({ type: 'DUPLICATE_ELEMENT', payload: id });
        },

        moveElement: (id, newParentId, index) => {
            dispatch({ type: 'SAVE_HISTORY' });
            dispatch({ type: 'MOVE_ELEMENT', payload: { id, newParentId, index } });
        },

        selectElement: (id) => {
            dispatch({ type: 'SELECT_ELEMENT', payload: id });
        },

        hoverElement: (id) => {
            dispatch({ type: 'HOVER_ELEMENT', payload: id });
        },

        setBreakpoint: (breakpoint) => {
            dispatch({ type: 'SET_BREAKPOINT', payload: breakpoint });
        },

        setDragState: (draggedId, dragOverId, position) => {
            dispatch({ type: 'SET_DRAG_STATE', payload: { draggedId, dragOverId, position } });
        },

        undo: () => dispatch({ type: 'UNDO' }),
        redo: () => dispatch({ type: 'REDO' }),
        saveToHistory: () => dispatch({ type: 'SAVE_HISTORY' }),

        setElements: (elements) => {
            dispatch({ type: 'SAVE_HISTORY' });
            dispatch({ type: 'SET_ELEMENTS', payload: elements });
        },

        updateGlobalStyles: (styles) => {
            dispatch({ type: 'UPDATE_GLOBAL_STYLES', payload: styles });
        },

        importJson: (json) => {
            try {
                const data = JSON.parse(json);
                if (Array.isArray(data)) {
                    dispatch({ type: 'IMPORT_JSON', payload: data });
                } else if (data.elements) {
                    dispatch({ type: 'IMPORT_JSON', payload: data.elements });
                }
            } catch (e) {
                console.error('Invalid JSON', e);
            }
        },

        exportJson: () => {
            return JSON.stringify({
                version: '1.0',
                elements: state.elements,
                globalStyles: state.globalStyles,
            }, null, 2);
        },

        exportHtml: () => {
            // This will be implemented with the render engine
            return '';
        },
    }), [state.elements, state.globalStyles]);

    return { state, actions };
};

// ============================================
// UTILITY HOOKS
// ============================================

export const useSelectedElement = () => {
    const { state } = useEditorStore();
    if (!state.selectedId) return null;

    const findElement = (elements: BuilderElement[]): BuilderElement | null => {
        for (const el of elements) {
            if (el.id === state.selectedId) return el;
            if (el.children) {
                const found = findElement(el.children);
                if (found) return found;
            }
        }
        return null;
    };

    return findElement(state.elements);
};

export const useCanUndo = () => {
    const { state } = useEditorStore();
    return state.history.past.length > 0;
};

export const useCanRedo = () => {
    const { state } = useEditorStore();
    return state.history.future.length > 0;
};
