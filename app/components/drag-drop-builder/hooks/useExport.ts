import React, { useCallback, RefObject } from 'react';
import { resolveMergeFields, MergeFieldData } from '../utils';

export interface UseExportOptions {
   shadowRootRef: RefObject<ShadowRoot | null>;
   mergeFieldData: MergeFieldData;
   onSaveHistory?: () => void;
   onSetContent?: (content: string) => void;
   onClearSelection?: () => void;
}

export interface ExportDocument {
   name: string;
   content: string;
   pageWidth?: { value: number; unit: string };
   pageHeight?: { value: number; unit: string };
}

/**
 * Collect CSS from the live editor shadow root (style tags + stylesheet links).
 */
function collectShadowStyles(shadow: ShadowRoot): { inlineCss: string; linkHrefs: string[] } {
   const inlineCss: string[] = [];
   const linkHrefs: string[] = [];

   shadow.querySelectorAll('style').forEach((s) => {
      inlineCss.push(s.textContent || '');
   });

   shadow.querySelectorAll<HTMLLinkElement>('link[rel="stylesheet"]').forEach((l) => {
      if (l.href) linkHrefs.push(l.href);
   });

   return { inlineCss: inlineCss.join('\n\n'), linkHrefs };
}

/**
 * Fix UL/OL markers for html2canvas/html2pdf rendering
 */
function fixListsForCanvas(root: HTMLElement) {
   // Remove native markers so html2canvas doesn't try to render them
   root.querySelectorAll<HTMLElement>('ul, ol').forEach((list) => {
      list.style.listStyleType = 'none';
      list.style.paddingLeft = '0px';
      list.style.marginLeft = '0px';
   });

   // UL => "disc" bullet
   root.querySelectorAll<HTMLUListElement>('ul').forEach((ul) => {
      ul.style.marginTop = '16px';
      ul.style.marginBottom = '16px';

      ul.querySelectorAll<HTMLLIElement>('li').forEach((li) => {
         if (li.querySelector(':scope > .pdf-li-row')) return;

         const row = document.createElement('div');
         row.className = 'pdf-li-row';
         row.style.display = 'flex';
         row.style.alignItems = 'flex-start';
         row.style.gap = '10px';

         const marker = document.createElement('span');
         marker.className = 'pdf-ul-marker';
         marker.textContent = '•';
         marker.style.lineHeight = 'inherit';
         marker.style.flex = '0 0 auto';
         marker.style.marginTop = '0px';

         const content = document.createElement('div');
         content.className = 'pdf-li-content';
         content.style.flex = '1 1 auto';
         content.style.minWidth = '0';

         while (li.firstChild) content.appendChild(li.firstChild);

         row.appendChild(marker);
         row.appendChild(content);
         li.appendChild(row);
         li.style.marginLeft = '24px';
      });
   });

   // OL => "1. 2. 3." numbering
   root.querySelectorAll<HTMLOListElement>('ol').forEach((ol) => {
      ol.style.marginTop = '16px';
      ol.style.marginBottom = '16px';

      let i = 0;
      Array.from(ol.children).forEach((child) => {
         if (!(child instanceof HTMLLIElement)) return;
         i++;

         if (child.querySelector(':scope > .pdf-li-row')) return;

         const row = document.createElement('div');
         row.className = 'pdf-li-row';
         row.style.display = 'flex';
         row.style.alignItems = 'flex-start';
         row.style.gap = '10px';

         const marker = document.createElement('span');
         marker.className = 'pdf-ol-marker';
         marker.textContent = `${i}.`;
         marker.style.lineHeight = 'inherit';
         marker.style.flex = '0 0 auto';

         const content = document.createElement('div');
         content.className = 'pdf-li-content';
         content.style.flex = '1 1 auto';
         content.style.minWidth = '0';

         while (child.firstChild) content.appendChild(child.firstChild);

         row.appendChild(marker);
         row.appendChild(content);
         child.appendChild(row);
         child.style.marginLeft = '24px';
      });
   });
}

/**
 * useExport - A hook for exporting editor content
 *
 * Features:
 * - Clean content for export (remove editor attributes)
 * - Export as HTML file
 * - Export as PDF using html2pdf.js
 * - Resolve merge fields during export
 *
 * @example
 * ```tsx
 * const { cleanContent, exportHTML, exportPDF } = useExport({
 *   shadowRootRef,
 *   mergeFieldData
 * });
 *
 * // Export HTML
 * exportHTML(editorDocument);
 *
 * // Export PDF
 * exportPDF(editorDocument);
 * ```
 */
export function useExport({
   shadowRootRef,
   mergeFieldData,
   onSaveHistory,
   onSetContent,
   onClearSelection
}: UseExportOptions) {

   // Clean content for export (remove editor-only attributes and optionally resolve merge fields)
   const cleanContent = useCallback((content: string, resolveMerge: boolean = true): string => {
      const parser = new DOMParser();
      const doc = parser.parseFromString(`<div>${content}</div>`, 'text/html');
      const container = doc.body.firstElementChild;
      if (!container) return content;

      // Unwrap merge field <code> elements back to plain text
      container.querySelectorAll('code[data-merge-field]').forEach(el => {
         el.replaceWith(el.textContent || '');
      });

      container.querySelectorAll('[data-eid]').forEach(el => {
         el.removeAttribute('data-eid');
         el.removeAttribute('data-selected');
         el.removeAttribute('draggable');
         el.removeAttribute('contenteditable');
      });
      container.querySelectorAll('.element-toolbar').forEach(el => el.remove());
      container.querySelectorAll('.page-break-spacer').forEach(el => el.remove());
      container.querySelectorAll('#table-placeholder-marker').forEach(el => el.remove());
      container.querySelectorAll('[data-editable]').forEach(el => el.removeAttribute('data-editable'));
      container.querySelectorAll('[data-empty]').forEach(el => el.removeAttribute('data-empty'));
      container.querySelectorAll('.drop-zone').forEach(el => el.classList.remove('drop-zone'));

      let result = container.innerHTML;

      if (resolveMerge) {
         result = resolveMergeFields(result, mergeFieldData);
      }

      return result;
   }, [mergeFieldData]);

   // Export as HTML file
   const exportHTML = useCallback((document: ExportDocument) => {
      const cleanedContent = cleanContent(document.content);

      const fullHtml = /*html*/`
         <!DOCTYPE html>
         <html>
            <head>
               <meta charset="UTF-8">
               <meta name="viewport" content="width=device-width, initial-scale=1.0">
               <title>${document.name}</title>
               <style>
                  * { box-sizing: border-box; }
                  body { margin: 0; padding: 20px; font-family: system-ui, sans-serif; background: #f5f5f5; }
                  .document {
                     width: ${document.pageWidth?.value}${document.pageWidth?.unit};
                     margin: 0 auto;
                     background: white;
                     box-shadow: 0 2px 8px rgba(0,0,0,0.1);
                     min-height: ${document.pageHeight?.value}${document.pageHeight?.unit};
                  }
                  @media print {
                     .document { box-shadow: none; margin: 0; }
                  }
               </style>
            </head>
            <body>
               <div class="document">${cleanedContent}</div>
            </body>
         </html>
      `;

      const blob = new Blob([fullHtml], { type: 'text/html' });
      const url = URL.createObjectURL(blob);
      const a = window.document.createElement('a');
      a.href = url;
      a.download = `${document.name.replace(/\s+/g, '-').toLowerCase()}.html`;
      a.click();
      URL.revokeObjectURL(url);
   }, [cleanContent]);

   // Export as PDF using html2pdf.js
   const exportPDF = useCallback(async (document: ExportDocument) => {
      const shadow = shadowRootRef.current;
      if (!shadow) throw new Error("Shadow root not ready");

      // 1) Get live content
      const liveContentFlow = shadow.querySelector(".content-flow") as HTMLElement | null;
      if (!liveContentFlow) {
         throw new Error("No content to export. Please add some content first.");
      }

      // 2) IMPORTANT: clone first, remove editor UI BEFORE serialization
      //    This prevents invalid HTML like <p><div class="element-toolbar">...</div>text</p>
      //    which breaks text-align during parsing.
      const cleanedClone = liveContentFlow.cloneNode(true) as HTMLElement;

      cleanedClone
         .querySelectorAll(
            ".page-overlay, .page-gap, .page-gap-label, .page-count, .element-toolbar, #table-placeholder-marker"
         )
         .forEach((el) => el.remove());

      // Unwrap merge field <code> elements back to plain text (in the clone)
      cleanedClone.querySelectorAll("code[data-merge-field]").forEach((el) => {
         el.replaceWith(el.textContent || "");
      });

      // Remove placeholder attributes and classes
      cleanedClone.querySelectorAll("[data-empty]").forEach((el) => el.removeAttribute("data-empty"));
      cleanedClone.querySelectorAll(".drop-zone").forEach((el) => el.classList.remove("drop-zone"));

      // Restore original margins + remove editor attributes
      cleanedClone.querySelectorAll<HTMLElement>("[data-eid]").forEach((el) => {
         // restore original margin-top if pagination touched it
         if (el.dataset.pbOrigMt !== undefined) {
            el.style.marginTop = el.dataset.pbOrigMt; // could be ""
            delete el.dataset.pbOrigMt;
         }

         el.removeAttribute("data-eid");
         el.removeAttribute("data-selected");
         el.removeAttribute("data-editable");
         el.removeAttribute("draggable");
         el.removeAttribute("contenteditable");
      });

      // Keep [data-page-break-before] for css pagebreaks, but restore margin if needed
      cleanedClone.querySelectorAll<HTMLElement>("[data-page-break-before]").forEach((el) => {
         if (el.dataset.pbOrigMt !== undefined) {
            el.style.marginTop = el.dataset.pbOrigMt;
            delete el.dataset.pbOrigMt;
         }
      });

      // 3) Serialize cleaned HTML, THEN resolve merge fields on valid markup
      const cleanedHtml = cleanedClone.outerHTML;
      const resolvedContent = resolveMergeFields(cleanedHtml, mergeFieldData);

      // 4) Parse snapshot (safe now)
      const tempDiv = window.document.createElement("div");
      tempDiv.innerHTML = resolvedContent;

      // Prefer exporting ONLY the actual content
      const contentFlow = tempDiv.querySelector('.content-flow') as HTMLElement | null;
      const exportRoot = (contentFlow ?? tempDiv) as HTMLElement;

      // Remove editor-only UI elements
      exportRoot
         .querySelectorAll('.page-overlay, .page-gap, .page-gap-label, .page-count, .element-toolbar, #table-placeholder-marker')
         .forEach((el) => el.remove());

      // Unwrap merge field <code> elements back to plain text
      exportRoot.querySelectorAll('code[data-merge-field]').forEach((el) => {
         el.replaceWith(el.textContent || '');
      });

      // Remove placeholder attributes and classes
      exportRoot.querySelectorAll('[data-empty]').forEach((el) => el.removeAttribute('data-empty'));
      exportRoot.querySelectorAll('.drop-zone').forEach((el) => el.classList.remove('drop-zone'));

      // Clean all editor attributes and restore original margins
      exportRoot.querySelectorAll<HTMLElement>('[data-eid]').forEach((el) => {
         // Restore original margin-top if pagination modified it
         if ((el as any).dataset.pbOrigMt !== undefined) {
            el.style.marginTop = (el as any).dataset.pbOrigMt;
            delete (el as any).dataset.pbOrigMt;
         }
         // Remove editor-specific attributes
         el.removeAttribute('data-eid');
         el.removeAttribute('data-selected');
         el.removeAttribute('data-editable');
         el.removeAttribute('draggable');
         el.removeAttribute('contenteditable');
      });

      // Handle elements with page-break-before - restore margins and remove the attribute
      // Note: We remove data-page-break-before because html2pdf will use CSS page-break rules,
      // and we've already restored the original margins so content flows naturally
      exportRoot.querySelectorAll<HTMLElement>('[data-page-break-before]').forEach((el) => {
         if ((el as any).dataset.pbOrigMt !== undefined) {
            el.style.marginTop = (el as any).dataset.pbOrigMt;
            delete (el as any).dataset.pbOrigMt;
         }
         // Don't remove data-page-break-before - it's needed for CSS page breaks in PDF
      });

      // Collect editor CSS from shadow root
      const { inlineCss, linkHrefs } = collectShadowStyles(shadow);

      // Calculate PDF format from page dimensions
      // Use 'a4' string for A4 (known to work well with page breaks)
      // Use custom [width, height] array for other sizes
      const getPdfConfig = (): { format: string | [number, number]; orientation: 'portrait' | 'landscape' } => {
         const width = document.pageWidth;
         const height = document.pageHeight;

         // If dimensions are not in pixels (e.g., %, vh), fall back to A4
         if (!width || !height || width.unit !== 'px' || height.unit !== 'px') {
            return { format: 'a4', orientation: 'portrait' };
         }

         // Use string format only for A4 (794x1123) - known to work well
         if (width.value === 794 && height.value === 1123) {
            return { format: 'a4', orientation: 'portrait' };
         }

         // For all other sizes, convert pixels to points
         // jsPDF uses points (pt): 1pt = 1/72 inch, standard web is 96 DPI
         // Conversion: points = pixels * 72 / 96 = pixels * 0.75
         const widthPt = width.value * 0.75;
         const heightPt = height.value * 0.75;
         const orientation = widthPt > heightPt ? 'landscape' : 'portrait';

         return {
            format: [widthPt, heightPt],
            orientation
         };
      };

      const pdfConfig = getPdfConfig();

      // Create offscreen export container
      const host = window.document.createElement('div');
      host.id = 'pdf-export-host';
      host.style.position = 'fixed';
      host.style.left = '-100000px';
      host.style.top = '0';
      host.style.visibility = 'hidden';
      host.style.pointerEvents = 'none';
      host.style.zIndex = '-1';
      host.style.width = document.pageWidth?.value && document.pageWidth?.unit
         ? `${document.pageWidth.value}${document.pageWidth.unit}`
         : '794px';

      const linkHrefsString = linkHrefs.map((href) => `<link rel="stylesheet" href="${href}">`).join('\n');

      host.innerHTML = /* html */ `
         ${linkHrefsString}
         <style>
            *, *::before, *::after { box-sizing: border-box; }
            ${inlineCss}
            .pdf-page {
               padding: 40px 40px 40px 40px;
            }
            [data-page-break-before]{
               break-before: page;
               page-break-before: always;
               padding-top: 40px !important;
            }
            [data-keep-together="true"]{
               break-inside: avoid;
               page-break-inside: avoid;
            }
            img { max-width: 100%; }
            li { margin: 2px 0; }
            .pdf-ul-marker, .pdf-ol-marker { font-size: 1em; }
         </style>
         <div class="pdf-page">
            ${exportRoot.innerHTML}
         </div>
      `;

      window.document.body.appendChild(host);

      try {
         // Fix UL/OL markers for canvas rendering
         const pdfPage = host.querySelector('.pdf-page') as HTMLElement | null;
         if (pdfPage) fixListsForCanvas(pdfPage);

         // Wait for fonts/images
         // @ts-ignore
         if (window.document.fonts?.ready) await (window.document as any).fonts.ready;

         const imgs = Array.from(host.querySelectorAll('img'));
         await Promise.all(
            imgs.map(
               (img) =>
                  img.complete
                     ? Promise.resolve()
                     : new Promise<void>((res) => {
                        img.onload = () => res();
                        img.onerror = () => res();
                     })
            )
         );

         const filename = `${document.name.replace(/\s+/g, '-').toLowerCase()}.pdf`;

         // Dynamic import to keep bundle smaller
         const html2pdf = (await import('html2pdf.js')).default;

         await (html2pdf() as any)
            .set({
               filename,
               margin: 0,
               image: { type: 'jpeg', quality: 0.98 },
               html2canvas: {
                  scale: 2,
                  useCORS: true,
                  backgroundColor: '#ffffff',
               },
               jsPDF: { unit: 'pt', format: pdfConfig.format, orientation: pdfConfig.orientation },
               pagebreak: {
                  mode: ['css', 'legacy'],
                  before: '[data-page-break-before]',
                  avoid: "[data-keep-together='true']",
               },
            } as any)
            .from(host.querySelector('.pdf-page') as HTMLElement)
            .save();
      } catch (error) {
         console.error('PDF Export failed:', error);
         throw error;
      } finally {
         host.remove();
      }
   }, [shadowRootRef, mergeFieldData]);

   // Import HTML file
   const importHTML = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;

      const reader = new FileReader();
      reader.onload = (event) => {
         const content = event.target?.result as string;
         if (content) {
            onSaveHistory?.();
            const bodyMatch = content.match(/<body[^>]*>([\s\S]*)<\/body>/i);
            const bodyContent = bodyMatch ? bodyMatch[1].trim() : content;

            onSetContent?.(`<div class="content-flow" data-container="true">${bodyContent}</div>`);
            onClearSelection?.();
         }
      };
      reader.readAsText(file);
      e.target.value = '';
   }, [onSaveHistory, onSetContent, onClearSelection]);

   return {
      cleanContent,
      exportHTML,
      exportPDF,
      importHTML
   };
}

export default useExport;
