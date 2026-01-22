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

      container.querySelectorAll('[data-xpath]').forEach(el => {
         el.removeAttribute('data-xpath');
         el.removeAttribute('data-selected');
         el.removeAttribute('draggable');
         el.removeAttribute('contenteditable');
      });
      container.querySelectorAll('.element-toolbar').forEach(el => el.remove());
      container.querySelectorAll('.page-break-spacer').forEach(el => el.remove());
      container.querySelectorAll('#table-placeholder-marker').forEach(el => el.remove());
      container.querySelectorAll('[data-editable]').forEach(el => el.removeAttribute('data-editable'));
      container.querySelectorAll('[data-empty]').forEach(el => el.removeAttribute('data-empty'));

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
      if (!shadow) throw new Error('Shadow root not ready');

      // Resolve merge fields in content before parsing
      const resolvedContent = resolveMergeFields(document.content, mergeFieldData);

      // Parse snapshot
      const tempDiv = window.document.createElement('div');
      tempDiv.innerHTML = resolvedContent;

      // Prefer exporting ONLY the actual content
      const contentFlow = tempDiv.querySelector('.content-flow') as HTMLElement | null;
      const exportRoot = (contentFlow ?? tempDiv) as HTMLElement;

      // Remove editor-only UI elements
      exportRoot
         .querySelectorAll('.page-overlay, .page-gap, .page-gap-label, .page-count, .element-toolbar, #table-placeholder-marker')
         .forEach((el) => el.remove());

      // Remove placeholder attributes
      exportRoot.querySelectorAll('[data-empty]').forEach((el) => el.removeAttribute('data-empty'));

      // Restore original margin-top if stored
      exportRoot.querySelectorAll<HTMLElement>('[data-page-break-before], [data-xpath]').forEach((el) => {
         if ((el as any).dataset.pbOrigMt !== undefined) {
            el.style.marginTop = (el as any).dataset.pbOrigMt;
            delete (el as any).dataset.pbOrigMt;
         }
      });

      // Collect editor CSS from shadow root
      const { inlineCss, linkHrefs } = collectShadowStyles(shadow);

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
               jsPDF: { unit: 'pt', format: 'a4', orientation: 'portrait' },
               pagebreak: {
                  mode: ['css', 'legacy'],
                  before: '[data-page-break-before]',
                  avoid: "[data-keep-together='true']",
               },
            } as any)
            .from(host.querySelector('.pdf-page') as HTMLElement)
            .save();
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
