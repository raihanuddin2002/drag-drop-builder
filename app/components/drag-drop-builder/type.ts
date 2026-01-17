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
}

export type Component = {
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

export type Page = {
   id: string;
   name: string;
   width: Width;
   height: Height;
   html: string;
}

export type PagePreset = {
   name: string;
   width: Width;
   height: Height;
}