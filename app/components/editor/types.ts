// ============================================
// ELEMENT BUILDER - TYPE DEFINITIONS
// ============================================

// Responsive value - different values per breakpoint
export type Breakpoint = 'desktop' | 'tablet' | 'mobile';

export type ResponsiveValue<T> = {
    desktop: T;
    tablet?: T;
    mobile?: T;
};

// Make any value responsive
export type MaybeResponsive<T> = T | ResponsiveValue<T>;

// ============================================
// ELEMENT TYPES
// ============================================

export type ElementType =
    | 'section'
    | 'column'
    | 'heading'
    | 'text'
    | 'image'
    | 'button'
    | 'divider'
    | 'spacer'
    | 'html'           // Raw HTML with script/style support
    | 'columns'        // Column layout container (legacy - 4 columns)
    | 'one-column'     // Single column layout
    | 'two-columns'    // Two column layout
    | 'three-columns'; // Three column layout

// Base settings all elements have
export interface BaseSettings {
    // Spacing
    margin?: MaybeResponsive<string>;
    padding?: MaybeResponsive<string>;

    // Size
    width?: MaybeResponsive<string>;
    height?: MaybeResponsive<string>;
    maxWidth?: MaybeResponsive<string>;
    minHeight?: MaybeResponsive<string>;

    // Background
    backgroundColor?: string;
    backgroundImage?: string;
    backgroundSize?: string;
    backgroundPosition?: string;

    // Border
    borderRadius?: string;
    borderWidth?: string;
    borderColor?: string;
    borderStyle?: string;

    // Display
    display?: MaybeResponsive<string>;
    visibility?: MaybeResponsive<'visible' | 'hidden'>;

    // Custom CSS class
    customClass?: string;
    customId?: string;
}

// ============================================
// WIDGET-SPECIFIC SETTINGS
// ============================================

export interface HeadingSettings extends BaseSettings {
    text: string;
    tag: 'h1' | 'h2' | 'h3' | 'h4' | 'h5' | 'h6';
    color?: string;
    fontSize?: MaybeResponsive<string>;
    fontWeight?: string;
    fontFamily?: string;
    textAlign?: MaybeResponsive<'left' | 'center' | 'right' | 'justify'>;
    lineHeight?: string;
    letterSpacing?: string;
}

export interface TextSettings extends BaseSettings {
    text: string;
    color?: string;
    fontSize?: MaybeResponsive<string>;
    fontWeight?: string;
    fontFamily?: string;
    textAlign?: MaybeResponsive<'left' | 'center' | 'right' | 'justify'>;
    lineHeight?: string;
}

export interface ImageSettings extends BaseSettings {
    src: string;
    alt?: string;
    objectFit?: 'cover' | 'contain' | 'fill' | 'none';
    linkUrl?: string;
    linkTarget?: '_self' | '_blank';
}

export interface ButtonSettings extends BaseSettings {
    text: string;
    url: string;
    target?: '_self' | '_blank';
    color?: string;
    backgroundColor?: string;
    fontSize?: MaybeResponsive<string>;
    fontWeight?: string;
    textAlign?: MaybeResponsive<'left' | 'center' | 'right'>;
    borderRadius?: string;
    hoverBackgroundColor?: string;
    hoverColor?: string;
}

export interface DividerSettings extends BaseSettings {
    color?: string;
    thickness?: string;
    style?: 'solid' | 'dashed' | 'dotted';
    width?: MaybeResponsive<string>;
}

export interface SpacerSettings extends BaseSettings {
    height: MaybeResponsive<string>;
}

export interface HtmlSettings extends BaseSettings {
    // Raw HTML content - scripts and styles preserved
    rawHtml: string;
}

export interface ColumnsSettings extends BaseSettings {
    gap?: MaybeResponsive<string>;
    columns: number;
    columnWidths?: string[]; // e.g., ['50%', '50%'] or ['33%', '33%', '34%']
    stackOn?: Breakpoint | 'never'; // Stack columns on this breakpoint and below, or 'never' to never stack
}

export interface SectionSettings extends BaseSettings {
    // Section-specific settings
    fullWidth?: boolean;
    contentWidth?: string;
}

export interface ColumnSettings extends BaseSettings {
    // Individual column settings
    verticalAlign?: 'top' | 'middle' | 'bottom';
}

// Union of all settings
export type ElementSettings =
    | HeadingSettings
    | TextSettings
    | ImageSettings
    | ButtonSettings
    | DividerSettings
    | SpacerSettings
    | HtmlSettings
    | ColumnsSettings
    | SectionSettings
    | ColumnSettings;

// ============================================
// ELEMENT STRUCTURE
// ============================================

export interface BuilderElement {
    id: string;
    type: ElementType;
    settings: ElementSettings;
    children?: BuilderElement[];
}

// ============================================
// EDITOR STATE
// ============================================

export interface EditorState {
    // Document
    elements: BuilderElement[];

    // Global styles
    globalStyles: {
        fontFamily?: string;
        primaryColor?: string;
        secondaryColor?: string;
        bodyBackground?: string;
        contentWidth?: string;
    };

    // Selection
    selectedId: string | null;
    hoveredId: string | null;

    // Viewport
    breakpoint: Breakpoint;

    // Drag state
    draggedId: string | null;
    dragOverId: string | null;
    dragPosition: 'before' | 'after' | 'inside' | null;

    // History
    history: {
        past: BuilderElement[][];
        future: BuilderElement[][];
    };
}

// ============================================
// EDITOR ACTIONS
// ============================================

export interface EditorActions {
    // Element CRUD
    addElement: (parentId: string | null, element: BuilderElement, index?: number) => void;
    updateElement: (id: string, settings: Partial<ElementSettings>) => void;
    deleteElement: (id: string) => void;
    duplicateElement: (id: string) => void;
    moveElement: (id: string, newParentId: string | null, index: number) => void;

    // Selection
    selectElement: (id: string | null) => void;
    hoverElement: (id: string | null) => void;

    // Viewport
    setBreakpoint: (breakpoint: Breakpoint) => void;

    // Drag
    setDragState: (draggedId: string | null, dragOverId?: string | null, position?: 'before' | 'after' | 'inside' | null) => void;

    // History
    undo: () => void;
    redo: () => void;
    saveToHistory: () => void;

    // Batch update (for complex operations)
    setElements: (elements: BuilderElement[]) => void;

    // Global styles
    updateGlobalStyles: (styles: Partial<EditorState['globalStyles']>) => void;

    // Import/Export
    importJson: (json: string) => void;
    exportJson: () => string;
    exportHtml: () => string;
}

// ============================================
// WIDGET DEFINITION (for registry)
// ============================================

export interface WidgetControl {
    type: 'text' | 'textarea' | 'number' | 'select' | 'color' | 'slider' | 'toggle' | 'code' | 'image' | 'url';
    key: string;
    label: string;
    placeholder?: string;
    options?: { label: string; value: string }[];
    min?: number;
    max?: number;
    step?: number;
    responsive?: boolean; // Can have different values per breakpoint
    section?: string; // Group controls into sections
}

export interface WidgetDefinition {
    type: ElementType;
    label: string;
    icon: string;
    category: 'basic' | 'layout' | 'media' | 'advanced';

    // Default settings when widget is created
    defaultSettings: Partial<ElementSettings>;

    // Controls shown in sidebar
    controls: WidgetControl[];

    // Can contain children?
    isContainer?: boolean;

    // Allowed children types (if container)
    allowedChildren?: ElementType[];

    // Render function
    render: (element: BuilderElement, breakpoint: Breakpoint) => string;
}

// ============================================
// UTILITY TYPES
// ============================================

export type DeepPartial<T> = {
    [P in keyof T]?: T[P] extends object ? DeepPartial<T[P]> : T[P];
};

// Generate unique ID
export const generateId = (): string => {
    return `el_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
};

// Get responsive value for current breakpoint
export const getResponsiveValue = <T>(
    value: MaybeResponsive<T> | undefined,
    breakpoint: Breakpoint,
    defaultValue: T
): T => {
    if (value === undefined) return defaultValue;

    if (typeof value === 'object' && value !== null && 'desktop' in value) {
        const responsiveValue = value as ResponsiveValue<T>;

        // Cascade: mobile -> tablet -> desktop
        if (breakpoint === 'mobile') {
            return responsiveValue.mobile ?? responsiveValue.tablet ?? responsiveValue.desktop;
        }
        if (breakpoint === 'tablet') {
            return responsiveValue.tablet ?? responsiveValue.desktop;
        }
        return responsiveValue.desktop;
    }

    return value as T;
};
