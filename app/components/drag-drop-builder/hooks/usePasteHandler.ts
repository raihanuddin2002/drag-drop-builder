import { useCallback, useRef } from 'react';

export interface UsePasteHandlerOptions {
   shadowRootRef: React.RefObject<ShadowRoot | null>;
   onAfterPaste?: () => void;
}

/**
 * Sanitizes pasted text by removing invisible characters and normalizing whitespace
 */
export function sanitizePasteText(text: string): string {
   return text
      // Remove zero-width characters
      .replace(/[\u200B-\u200D\uFEFF]/g, '')
      // Replace non-breaking spaces with regular spaces
      .replace(/\u00A0/g, ' ')
      // Remove other invisible/control characters (except newlines and tabs)
      .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F-\u009F]/g, '')
      // Normalize line endings
      .replace(/\r\n/g, '\n')
      .replace(/\r/g, '\n')
      // Remove excessive whitespace (more than 2 consecutive newlines)
      .replace(/\n{3,}/g, '\n\n')
      // Trim trailing whitespace from each line
      .replace(/[ \t]+$/gm, '');
}

/**
 * Extracts plain text from HTML content
 */
export function htmlToPlainText(html: string): string {
   const temp = document.createElement('div');
   temp.innerHTML = html;
   // Remove script and style elements
   temp.querySelectorAll('script, style').forEach(el => el.remove());
   // Get text content
   return temp.textContent || temp.innerText || '';
}

/**
 * Finds the nearest contenteditable parent with data-xpath attribute
 */
export function findContentEditable(el: HTMLElement | null): HTMLElement | null {
   return el?.closest('[contenteditable="true"][data-xpath]') as HTMLElement | null;
}

/**
 * usePasteHandler - A reusable hook for handling paste operations in contenteditable elements
 *
 * Features:
 * - Intercepts paste events and sanitizes content
 * - Removes formatting from pasted text (plain text only)
 * - Handles both paste and beforeinput events for cross-browser support
 * - Works within Shadow DOM
 *
 * @example
 * ```tsx
 * const { setupPasteHandlers, cleanupPasteHandlers } = usePasteHandler({
 *   shadowRootRef,
 *   onAfterPaste: () => {
 *     saveHistory();
 *     updateContent();
 *   }
 * });
 *
 * // In useEffect:
 * const cleanup = setupPasteHandlers(pagesWrapper);
 * return () => cleanup();
 * ```
 */
export function usePasteHandler({
   shadowRootRef,
   onAfterPaste
}: UsePasteHandlerOptions) {
   // Store pending paste data between paste and beforeinput events
   const pendingPasteDataRef = useRef<{ plainText: string; htmlContent: string } | null>(null);

   const setupPasteHandlers = useCallback((container: HTMLElement) => {
      const shadow = shadowRootRef.current;

      // Paste handler - captures clipboard data
      const handlePaste = (e: ClipboardEvent) => {
         const target = findContentEditable(e.target as HTMLElement);
         if (!target) return;

         // Store the clipboard data for use in beforeinput handler
         pendingPasteDataRef.current = {
            plainText: e.clipboardData?.getData('text/plain') || '',
            htmlContent: e.clipboardData?.getData('text/html') || ''
         };
      };

      // BeforeInput handler - intercepts the actual paste insertion
      const handleBeforeInput = (e: InputEvent) => {
         const target = findContentEditable(e.target as HTMLElement);
         if (!target) return;

         // Only handle paste operations
         if (e.inputType === 'insertFromPaste') {
            e.preventDefault();

            let plainText = '';

            // Use stored clipboard data if available
            if (pendingPasteDataRef.current) {
               plainText = pendingPasteDataRef.current.plainText;
               const htmlContent = pendingPasteDataRef.current.htmlContent;

               // If HTML content exists, extract text from it as fallback
               if (htmlContent) {
                  const textFromHtml = htmlToPlainText(htmlContent);
                  if (!plainText || plainText.includes('\ufffc') || plainText.includes('\ufffd')) {
                     plainText = textFromHtml;
                  }
               }
               pendingPasteDataRef.current = null;
            } else if (e.dataTransfer) {
               // Fallback to dataTransfer if available
               plainText = e.dataTransfer.getData('text/plain') || '';
               const htmlContent = e.dataTransfer.getData('text/html') || '';
               if (htmlContent) {
                  const textFromHtml = htmlToPlainText(htmlContent);
                  if (!plainText || plainText.includes('\ufffc') || plainText.includes('\ufffd')) {
                     plainText = textFromHtml;
                  }
               }
            }

            plainText = sanitizePasteText(plainText);

            // Don't paste if nothing left after sanitization
            if (!plainText) return;

            // Insert sanitized text using Selection API (works in Shadow DOM)
            const selection = (shadow as unknown as { getSelection?: () => Selection | null })?.getSelection?.() || window.getSelection();
            if (selection && selection.rangeCount > 0) {
               const range = selection.getRangeAt(0);
               range.deleteContents();
               const textNode = document.createTextNode(plainText);
               range.insertNode(textNode);
               range.setStartAfter(textNode);
               range.setEndAfter(textNode);
               selection.removeAllRanges();
               selection.addRange(range);
               target.normalize();

               // Remove placeholder attribute since we have content now
               target.removeAttribute('data-empty');
            }

            // Call callback after successful paste
            onAfterPaste?.();
         }
      };

      // Add event listeners with capture phase
      container.addEventListener('paste', handlePaste as EventListener, { capture: true });
      container.addEventListener('beforeinput', handleBeforeInput as EventListener, { capture: true });

      // Return cleanup function
      return () => {
         container.removeEventListener('paste', handlePaste as EventListener, { capture: true });
         container.removeEventListener('beforeinput', handleBeforeInput as EventListener, { capture: true });
      };
   }, [shadowRootRef, onAfterPaste]);

   return {
      setupPasteHandlers,
      sanitizePasteText,
      htmlToPlainText,
      findContentEditable
   };
}

export default usePasteHandler;
