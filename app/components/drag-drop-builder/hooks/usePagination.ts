import { useCallback, useMemo, RefObject } from 'react';
import { applyPaginationMargin, rafThrottle, resetPaginationStyling } from '../utils';

export interface PaginationConfig {
   pageHeight: number;
   pageHeightUnit: string;
   padding?: number;
   gap?: number;
}

export interface UsePaginationOptions {
   shadowRootRef: RefObject<ShadowRoot | null>;
   config: PaginationConfig;
   onPageCountChange: (count: number) => void;
}

/**
 * usePagination - A reusable hook for calculating and displaying page breaks
 *
 * Features:
 * - Calculates page breaks based on content height
 * - Applies margin-based pagination to elements
 * - Renders page gap overlays
 * - RAF-throttled for performance
 *
 * @example
 * ```tsx
 * const { calculatePageBreaks, calculatePageBreaksRAF } = usePagination({
 *   shadowRootRef,
 *   config: { pageHeight: 1123, pageHeightUnit: 'px' },
 *   onPageCountChange: setPageCount
 * });
 * ```
 */
export function usePagination({
   shadowRootRef,
   config,
   onPageCountChange
}: UsePaginationOptions) {
   const { pageHeight, pageHeightUnit, padding = 40, gap = 20 } = config;

   const calculatePageBreaks = useCallback(() => {
      const shadow = shadowRootRef.current;
      if (!shadow) return;

      // Skip pagination for viewport-based heights
      if (pageHeightUnit === 'vh') return;

      const pagesContainer = shadow.querySelector('.pages-container') as HTMLElement | null;
      const contentFlow = shadow.querySelector('.content-flow') as HTMLElement | null;
      const pageOverlay = shadow.querySelector('.page-overlay') as HTMLElement | null;

      if (!pagesContainer || !contentFlow || !pageOverlay) return;

      const PAGE_H = pageHeight;
      if (!PAGE_H) return;

      const PADDING = padding;
      const GAP = gap;
      const USABLE_H = PAGE_H - (PADDING * 2);

      const pagesWrapper = shadow.querySelector('.pages-wrapper');
      const isPreview = pagesWrapper?.getAttribute('data-preview-mode') === 'true';

      const blocks = isPreview
         ? Array.from(contentFlow.querySelectorAll(':scope > :not(.element-toolbar):not(.page-break-spacer)')) as HTMLElement[]
         : Array.from(contentFlow.querySelectorAll(':scope > [data-eid]')) as HTMLElement[];

      // If no blocks found (e.g. during blur transitions), preserve existing state
      if (blocks.length === 0) return;

      // Suppress margin-top transition so reset+measure is instant (no mid-animation values)
      for (const el of blocks) el.style.transition = 'none';

      // Cleanup previous pagination only when we have blocks to recalculate
      pageOverlay.innerHTML = '';
      for (const el of blocks) resetPaginationStyling(el);

      // Force reflow so transitions are fully suppressed before measuring
      void contentFlow.offsetHeight;

      // Measure once
      const flowRect = contentFlow.getBoundingClientRect();
      const metrics = blocks.map(el => {
         const r = el.getBoundingClientRect();
         return { el, top: r.top - flowRect.top, height: r.height };
      });

      // Single scan pagination
      let pageIndex = 1;
      let shift = 0;
      const gapTops: number[] = [];

      const pageBoxTop = (p: number) => (p - 1) * (PAGE_H + GAP);
      const pageContentTop = (p: number) => pageBoxTop(p) + PADDING;

      for (const m of metrics) {
         const simTop = m.top + shift;
         const usedInPage = simTop - pageContentTop(pageIndex);

         if (usedInPage + m.height > USABLE_H && usedInPage > 0) {
            const nextPage = pageIndex + 1;
            const targetTop = pageContentTop(nextPage);
            const add = targetTop - simTop;

            if (add > 0) {
               applyPaginationMargin(m.el, add);
               m.el.setAttribute('data-page-break-before', String(pageIndex));

               shift += add;
               gapTops.push(pageBoxTop(pageIndex) + PAGE_H);
               pageIndex = nextPage;
            }
         }
      }

      const totalPages = pageIndex;

      // // Re-enable transitions now that new margins are in place
      // for (const el of blocks) el.style.transition = '';

      onPageCountChange(totalPages);

      // Render page gap overlays
      if (gapTops.length) {
         const frag = document.createDocumentFragment();
         gapTops.forEach((top, idx) => {
            const gapEl = document.createElement('div');
            gapEl.className = 'page-gap';
            gapEl.style.cssText = `
               position:absolute; left:0; width:100%;
               top:${top}px; height:${GAP}px;
               pointer-events:none;
               display:flex; align-items:center; justify-content:center;
            `;
            const label = document.createElement('div');
            label.className = 'page-gap-label';
            label.textContent = `Page ${idx + 2}`;
            gapEl.appendChild(label);
            frag.appendChild(gapEl);
         });
         pageOverlay.appendChild(frag);
      }

      // Set container height
      pagesContainer.style.minHeight = `${(totalPages * PAGE_H) + ((totalPages - 1) * GAP)}px`;

   }, [shadowRootRef, pageHeight, pageHeightUnit, padding, gap, onPageCountChange]);

   // RAF-throttled version for performance
   const calculatePageBreaksRAF = useMemo(
      () => rafThrottle(calculatePageBreaks),
      [calculatePageBreaks]
   );

   return {
      calculatePageBreaks,
      calculatePageBreaksRAF
   };
}

export default usePagination;
