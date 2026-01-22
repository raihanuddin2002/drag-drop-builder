import { useCallback, RefObject } from 'react';

export interface UseRichTextOptions {
   shadowRootRef: RefObject<ShadowRoot | null>;
   selectedEid: string | null;
   onSaveHistory: () => void;
   onUpdateContent: () => void;
   onCalculatePageBreaks: () => void;
}

/**
 * useRichText - A hook for rich text formatting in contenteditable elements
 *
 * Features:
 * - Bold, italic, underline, strikethrough
 * - Font size and font family
 * - Text alignment (via block-level styles)
 * - Links (create and remove)
 * - Indent/outdent
 * - Insert HTML content
 *
 * @example
 * ```tsx
 * const { handleFormat } = useRichText({
 *   shadowRootRef,
 *   selectedXPath,
 *   onSaveHistory: saveHistory,
 *   onUpdateContent: updateContentFromShadow,
 *   onCalculatePageBreaks: calculatePageBreaksRAF
 * });
 *
 * // Usage:
 * handleFormat('bold');
 * handleFormat('fontSize', '18px');
 * handleFormat('createLink', 'https://example.com');
 * ```
 */
export function useRichText({
   shadowRootRef,
   selectedEid,
   onSaveHistory,
   onUpdateContent,
   onCalculatePageBreaks
}: UseRichTextOptions) {

   // Get selection from shadow DOM
   const getSelection = useCallback((): Selection | null => {
      const shadow = shadowRootRef.current;
      if (!shadow) return null;
      return (shadow as any).getSelection?.() ?? window.document.getSelection();
   }, [shadowRootRef]);

   // Handle unlink command
   const handleUnlink = useCallback(() => {
      const shadow = shadowRootRef.current;
      if (!shadow) return;

      const selection = getSelection();
      let anchor: HTMLAnchorElement | null = null;

      if (selection && selection.rangeCount > 0) {
         const range = selection.getRangeAt(0);
         let node: Node | null = range.startContainer;

         while (node) {
            if (node.nodeType === Node.ELEMENT_NODE && (node as Element).tagName === 'A') {
               anchor = node as HTMLAnchorElement;
               break;
            }
            if (node === shadow || node === window.document.body || !node.parentNode) break;
            node = node.parentNode;
         }
      }

      if (!anchor && selectedEid) {
         const selectedEl = shadow.querySelector(`[data-eid="${selectedEid}"]`);
         if (selectedEl) {
            anchor = selectedEl.tagName === 'A' ? selectedEl as HTMLAnchorElement : selectedEl.querySelector('a');
         }
      }

      if (anchor) {
         onSaveHistory();
         const fragment = window.document.createDocumentFragment();
         while (anchor.firstChild) {
            fragment.appendChild(anchor.firstChild);
         }
         anchor.parentNode?.replaceChild(fragment, anchor);
         onUpdateContent();
      }
   }, [shadowRootRef, selectedEid, getSelection, onSaveHistory, onUpdateContent]);

   // Handle font size
   const handleFontSize = useCallback((value: string) => {
      const selection = getSelection();
      if (!selection || selection.rangeCount === 0) return;

      const range = selection.getRangeAt(0);
      if (!range.collapsed) {
         const span = window.document.createElement('span');
         span.style.fontSize = value;
         try {
            range.surroundContents(span);
            onSaveHistory();
            onUpdateContent();
         } catch {
            window.document.execCommand('fontSize', false, value);
            onUpdateContent();
         }
      }
   }, [getSelection, onSaveHistory, onUpdateContent]);

   // Handle font family
   const handleFontFamily = useCallback((value: string) => {
      const selection = getSelection();
      if (!selection || selection.rangeCount === 0) return;

      const range = selection.getRangeAt(0);
      if (!range.collapsed) {
         const span = window.document.createElement('span');
         span.style.fontFamily = value;
         try {
            range.surroundContents(span);
            onSaveHistory();
            onUpdateContent();
         } catch {
            window.document.execCommand('fontName', false, value);
            onUpdateContent();
         }
      }
   }, [getSelection, onSaveHistory, onUpdateContent]);

   // Handle create link
   const handleCreateLink = useCallback((url: string) => {
      const selection = getSelection();
      if (!selection || selection.rangeCount === 0) return;

      const range = selection.getRangeAt(0);
      if (!range.collapsed) {
         const anchor = window.document.createElement('a');
         anchor.href = url;
         anchor.target = '_blank';
         anchor.rel = 'noopener noreferrer';
         anchor.style.color = '#2563eb';
         anchor.style.textDecoration = 'underline';
         try {
            range.surroundContents(anchor);
            onSaveHistory();
            onUpdateContent();
         } catch {
            window.document.execCommand('createLink', false, url);
            onUpdateContent();
         }
      }
   }, [getSelection, onSaveHistory, onUpdateContent]);

   // Handle underline with <u> tag
   const handleUnderline = useCallback(() => {
      const selection = getSelection();
      if (!selection || selection.rangeCount === 0) return;

      const range = selection.getRangeAt(0);
      if (range.collapsed) return;

      // Check if already inside a <u> tag - if so, remove it
      let node: Node | null = range.startContainer;
      let existingU: HTMLElement | null = null;
      while (node) {
         if (node.nodeType === Node.ELEMENT_NODE && (node as HTMLElement).tagName === 'U') {
            existingU = node as HTMLElement;
            break;
         }
         if (node === shadowRootRef.current || !node.parentNode) break;
         node = node.parentNode;
      }

      onSaveHistory();
      if (existingU) {
         // Check if the entire <u> content is selected
         const uRange = window.document.createRange();
         uRange.selectNodeContents(existingU);
         const selString = range.toString();
         const uString = uRange.toString();

         if (selString === uString) {
            // Full selection: remove the entire <u> tag
            const fragment = window.document.createDocumentFragment();
            while (existingU.firstChild) {
               fragment.appendChild(existingU.firstChild);
            }
            existingU.parentNode?.replaceChild(fragment, existingU);
         } else {
            // Partial selection: split into [before-u][selected-text][after-u]
            const parent = existingU.parentNode;
            if (!parent) return;

            // Range from start of <u> to start of selection
            const beforeRange = window.document.createRange();
            beforeRange.setStart(existingU, 0);
            beforeRange.setEnd(range.startContainer, range.startOffset);

            // Range from end of selection to end of <u>
            const afterRange = window.document.createRange();
            afterRange.setStart(range.endContainer, range.endOffset);
            afterRange.setEnd(existingU, existingU.childNodes.length);

            const beforeContents = beforeRange.cloneContents();
            const selectedContents = range.extractContents();
            const afterContents = afterRange.cloneContents();

            const fragment = window.document.createDocumentFragment();

            // Before part (stays underlined)
            if (beforeContents.textContent) {
               const beforeU = window.document.createElement('u');
               beforeU.appendChild(beforeContents);
               fragment.appendChild(beforeU);
            }

            // Selected part (no underline)
            fragment.appendChild(selectedContents);

            // After part (stays underlined)
            if (afterContents.textContent) {
               const afterU = window.document.createElement('u');
               afterU.appendChild(afterContents);
               fragment.appendChild(afterU);
            }

            parent.replaceChild(fragment, existingU);
         }
      } else {
         const u = window.document.createElement('u');
         try {
            range.surroundContents(u);
         } catch {
            // If surroundContents fails (partial selection across elements), use execCommand fallback
            window.document.execCommand('underline', false);
         }
      }
      onUpdateContent();
   }, [shadowRootRef, getSelection, onSaveHistory, onUpdateContent]);

   // Handle code block
   const handleCodeBlock = useCallback(() => {
      const selection = getSelection();
      if (!selection || selection.rangeCount === 0) return;

      const range = selection.getRangeAt(0);

      onSaveHistory();
      if (!range.collapsed) {
         // Wrap selected text in inline <code> tag
         const code = window.document.createElement('code');
         code.style.backgroundColor = '#f3f4f6';
         code.style.padding = '2px 6px';
         code.style.borderRadius = '4px';
         code.style.fontFamily = 'monospace';
         code.style.fontSize = '0.9em';
         try {
            range.surroundContents(code);
         } catch {
            // Fallback: insert as HTML
            const selectedText = range.toString();
            range.deleteContents();
            const code = window.document.createElement('code');
            code.style.backgroundColor = '#f3f4f6';
            code.style.padding = '2px 6px';
            code.style.borderRadius = '4px';
            code.style.fontFamily = 'monospace';
            code.style.fontSize = '0.9em';
            code.textContent = selectedText;
            range.insertNode(code);
         }
      } else {
         // No selection: insert a code block (<pre><code>)
         const pre = window.document.createElement('pre');
         pre.style.backgroundColor = '#1f2937';
         pre.style.color = '#e5e7eb';
         pre.style.padding = '16px';
         pre.style.borderRadius = '8px';
         pre.style.fontFamily = 'monospace';
         pre.style.fontSize = '14px';
         pre.style.overflowX = 'auto';
         pre.style.whiteSpace = 'pre-wrap';
         const code = window.document.createElement('code');
         code.textContent = '\u00A0';
         pre.appendChild(code);
         range.insertNode(pre);

         // Place cursor inside the code element
         const newRange = document.createRange();
         newRange.selectNodeContents(code);
         newRange.collapse(false);
         selection.removeAllRanges();
         selection.addRange(newRange);
      }
      onUpdateContent();
   }, [getSelection, onSaveHistory, onUpdateContent]);

   // Handle indent/outdent
   const handleIndent = useCallback((direction: 'indent' | 'outdent') => {
      const shadow = shadowRootRef.current;
      if (!shadow) return;

      const selection = getSelection();
      if (!selection || selection.rangeCount === 0) return;

      const range = selection.getRangeAt(0);
      let blockElement: HTMLElement | null = null;
      let node: Node | null = range.startContainer;

      while (node) {
         if (node.nodeType === Node.ELEMENT_NODE) {
            const el = node as HTMLElement;
            const display = window.getComputedStyle(el).display;
            if (display === 'block' || display === 'list-item' || ['P', 'DIV', 'LI'].includes(el.tagName)) {
               blockElement = el;
               break;
            }
         }
         if (node === shadow || !node.parentNode) break;
         node = node.parentNode;
      }

      if (blockElement) {
         onSaveHistory();
         const currentMargin = parseInt(blockElement.style.marginLeft) || 0;
         const step = 20;
         blockElement.style.marginLeft = direction === 'indent'
            ? `${currentMargin + step}px`
            : `${Math.max(0, currentMargin - step)}px`;
         onUpdateContent();
      }
   }, [shadowRootRef, getSelection, onSaveHistory, onUpdateContent]);

   // Handle insert HTML
   const handleInsertHTML = useCallback((html: string) => {
      const shadow = shadowRootRef.current;
      if (!shadow) return;

      const selection = getSelection();
      if (!selection || selection.rangeCount === 0) return;

      const range = selection.getRangeAt(0);

      // Find the contenteditable element or content-flow container
      let insertTarget: HTMLElement | null = null;
      let node: Node | null = range.startContainer;

      while (node) {
         if (node.nodeType === Node.ELEMENT_NODE) {
            const el = node as HTMLElement;
            if (el.hasAttribute('contenteditable') || el.hasAttribute('data-container')) {
               insertTarget = el;
               break;
            }
         }
         if (node === shadow || !node.parentNode) break;
         node = node.parentNode;
      }

      // If no contenteditable found, insert into content-flow
      if (!insertTarget) {
         insertTarget = shadow.querySelector('.content-flow') as HTMLElement;
      }

      if (insertTarget) {
         onSaveHistory();

         // Create a temporary container to parse the HTML
         const temp = window.document.createElement('div');
         temp.innerHTML = html;

         // Insert at cursor position if inside contenteditable, otherwise append to container
         if (insertTarget.hasAttribute('contenteditable') && !range.collapsed) {
            range.deleteContents();
         }

         const frag = window.document.createDocumentFragment();
         while (temp.firstChild) {
            frag.appendChild(temp.firstChild);
         }

         if (insertTarget.hasAttribute('data-container')) {
            insertTarget.appendChild(frag);
         } else {
            range.insertNode(frag);
         }

         onUpdateContent();
         onCalculatePageBreaks();
      }
   }, [shadowRootRef, getSelection, onSaveHistory, onUpdateContent, onCalculatePageBreaks]);

   // Main format handler
   const handleFormat = useCallback((command: string, value?: string) => {
      const shadow = shadowRootRef.current;
      if (!shadow) return;

      // Handle special commands
      if (command === 'unlink') {
         handleUnlink();
         return;
      }

      const selection = getSelection();
      if (!selection || selection.rangeCount === 0) return;

      if (command === 'fontSize' && value) {
         handleFontSize(value);
         return;
      }

      if (command === 'fontName' && value) {
         handleFontFamily(value);
         return;
      }

      // Skip alignment commands (handled at block level)
      if (['justifyLeft', 'justifyCenter', 'justifyRight', 'justifyFull'].includes(command)) return;
      if (command === 'foreColor') return;

      if (command === 'createLink' && value) {
         handleCreateLink(value);
         return;
      }

      if (command === 'indent' || command === 'outdent') {
         handleIndent(command);
         return;
      }

      if (command === 'insertHTML' && value) {
         handleInsertHTML(value);
         return;
      }

      if (command === 'underline') {
         handleUnderline();
         return;
      }

      if (command === 'codeBlock') {
         handleCodeBlock();
         return;
      }

      // Default: use execCommand
      window.document.execCommand(command, false, value);
      setTimeout(() => onUpdateContent(), 0);
   }, [
      shadowRootRef,
      getSelection,
      handleUnlink,
      handleUnderline,
      handleCodeBlock,
      handleFontSize,
      handleFontFamily,
      handleCreateLink,
      handleIndent,
      handleInsertHTML,
      onUpdateContent
   ]);

   return {
      handleFormat,
      handleUnlink,
      handleUnderline,
      handleCodeBlock,
      handleFontSize,
      handleFontFamily,
      handleCreateLink,
      handleIndent,
      handleInsertHTML,
      getSelection
   };
}

export default useRichText;
