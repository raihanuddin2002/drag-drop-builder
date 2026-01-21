import { JSX } from "react";

export type Breakpoint = 'desktop' | 'tablet' | 'mobile';

export type ElementStyles = {
   [key: string]: string;
}

export type InlineLink = {
   href: string;
   text: string;
   index: number;
}

// MS Word-like document - single continuous content stream
export type EditorDocument = {
   id: string;
   name: string;
   pageWidth: Width;
   pageHeight: Height;
   content: string; // Single continuous HTML content
   pageFormat?: string;
}

export type ElementInfo = {
   tag: string;
   styles: ElementStyles;
   content: string;
   innerHTML: string;
   src: string;
   href: string;
   alt: string;
   isHtmlBlock: boolean;
   customCss: string;
   inlineLinks?: InlineLink[];
   // Table context
   isTable?: boolean;
   isTableCell?: boolean;
   tableElement?: HTMLTableElement | null;
   cellRowIndex?: number;
   cellColIndex?: number;
}

export type Block = {
   id: string;
   label: string;
   icon: JSX.Element;
   html: string;
   category: 'blocks' | 'container';
}

export type Height = {
   value: number;
   unit: string;
}

export type Width = {
   value: number;
   unit: string;
}

export type EditorPage = {
   id: string;
   name: string;
   width: Width;
   height: Height;
   html: string;
}

export type PagePreset = {
   key: string;
   name: string;
   width: Width;
   height: Height;
   default?: boolean;
   show: boolean;
}