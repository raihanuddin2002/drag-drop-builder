// ============================================
// ELEMENT BUILDER - WIDGET REGISTRY
// ============================================

import {
    BuilderElement,
    WidgetDefinition,
    Breakpoint,
    getResponsiveValue,
    generateId,
    HeadingSettings,
    TextSettings,
    ImageSettings,
    ButtonSettings,
    DividerSettings,
    SpacerSettings,
    HtmlSettings,
    ColumnsSettings,
    ColumnSettings,
} from './types';

// ============================================
// STYLE HELPERS
// ============================================

const buildStyleString = (styles: Record<string, string | undefined>): string => {
    return Object.entries(styles)
        .filter(([_, value]) => value !== undefined && value !== '')
        .map(([key, value]) => {
            // Convert camelCase to kebab-case
            const kebabKey = key.replace(/([A-Z])/g, '-$1').toLowerCase();
            return `${kebabKey}: ${value}`;
        })
        .join('; ');
};

const getBaseStyles = (settings: any, breakpoint: Breakpoint): Record<string, string | undefined> => {
    return {
        margin: getResponsiveValue(settings.margin, breakpoint, undefined),
        padding: getResponsiveValue(settings.padding, breakpoint, undefined),
        width: getResponsiveValue(settings.width, breakpoint, undefined),
        height: getResponsiveValue(settings.height, breakpoint, undefined),
        maxWidth: getResponsiveValue(settings.maxWidth, breakpoint, undefined),
        minHeight: getResponsiveValue(settings.minHeight, breakpoint, undefined),
        backgroundColor: settings.backgroundColor,
        backgroundImage: settings.backgroundImage ? `url(${settings.backgroundImage})` : undefined,
        backgroundSize: settings.backgroundSize,
        backgroundPosition: settings.backgroundPosition,
        borderRadius: settings.borderRadius,
        borderWidth: settings.borderWidth,
        borderColor: settings.borderColor,
        borderStyle: settings.borderStyle,
        display: getResponsiveValue(settings.display, breakpoint, undefined),
        visibility: getResponsiveValue(settings.visibility, breakpoint, undefined),
    };
};

// ============================================
// WIDGET DEFINITIONS
// ============================================

export const widgets: Record<string, WidgetDefinition> = {
    // ==========================================
    // HEADING
    // ==========================================
    heading: {
        type: 'heading',
        label: 'Heading',
        icon: '📝',
        category: 'basic',
        defaultSettings: {
            text: 'New Heading',
            tag: 'h2',
            color: '#333333',
            fontSize: { desktop: '24px', tablet: '22px', mobile: '20px' },
            fontWeight: 'bold',
            textAlign: { desktop: 'left' },
            margin: '0 0 15px 0',
        },
        controls: [
            { type: 'textarea', key: 'text', label: 'Text', section: 'Content' },
            {
                type: 'select', key: 'tag', label: 'Tag', section: 'Content',
                options: [
                    { label: 'H1', value: 'h1' },
                    { label: 'H2', value: 'h2' },
                    { label: 'H3', value: 'h3' },
                    { label: 'H4', value: 'h4' },
                    { label: 'H5', value: 'h5' },
                    { label: 'H6', value: 'h6' },
                ]
            },
            { type: 'color', key: 'color', label: 'Color', section: 'Style' },
            { type: 'text', key: 'fontSize', label: 'Font Size', responsive: true, section: 'Style' },
            {
                type: 'select', key: 'fontWeight', label: 'Font Weight', section: 'Style',
                options: [
                    { label: 'Normal', value: 'normal' },
                    { label: 'Bold', value: 'bold' },
                    { label: '100', value: '100' },
                    { label: '300', value: '300' },
                    { label: '500', value: '500' },
                    { label: '700', value: '700' },
                    { label: '900', value: '900' },
                ]
            },
            {
                type: 'select', key: 'textAlign', label: 'Alignment', responsive: true, section: 'Style',
                options: [
                    { label: 'Left', value: 'left' },
                    { label: 'Center', value: 'center' },
                    { label: 'Right', value: 'right' },
                ]
            },
            { type: 'text', key: 'lineHeight', label: 'Line Height', section: 'Style' },
            { type: 'text', key: 'letterSpacing', label: 'Letter Spacing', section: 'Style' },
            { type: 'text', key: 'margin', label: 'Margin', responsive: true, section: 'Spacing' },
            { type: 'text', key: 'padding', label: 'Padding', responsive: true, section: 'Spacing' },
        ],
        render: (element, breakpoint) => {
            const settings = element.settings as HeadingSettings;
            const tag = settings.tag || 'h2';
            const styles = buildStyleString({
                ...getBaseStyles(settings, breakpoint),
                color: settings.color,
                fontSize: getResponsiveValue(settings.fontSize, breakpoint, '24px'),
                fontWeight: settings.fontWeight,
                fontFamily: settings.fontFamily,
                textAlign: getResponsiveValue(settings.textAlign, breakpoint, 'left'),
                lineHeight: settings.lineHeight,
                letterSpacing: settings.letterSpacing,
            });
            return `<${tag} style="${styles}">${settings.text || ''}</${tag}>`;
        },
    },

    // ==========================================
    // TEXT / PARAGRAPH
    // ==========================================
    text: {
        type: 'text',
        label: 'Text',
        icon: '📄',
        category: 'basic',
        defaultSettings: {
            text: 'Add your text here. Click to edit this paragraph.',
            color: '#666666',
            fontSize: { desktop: '16px', tablet: '15px', mobile: '14px' },
            lineHeight: '1.6',
            textAlign: { desktop: 'left' },
            margin: '0 0 15px 0',
        },
        controls: [
            { type: 'textarea', key: 'text', label: 'Text', section: 'Content' },
            { type: 'color', key: 'color', label: 'Color', section: 'Style' },
            { type: 'text', key: 'fontSize', label: 'Font Size', responsive: true, section: 'Style' },
            {
                type: 'select', key: 'fontWeight', label: 'Font Weight', section: 'Style',
                options: [
                    { label: 'Normal', value: 'normal' },
                    { label: 'Bold', value: 'bold' },
                ]
            },
            {
                type: 'select', key: 'textAlign', label: 'Alignment', responsive: true, section: 'Style',
                options: [
                    { label: 'Left', value: 'left' },
                    { label: 'Center', value: 'center' },
                    { label: 'Right', value: 'right' },
                    { label: 'Justify', value: 'justify' },
                ]
            },
            { type: 'text', key: 'lineHeight', label: 'Line Height', section: 'Style' },
            { type: 'text', key: 'margin', label: 'Margin', responsive: true, section: 'Spacing' },
            { type: 'text', key: 'padding', label: 'Padding', responsive: true, section: 'Spacing' },
        ],
        render: (element, breakpoint) => {
            const settings = element.settings as TextSettings;
            const styles = buildStyleString({
                ...getBaseStyles(settings, breakpoint),
                color: settings.color,
                fontSize: getResponsiveValue(settings.fontSize, breakpoint, '16px'),
                fontWeight: settings.fontWeight,
                fontFamily: settings.fontFamily,
                textAlign: getResponsiveValue(settings.textAlign, breakpoint, 'left'),
                lineHeight: settings.lineHeight,
            });
            return `<p style="${styles}">${settings.text || ''}</p>`;
        },
    },

    // ==========================================
    // IMAGE
    // ==========================================
    image: {
        type: 'image',
        label: 'Image',
        icon: '🖼️',
        category: 'media',
        defaultSettings: {
            src: 'https://via.placeholder.com/600x300',
            alt: 'Image',
            width: { desktop: '100%' },
            objectFit: 'cover',
            margin: '0 0 15px 0',
        },
        controls: [
            { type: 'image', key: 'src', label: 'Image URL', section: 'Content' },
            { type: 'text', key: 'alt', label: 'Alt Text', section: 'Content' },
            { type: 'url', key: 'linkUrl', label: 'Link URL', section: 'Content' },
            {
                type: 'select', key: 'linkTarget', label: 'Link Target', section: 'Content',
                options: [
                    { label: 'Same Window', value: '_self' },
                    { label: 'New Window', value: '_blank' },
                ]
            },
            { type: 'text', key: 'width', label: 'Width', responsive: true, section: 'Style' },
            { type: 'text', key: 'height', label: 'Height', responsive: true, section: 'Style' },
            {
                type: 'select', key: 'objectFit', label: 'Object Fit', section: 'Style',
                options: [
                    { label: 'Cover', value: 'cover' },
                    { label: 'Contain', value: 'contain' },
                    { label: 'Fill', value: 'fill' },
                    { label: 'None', value: 'none' },
                ]
            },
            { type: 'text', key: 'borderRadius', label: 'Border Radius', section: 'Style' },
            { type: 'text', key: 'margin', label: 'Margin', responsive: true, section: 'Spacing' },
            { type: 'text', key: 'padding', label: 'Padding', responsive: true, section: 'Spacing' },
        ],
        render: (element, breakpoint) => {
            const settings = element.settings as ImageSettings;
            const styles = buildStyleString({
                ...getBaseStyles(settings, breakpoint),
                display: 'block',
                objectFit: settings.objectFit,
            });
            const img = `<img src="${settings.src || ''}" alt="${settings.alt || ''}" style="${styles}" />`;

            if (settings.linkUrl) {
                return `<a href="${settings.linkUrl}" target="${settings.linkTarget || '_self'}">${img}</a>`;
            }
            return img;
        },
    },

    // ==========================================
    // BUTTON
    // ==========================================
    button: {
        type: 'button',
        label: 'Button',
        icon: '🔘',
        category: 'basic',
        defaultSettings: {
            text: 'Click Me',
            url: '#',
            target: '_self',
            color: '#ffffff',
            backgroundColor: '#007bff',
            fontSize: { desktop: '16px' },
            fontWeight: 'normal',
            padding: '12px 30px',
            borderRadius: '4px',
            textAlign: { desktop: 'left' },
            margin: '10px 0',
        },
        controls: [
            { type: 'text', key: 'text', label: 'Button Text', section: 'Content' },
            { type: 'url', key: 'url', label: 'URL', section: 'Content' },
            {
                type: 'select', key: 'target', label: 'Open In', section: 'Content',
                options: [
                    { label: 'Same Window', value: '_self' },
                    { label: 'New Window', value: '_blank' },
                ]
            },
            { type: 'color', key: 'color', label: 'Text Color', section: 'Style' },
            { type: 'color', key: 'backgroundColor', label: 'Background', section: 'Style' },
            { type: 'text', key: 'fontSize', label: 'Font Size', responsive: true, section: 'Style' },
            {
                type: 'select', key: 'fontWeight', label: 'Font Weight', section: 'Style',
                options: [
                    { label: 'Normal', value: 'normal' },
                    { label: 'Bold', value: 'bold' },
                ]
            },
            { type: 'text', key: 'borderRadius', label: 'Border Radius', section: 'Style' },
            { type: 'text', key: 'padding', label: 'Padding', responsive: true, section: 'Spacing' },
            { type: 'text', key: 'margin', label: 'Margin', responsive: true, section: 'Spacing' },
            {
                type: 'select', key: 'textAlign', label: 'Alignment', responsive: true, section: 'Style',
                options: [
                    { label: 'Left', value: 'left' },
                    { label: 'Center', value: 'center' },
                    { label: 'Right', value: 'right' },
                ]
            },
        ],
        render: (element, breakpoint) => {
            const settings = element.settings as ButtonSettings;
            const wrapperStyles = buildStyleString({
                textAlign: getResponsiveValue(settings.textAlign, breakpoint, 'left'),
                margin: getResponsiveValue(settings.margin, breakpoint, '10px 0'),
            });
            const buttonStyles = buildStyleString({
                display: 'inline-block',
                color: settings.color,
                backgroundColor: settings.backgroundColor,
                fontSize: getResponsiveValue(settings.fontSize, breakpoint, '16px'),
                fontWeight: settings.fontWeight,
                padding: getResponsiveValue(settings.padding, breakpoint, '12px 30px'),
                borderRadius: settings.borderRadius,
                textDecoration: 'none',
                border: 'none',
                cursor: 'pointer',
            });
            return `<div style="${wrapperStyles}"><a href="${settings.url || '#'}" target="${settings.target || '_self'}" style="${buttonStyles}">${settings.text || 'Button'}</a></div>`;
        },
    },

    // ==========================================
    // DIVIDER
    // ==========================================
    divider: {
        type: 'divider',
        label: 'Divider',
        icon: '➖',
        category: 'basic',
        defaultSettings: {
            color: '#e5e7eb',
            thickness: '2px',
            style: 'solid',
            width: { desktop: '100%' },
            margin: '20px 0',
        },
        controls: [
            { type: 'color', key: 'color', label: 'Color', section: 'Style' },
            { type: 'text', key: 'thickness', label: 'Thickness', section: 'Style' },
            {
                type: 'select', key: 'style', label: 'Style', section: 'Style',
                options: [
                    { label: 'Solid', value: 'solid' },
                    { label: 'Dashed', value: 'dashed' },
                    { label: 'Dotted', value: 'dotted' },
                ]
            },
            { type: 'text', key: 'width', label: 'Width', responsive: true, section: 'Style' },
            { type: 'text', key: 'margin', label: 'Margin', responsive: true, section: 'Spacing' },
        ],
        render: (element, breakpoint) => {
            const settings = element.settings as DividerSettings;
            const styles = buildStyleString({
                border: 'none',
                borderTop: `${settings.thickness || '2px'} ${settings.style || 'solid'} ${settings.color || '#e5e7eb'}`,
                width: getResponsiveValue(settings.width, breakpoint, '100%'),
                margin: getResponsiveValue(settings.margin, breakpoint, '20px 0'),
            });
            return `<hr style="${styles}" />`;
        },
    },

    // ==========================================
    // SPACER
    // ==========================================
    spacer: {
        type: 'spacer',
        label: 'Spacer',
        icon: '⬜',
        category: 'basic',
        defaultSettings: {
            height: { desktop: '40px', tablet: '30px', mobile: '20px' },
        },
        controls: [
            { type: 'text', key: 'height', label: 'Height', responsive: true, section: 'Style' },
        ],
        render: (element, breakpoint) => {
            const settings = element.settings as SpacerSettings;
            const styles = buildStyleString({
                height: getResponsiveValue(settings.height, breakpoint, '40px'),
            });
            return `<div style="${styles}"></div>`;
        },
    },

    // ==========================================
    // RAW HTML (with script/style support)
    // ==========================================
    html: {
        type: 'html',
        label: 'HTML',
        icon: '🧩',
        category: 'advanced',
        defaultSettings: {
            rawHtml: '<div style="padding: 20px; background: #f0f0f0; border-radius: 4px;">\n  <p>Custom HTML content</p>\n</div>',
        },
        controls: [
            { type: 'code', key: 'rawHtml', label: 'HTML Code', section: 'Content' },
            { type: 'text', key: 'margin', label: 'Margin', responsive: true, section: 'Spacing' },
            { type: 'text', key: 'padding', label: 'Padding', responsive: true, section: 'Spacing' },
        ],
        render: (element, breakpoint) => {
            const settings = element.settings as HtmlSettings;
            const wrapperStyles = buildStyleString({
                margin: getResponsiveValue(settings.margin, breakpoint, undefined),
                padding: getResponsiveValue(settings.padding, breakpoint, undefined),
            });
            // Raw HTML is passed through without modification
            // Scripts and styles are preserved
            if (wrapperStyles) {
                return `<div style="${wrapperStyles}">${settings.rawHtml || ''}</div>`;
            }
            return settings.rawHtml || '';
        },
    },

    // ==========================================
    // ONE COLUMN LAYOUT
    // ==========================================
    'one-column': {
        type: 'one-column',
        label: '1 Column',
        icon: '⬜',
        category: 'layout',
        isContainer: true,
        allowedChildren: ['column'],
        defaultSettings: {
            columns: 1,
            gap: { desktop: '0px' },
            stackOn: 'never',
            margin: '20px 0',
        },
        controls: [
            { type: 'text', key: 'gap', label: 'Gap', responsive: true, section: 'Layout' },
            {
                type: 'select', key: 'stackOn', label: 'Stack On', section: 'Layout',
                options: [
                    { label: 'Never', value: 'never' },
                    { label: 'Mobile', value: 'mobile' },
                    { label: 'Tablet', value: 'tablet' },
                ]
            },
            { type: 'text', key: 'margin', label: 'Margin', responsive: true, section: 'Spacing' },
            { type: 'text', key: 'padding', label: 'Padding', responsive: true, section: 'Spacing' },
        ],
        render: (element, breakpoint) => {
            const settings = element.settings as ColumnsSettings;
            const styles = buildStyleString({
                display: 'block',
                margin: getResponsiveValue(settings.margin, breakpoint, '20px 0'),
                padding: getResponsiveValue(settings.padding, breakpoint, undefined),
            });
            return `<div style="${styles}" data-columns="1">{{children}}</div>`;
        },
    },

    // ==========================================
    // TWO COLUMNS LAYOUT
    // ==========================================
    'two-columns': {
        type: 'two-columns',
        label: '2 Columns',
        icon: '⬜⬜',
        category: 'layout',
        isContainer: true,
        allowedChildren: ['column'],
        defaultSettings: {
            columns: 2,
            gap: { desktop: '20px', tablet: '15px', mobile: '10px' },
            stackOn: 'mobile',
            margin: '20px 0',
        },
        controls: [
            { type: 'text', key: 'gap', label: 'Gap', responsive: true, section: 'Layout' },
            {
                type: 'select', key: 'stackOn', label: 'Stack On', section: 'Layout',
                options: [
                    { label: 'Never', value: 'never' },
                    { label: 'Mobile', value: 'mobile' },
                    { label: 'Tablet', value: 'tablet' },
                ]
            },
            { type: 'text', key: 'margin', label: 'Margin', responsive: true, section: 'Spacing' },
            { type: 'text', key: 'padding', label: 'Padding', responsive: true, section: 'Spacing' },
        ],
        render: (element, breakpoint) => {
            const settings = element.settings as ColumnsSettings;
            const shouldStack =
                (settings.stackOn === 'mobile' && breakpoint === 'mobile') ||
                (settings.stackOn === 'tablet' && (breakpoint === 'mobile' || breakpoint === 'tablet'));

            const styles = buildStyleString({
                display: shouldStack ? 'block' : 'flex',
                gap: shouldStack ? '0' : getResponsiveValue(settings.gap, breakpoint, '20px'),
                margin: getResponsiveValue(settings.margin, breakpoint, '20px 0'),
                padding: getResponsiveValue(settings.padding, breakpoint, undefined),
            });
            return `<div style="${styles}" data-columns="2">{{children}}</div>`;
        },
    },

    // ==========================================
    // THREE COLUMNS LAYOUT
    // ==========================================
    'three-columns': {
        type: 'three-columns',
        label: '3 Columns',
        icon: '⬜⬜⬜',
        category: 'layout',
        isContainer: true,
        allowedChildren: ['column'],
        defaultSettings: {
            columns: 3,
            gap: { desktop: '20px', tablet: '15px', mobile: '10px' },
            stackOn: 'mobile',
            margin: '20px 0',
        },
        controls: [
            { type: 'text', key: 'gap', label: 'Gap', responsive: true, section: 'Layout' },
            {
                type: 'select', key: 'stackOn', label: 'Stack On', section: 'Layout',
                options: [
                    { label: 'Never', value: 'never' },
                    { label: 'Mobile', value: 'mobile' },
                    { label: 'Tablet', value: 'tablet' },
                ]
            },
            { type: 'text', key: 'margin', label: 'Margin', responsive: true, section: 'Spacing' },
            { type: 'text', key: 'padding', label: 'Padding', responsive: true, section: 'Spacing' },
        ],
        render: (element, breakpoint) => {
            const settings = element.settings as ColumnsSettings;
            const shouldStack =
                (settings.stackOn === 'mobile' && breakpoint === 'mobile') ||
                (settings.stackOn === 'tablet' && (breakpoint === 'mobile' || breakpoint === 'tablet'));

            const styles = buildStyleString({
                display: shouldStack ? 'block' : 'flex',
                gap: shouldStack ? '0' : getResponsiveValue(settings.gap, breakpoint, '20px'),
                margin: getResponsiveValue(settings.margin, breakpoint, '20px 0'),
                padding: getResponsiveValue(settings.padding, breakpoint, undefined),
            });
            return `<div style="${styles}" data-columns="3">{{children}}</div>`;
        },
    },

    // ==========================================
    // COLUMNS LAYOUT (legacy - 4 columns)
    // ==========================================
    columns: {
        type: 'columns',
        label: '4 Columns',
        icon: '⬜⬜⬜⬜',
        category: 'layout',
        isContainer: true,
        allowedChildren: ['column'],
        defaultSettings: {
            columns: 4,
            gap: { desktop: '20px', tablet: '15px', mobile: '10px' },
            stackOn: 'mobile',
            margin: '20px 0',
        },
        controls: [
            {
                type: 'select', key: 'columns', label: 'Columns', section: 'Layout',
                options: [
                    { label: '2 Columns', value: '2' },
                    { label: '3 Columns', value: '3' },
                    { label: '4 Columns', value: '4' },
                ]
            },
            { type: 'text', key: 'gap', label: 'Gap', responsive: true, section: 'Layout' },
            {
                type: 'select', key: 'stackOn', label: 'Stack On', section: 'Layout',
                options: [
                    { label: 'Never', value: 'never' },
                    { label: 'Mobile', value: 'mobile' },
                    { label: 'Tablet', value: 'tablet' },
                ]
            },
            { type: 'text', key: 'margin', label: 'Margin', responsive: true, section: 'Spacing' },
            { type: 'text', key: 'padding', label: 'Padding', responsive: true, section: 'Spacing' },
        ],
        render: (element, breakpoint) => {
            const settings = element.settings as ColumnsSettings;
            const shouldStack =
                (settings.stackOn === 'mobile' && breakpoint === 'mobile') ||
                (settings.stackOn === 'tablet' && (breakpoint === 'mobile' || breakpoint === 'tablet'));

            const styles = buildStyleString({
                display: shouldStack ? 'block' : 'flex',
                gap: shouldStack ? '0' : getResponsiveValue(settings.gap, breakpoint, '20px'),
                margin: getResponsiveValue(settings.margin, breakpoint, '20px 0'),
                padding: getResponsiveValue(settings.padding, breakpoint, undefined),
            });

            // Children will be rendered separately
            return `<div style="${styles}" data-columns="${settings.columns || 2}">{{children}}</div>`;
        },
    },

    // ==========================================
    // SINGLE COLUMN (child of columns)
    // ==========================================
    column: {
        type: 'column',
        label: 'Column',
        icon: '⬜',
        category: 'layout',
        isContainer: true,
        defaultSettings: {
            padding: '10px',
            verticalAlign: 'top',
        },
        controls: [
            { type: 'text', key: 'width', label: 'Width', responsive: true, section: 'Style' },
            {
                type: 'select', key: 'verticalAlign', label: 'Vertical Align', section: 'Style',
                options: [
                    { label: 'Top', value: 'top' },
                    { label: 'Middle', value: 'middle' },
                    { label: 'Bottom', value: 'bottom' },
                ]
            },
            { type: 'color', key: 'backgroundColor', label: 'Background', section: 'Style' },
            { type: 'text', key: 'padding', label: 'Padding', responsive: true, section: 'Spacing' },
            { type: 'text', key: 'borderRadius', label: 'Border Radius', section: 'Style' },
        ],
        render: (element, breakpoint) => {
            const settings = element.settings as ColumnSettings;
            const alignItems = {
                top: 'flex-start',
                middle: 'center',
                bottom: 'flex-end',
            }[settings.verticalAlign || 'top'];

            const styles = buildStyleString({
                flex: getResponsiveValue(settings.width, breakpoint, undefined) ? `0 0 ${getResponsiveValue(settings.width, breakpoint, 'auto')}` : '1',
                display: 'flex',
                flexDirection: 'column',
                alignItems,
                padding: getResponsiveValue(settings.padding, breakpoint, '10px'),
                backgroundColor: settings.backgroundColor,
                borderRadius: settings.borderRadius,
                minHeight: '50px',
            });

            return `<div style="${styles}" data-column="true">{{children}}</div>`;
        },
    },
};

// ============================================
// WIDGET HELPERS
// ============================================

export const getWidget = (type: string): WidgetDefinition | null => {
    return widgets[type] || null;
};

export const getWidgetsByCategory = (category: string): WidgetDefinition[] => {
    return Object.values(widgets).filter((w) => w.category === category);
};

export const getAllWidgets = (): WidgetDefinition[] => {
    return Object.values(widgets);
};

// ============================================
// CREATE DEFAULT ELEMENT
// ============================================

export const createDefaultElement = (type: string): BuilderElement | null => {
    const widget = getWidget(type);
    if (!widget) return null;

    const element: BuilderElement = {
        id: generateId(),
        type: widget.type,
        settings: { ...widget.defaultSettings } as any,
    };

    // For column layout types, create child column elements
    const columnTypes = ['columns', 'one-column', 'two-columns', 'three-columns'];
    if (columnTypes.includes(type)) {
        const settings = element.settings as ColumnsSettings;
        const columnCount = settings.columns || 2;
        element.children = [];

        for (let i = 0; i < columnCount; i++) {
            element.children.push({
                id: generateId(),
                type: 'column',
                settings: { ...widgets.column.defaultSettings } as ColumnSettings,
                children: [],
            });
        }
    }

    // For container types, initialize children array
    if (widget.isContainer && !element.children) {
        element.children = [];
    }

    return element;
};
