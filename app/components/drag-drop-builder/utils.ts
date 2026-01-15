import { INITIAL_PAGE_HTML, NON_EDITABLE_TAGS } from "./data";
import { ElementStyles, Page, PagePreset } from "./type";

export const generatePageId = (): string => `page-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

export const createDefaultPage = (name: string = 'Page 1', preset?: PagePreset): Page => ({
   id: generatePageId(),
   name,
   width: preset?.width ?? 800,
   height: preset?.height ?? 600,
   html: INITIAL_PAGE_HTML,
});

export const generateXPath = (el: HTMLElement, root: HTMLElement): string => {
   if (!el || el === root || !el.parentElement) return '';
   const parent = el.parentElement;
   const siblings = Array.from(parent.children);
   const index = siblings.filter(s => s.tagName === el.tagName).indexOf(el) + 1;
   const tag = el.tagName.toLowerCase();
   const parentPath = generateXPath(parent, root);
   return parentPath ? `${parentPath}/${tag}[${index}]` : `/${tag}[${index}]`;
};

export const parseStyles = (styleStr: string): ElementStyles => {
   if (!styleStr) return {};
   return styleStr.split(';').reduce((acc: ElementStyles, rule: string) => {
      const [prop, val] = rule.split(':').map(s => s.trim());
      if (prop && val) acc[prop] = val;
      return acc;
   }, {});
};

export const extractBodyContent = (html: string): string => {
   const match = html.match(/<body[^>]*>([\s\S]*)<\/body>/i);
   return match ? match[1] : html;
};

export const extractStyles = (html: string): string => {
   const styleMatches = html.match(/<style[^>]*>([\s\S]*?)<\/style>/gi);
   if (!styleMatches) return '';
   return styleMatches.map(s => {
      const content = s.match(/<style[^>]*>([\s\S]*?)<\/style>/i);
      return content ? content[1] : '';
   }).join('\n');
};

// Check if element is editable (not img, hr, spacer, html-block)
export const isEditableElement = (el: HTMLElement): boolean => {
   const tag = el.tagName.toUpperCase();
   if (NON_EDITABLE_TAGS.includes(tag)) return false;
   if (el.hasAttribute('data-html-block')) return false;
   if (el.hasAttribute('data-element-type') && el.getAttribute('data-element-type') === 'spacer') return false;
   return true;
};