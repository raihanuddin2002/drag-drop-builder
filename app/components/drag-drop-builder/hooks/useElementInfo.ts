import { RefObject, useCallback } from 'react';
import { ElementInfo } from '../type';
import { parseStyles } from '../utils';

export interface UseElementInfoOptions {
   shadowRootRef: RefObject<ShadowRoot | null>;
   selectedXPath: string | null;
}

/**
 * useElementInfo - A hook for getting information about the selected element
 *
 * Features:
 * - Gets element info from shadow DOM based on selected XPath
 * - Parses styles, attributes, and content
 * - Detects table context
 *
 * @example
 * ```tsx
 * const { getElementInfo } = useElementInfo({
 *   shadowRootRef,
 *   selectedXPath
 * });
 *
 * const elementInfo = getElementInfo();
 * ```
 */
export function useElementInfo({
   shadowRootRef,
   selectedXPath
}: UseElementInfoOptions) {

   const getElementInfo = useCallback((): ElementInfo | null => {
      const shadow = shadowRootRef.current;
      if (!selectedXPath || !shadow) return null;

      const el = shadow.querySelector(`[data-xpath="${selectedXPath}"]`) as HTMLElement;
      if (!el) return null;

      const customCss = el.getAttribute('style') || '';
      const styles = parseStyles(customCss);
      const tag = el.tagName.toLowerCase();
      const content = el.textContent || '';

      const clone = el.cloneNode(true) as HTMLElement;
      clone.querySelectorAll('.element-toolbar').forEach(t => t.remove());

      const innerHTML = clone.innerHTML;
      const src = el.getAttribute('src') || '';
      const href = el.getAttribute('href') || '';
      const alt = el.getAttribute('alt') || '';
      const isHtmlBlock = el.hasAttribute('data-html-block');

      const inlineLinks: { href: string; text: string; index: number }[] = [];
      el.querySelectorAll('a').forEach((link, index) => {
         inlineLinks.push({ href: link.getAttribute('href') || '', text: link.textContent || '', index });
      });

      // Detect table context
      const isTable = el.tagName === 'TABLE' || el.hasAttribute('data-table-container');
      const tableElement = el.hasAttribute('data-table-container')
         ? el.querySelector('table') as HTMLTableElement | null
         : el.closest('table') as HTMLTableElement | null;
      const isTableCell = ['TD', 'TH'].includes(el.tagName);
      let cellRowIndex: number | undefined;
      let cellColIndex: number | undefined;

      if (isTableCell && el.parentElement) {
         const row = el.parentElement as HTMLTableRowElement;
         cellRowIndex = row.rowIndex;
         cellColIndex = (el as HTMLTableCellElement).cellIndex;
      }

      return {
         tag, styles, content, innerHTML, src, href, alt, isHtmlBlock, customCss, inlineLinks,
         isTable, isTableCell, tableElement, cellRowIndex, cellColIndex
      };
   }, [shadowRootRef, selectedXPath]);

   return {
      getElementInfo
   };
}

export default useElementInfo;
