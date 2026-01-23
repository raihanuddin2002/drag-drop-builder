import { INITIAL_PAGE_HTML, NON_EDITABLE_TAGS } from "./data";
import { ElementStyles, EditorPage, PagePreset } from "./type";

// ============================================
// MERGE FIELDS - O(n) single-pass replacement
// ============================================

export type MergeFieldData = Record<string, any>;

/**
 * Resolves merge fields in content with O(n) complexity.
 * Supports dot notation for nested objects: {{user.company_name}}
 *
 * @param content - HTML string containing merge field tokens
 * @param data - Object containing the data to merge
 * @returns Content with merge fields replaced by actual values
 *
 * Complexity: O(n) where n is the content length
 * - Regex scans string once: O(n)
 * - Each match: path lookup O(k) where k = depth (constant, typically 2-3)
 */
export const resolveMergeFields = (content: string, data: MergeFieldData): string => {
   return content.replace(/\{\{([^}]+)\}\}/g, (match, path: string) => {
      const trimmedPath = path.trim();
      const value = trimmedPath.split('.').reduce(
         (obj: any, key: string) => obj?.[key],
         data
      );
      return value !== undefined ? String(value) : match;
   });
};

/**
 * Extracts all merge field tokens from content.
 * Useful for validation or listing available fields.
 *
 * @param content - HTML string to scan
 * @returns Array of unique merge field paths
 *
 * Complexity: O(n)
 */
export const extractMergeFields = (content: string): string[] => {
   const matches = content.match(/\{\{([^}]+)\}\}/g) || [];
   const paths = matches.map(m => m.slice(2, -2).trim());
   return [...new Set(paths)];
};

/**
 * Validates that all merge fields in content exist in data.
 *
 * @param content - HTML string containing merge field tokens
 * @param data - Object containing the data
 * @returns Object with valid and invalid field paths
 *
 * Complexity: O(n + m*k) where m = number of fields, k = depth
 */
export const validateMergeFields = (
   content: string,
   data: MergeFieldData
): { valid: string[]; invalid: string[] } => {
   const fields = extractMergeFields(content);
   const valid: string[] = [];
   const invalid: string[] = [];

   for (const path of fields) {
      const value = path.split('.').reduce(
         (obj: any, key: string) => obj?.[key],
         data
      );
      if (value !== undefined) {
         valid.push(path);
      } else {
         invalid.push(path);
      }
   }

   return { valid, invalid };
};

export const generatePageId = (): string => `page-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

export const generateElementId = (): string => `eid-${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 7)}`;

export const createDefaultPage = (name: string = 'Page 1', preset?: PagePreset): EditorPage => ({
   id: generatePageId(),
   name,
   width: { value: preset?.width?.value ?? 800, unit: preset?.width?.unit ?? 'px' },
   height: { value: preset?.height?.value ?? 600, unit: preset?.height?.unit ?? 'px' },
   html: INITIAL_PAGE_HTML({
      height: {
         value: preset?.height?.value ?? 600,
         unit: preset?.height?.unit ?? 'px'
      }
   })
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

// ============================================
// AUTO-PAGINATION UTILITIES
// ============================================

/**
 * Detect elements that overflow the page height
 * Uses offsetTop/offsetHeight for accurate measurement regardless of scroll position
 */
export const detectOverflow = (shadowRoot: ShadowRoot, pageHeight: number): HTMLElement[] => {
   const container = shadowRoot.querySelector('.page-container') as HTMLElement;
   if (!container) return [];

   // Account for container padding (typically 20px top + 20px bottom)
   const containerStyle = window.getComputedStyle(container);
   const paddingTop = parseFloat(containerStyle.paddingTop) || 0;
   const paddingBottom = parseFloat(containerStyle.paddingBottom) || 0;
   const availableHeight = pageHeight - paddingTop - paddingBottom;

   // Get direct children that are content elements (not toolbars)
   const children = Array.from(container.children).filter(child => {
      const el = child as HTMLElement;
      return el.hasAttribute('data-eid') && !el.classList.contains('element-toolbar');
   }) as HTMLElement[];

   const overflowing: HTMLElement[] = [];

   for (const child of children) {
      // Calculate position relative to container using offsetTop
      const childBottom = child.offsetTop + child.offsetHeight;

      // Only mark as overflowing if bottom edge exceeds available height
      if (childBottom > availableHeight) {
         overflowing.push(child);
      }
   }

   return overflowing;
};

/**
 * Get element height including margins
 */
export const getElementHeight = (element: HTMLElement): number => {
   const rect = element.getBoundingClientRect();
   const style = window.getComputedStyle(element);
   const marginTop = parseFloat(style.marginTop) || 0;
   const marginBottom = parseFloat(style.marginBottom) || 0;
   return rect.height + marginTop + marginBottom;
};

/**
 * Check if element can be split across pages (text elements only)
 */
export const canElementBeSplit = (element: HTMLElement): boolean => {
   const tag = element.tagName.toUpperCase();
   const splittableTags = ['P', 'DIV', 'SPAN', 'H1', 'H2', 'H3', 'H4', 'H5', 'H6'];

   // Don't split column containers, images, or special blocks
   if (element.hasAttribute('data-column-container')) return false;
   if (element.hasAttribute('data-html-block')) return false;
   if (element.hasAttribute('data-element-type')) return false;
   if (tag === 'IMG' || tag === 'HR' || tag === 'A') return false;

   return splittableTags.includes(tag);
};

/**
 * Split a text element at word boundaries to fit available height
 * Returns null if can't fit even one word
 */
export const splitTextElement = (
   element: HTMLElement,
   availableHeight: number
): { remaining: string; overflow: string } | null => {
   const textContent = element.textContent || '';
   const words = textContent.split(/\s+/).filter(w => w.length > 0);

   if (words.length === 0) return null;

   // Create a temporary measuring container
   const measureDiv = document.createElement('div');
   measureDiv.style.cssText = element.getAttribute('style') || '';
   measureDiv.style.position = 'absolute';
   measureDiv.style.visibility = 'hidden';
   measureDiv.style.width = `${element.offsetWidth}px`;
   measureDiv.style.maxWidth = `${element.offsetWidth}px`;
   document.body.appendChild(measureDiv);

   let splitIndex = words.length;

   // Find the split point
   for (let i = 1; i <= words.length; i++) {
      measureDiv.textContent = words.slice(0, i).join(' ');
      if (measureDiv.offsetHeight > availableHeight) {
         splitIndex = Math.max(1, i - 1); // At least keep one word
         break;
      }
   }

   document.body.removeChild(measureDiv);

   if (splitIndex === words.length) {
      // Everything fits, no split needed
      return null;
   }

   if (splitIndex === 0) {
      // Can't fit even one word
      return null;
   }

   const remainingWords = words.slice(0, splitIndex);
   const overflowWords = words.slice(splitIndex);

   // Build HTML preserving the element structure
   const clone = element.cloneNode(false) as HTMLElement;
   clone.removeAttribute('data-eid');
   clone.removeAttribute('data-selected');
   clone.removeAttribute('contenteditable');
   clone.removeAttribute('draggable');

   // Remove toolbar from clone if exists
   clone.querySelectorAll('.element-toolbar').forEach(t => t.remove());

   clone.textContent = remainingWords.join(' ');
   const remaining = clone.outerHTML;

   clone.textContent = overflowWords.join(' ');
   const overflow = clone.outerHTML;

   return { remaining, overflow };
};

/**
 * Clean an element's HTML for migration (remove editor attributes)
 */
export const cleanElementForMigration = (element: HTMLElement): string => {
   const clone = element.cloneNode(true) as HTMLElement;

   // Remove editor-specific attributes from root and all children
   const cleanAttrs = (el: Element) => {
      el.removeAttribute('data-eid');
      el.removeAttribute('data-selected');
      el.removeAttribute('contenteditable');
      el.removeAttribute('draggable');
   };

   cleanAttrs(clone);
   clone.querySelectorAll('[data-eid]').forEach(cleanAttrs);
   clone.querySelectorAll('.element-toolbar').forEach(t => t.remove());

   return clone.outerHTML;
};

export function rafThrottle(fn: () => void) {
   let rafId: number | null = null;

   return () => {
      if (rafId !== null) return;

      rafId = requestAnimationFrame(() => {
         rafId = null;
         fn();
      });
   };
}

export function resetPaginationStyling(el: HTMLElement) {
   // Restore original inline marginTop (only what we changed)
   if (el.dataset.pbOrigMt !== undefined) {
      el.style.marginTop = el.dataset.pbOrigMt; // could be "" (valid)
      delete el.dataset.pbOrigMt;
   } else {
      // If we never touched it, don't touch it now
   }
   el.removeAttribute("data-page-break-before");
}

export function applyPaginationMargin(el: HTMLElement, addPx: number) {
   if (addPx <= 0) return;

   // Save original inline style once
   if (el.dataset.pbOrigMt === undefined) {
      el.dataset.pbOrigMt = el.style.marginTop || ""; // inline only, not computed
   }

   const base = parseFloat(el.dataset.pbOrigMt || "0") || 0; // px assumption
   el.style.marginTop = `${base + addPx}px`;
}

