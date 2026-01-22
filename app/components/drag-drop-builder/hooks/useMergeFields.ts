import { useState, useCallback, useMemo, useRef, RefObject } from 'react';

export interface MergeFieldDefinition {
   path: string;
   label: string;
   category?: string;
}

export interface MergeFieldSuggestionState {
   show: boolean;
   position: { top: number; left: number };
   query: string;
   selectedIndex: number;
}

export interface UseMergeFieldsOptions {
   shadowRootRef: RefObject<ShadowRoot | null>;
   availableFields: MergeFieldDefinition[];
   onSaveHistory?: () => void;
   onUpdateContent?: () => void;
}

/**
 * Get caret coordinates for positioning popup (viewport-relative for position:fixed)
 */
function getCaretCoordinates(shadowRoot?: ShadowRoot | null): { top: number; left: number } | null {
   const selection = shadowRoot
      ? (shadowRoot as any).getSelection?.() ?? window.getSelection()
      : window.getSelection();
   if (!selection || selection.rangeCount === 0) return null;

   const range = selection.getRangeAt(0).cloneRange();
   range.collapse(true);

   // Use a zero-width space to get accurate position
   const span = document.createElement('span');
   span.textContent = '\u200B';
   range.insertNode(span);

   const rect = span.getBoundingClientRect();
   const coords = {
      top: rect.bottom,
      left: rect.left
   };

   span.remove();
   return coords;
}

/**
 * useMergeFields - A reusable hook for merge field autocomplete functionality
 *
 * Features:
 * - Detects {{ trigger pattern
 * - Shows autocomplete popup with filtered suggestions
 * - Keyboard navigation (arrow keys, enter, tab, escape)
 * - Inserts selected merge field
 *
 * @example
 * ```tsx
 * const {
 *   suggestions,
 *   filteredFields,
 *   checkTrigger,
 *   handleKeyDown,
 *   insertField,
 *   closeSuggestions
 * } = useMergeFields({
 *   shadowRootRef,
 *   availableFields: [
 *     { path: 'user.name', label: 'User Name', category: 'User' }
 *   ],
 *   onSaveHistory: saveHistory,
 *   onUpdateContent: updateContent
 * });
 * ```
 */
export function useMergeFields({
   shadowRootRef,
   availableFields,
   onSaveHistory,
   onUpdateContent
}: UseMergeFieldsOptions) {
   const [suggestions, setSuggestions] = useState<MergeFieldSuggestionState>({
      show: false,
      position: { top: 0, left: 0 },
      query: '',
      selectedIndex: 0
   });

   // Refs for functions to avoid dependency issues in event handlers
   const checkTriggerRef = useRef<() => void>(() => {});
   const handleKeyDownRef = useRef<(e: KeyboardEvent) => void>(() => {});

   // Filter suggestions based on query
   const filteredFields = useMemo(() => {
      if (!suggestions.query) return availableFields;
      const q = suggestions.query.toLowerCase();
      return availableFields.filter(f =>
         f.path.toLowerCase().includes(q) ||
         f.label.toLowerCase().includes(q)
      );
   }, [availableFields, suggestions.query]);

   // Close suggestions
   const closeSuggestions = useCallback(() => {
      setSuggestions({
         show: false,
         position: { top: 0, left: 0 },
         query: '',
         selectedIndex: 0
      });
   }, []);

   // Check for merge field trigger pattern ({{)
   const checkTrigger = useCallback(() => {
      const shadow = shadowRootRef.current;
      if (!shadow) return;

      const selection = (shadow as any).getSelection?.() ?? window.document.getSelection();
      if (!selection || selection.rangeCount === 0) return;

      const range = selection.getRangeAt(0);
      const textNode = range.startContainer;

      if (textNode.nodeType !== Node.TEXT_NODE) {
         setSuggestions(prev => ({ ...prev, show: false }));
         return;
      }

      const text = textNode.textContent || '';
      const cursorPos = range.startOffset;

      // Find the last {{ before cursor
      const beforeCursor = text.slice(0, cursorPos);
      const lastOpenBrace = beforeCursor.lastIndexOf('{{');

      if (lastOpenBrace === -1) {
         setSuggestions(prev => ({ ...prev, show: false }));
         return;
      }

      // Check if there's a closing }} between {{ and cursor
      const afterOpen = beforeCursor.slice(lastOpenBrace + 2);
      if (afterOpen.includes('}}')) {
         setSuggestions(prev => ({ ...prev, show: false }));
         return;
      }

      // Extract the query (what user typed after {{)
      const query = afterOpen;

      // Get caret position for popup (pass shadow root for correct selection)
      const coords = getCaretCoordinates(shadow);
      if (!coords) return;

      setSuggestions({
         show: true,
         position: coords,
         query,
         selectedIndex: 0
      });
   }, [shadowRootRef]);

   // Update ref
   checkTriggerRef.current = checkTrigger;

   // Insert selected merge field wrapped in a <code> element
   const insertField = useCallback((field: MergeFieldDefinition) => {
      const shadow = shadowRootRef.current;
      if (!shadow) return;

      const selection = (shadow as any).getSelection?.() ?? window.document.getSelection();
      if (!selection || selection.rangeCount === 0) return;

      const range = selection.getRangeAt(0);
      const textNode = range.startContainer;

      if (textNode.nodeType !== Node.TEXT_NODE) return;

      const text = textNode.textContent || '';
      const cursorPos = range.startOffset;
      const beforeCursor = text.slice(0, cursorPos);
      const lastOpenBrace = beforeCursor.lastIndexOf('{{');

      if (lastOpenBrace === -1) return;

      onSaveHistory?.();

      const parent = textNode.parentNode;
      if (!parent) return;

      // Split text into: before {{ | code element | after cursor
      const beforeText = text.slice(0, lastOpenBrace);
      const afterText = text.slice(cursorPos);

      // Create the <code> element for the merge field
      const codeEl = document.createElement('code');
      codeEl.textContent = `{{${field.path}}}`;
      codeEl.style.cssText = 'background:#eef2ff;color:#4338ca;padding:1px 4px;border-radius:3px;font-size:0.9em;';
      codeEl.setAttribute('data-merge-field', field.path);
      codeEl.contentEditable = 'false';

      // Replace the text node with before text + code + after text
      const beforeNode = document.createTextNode(beforeText);
      const afterNode = document.createTextNode(afterText || '\u200B');

      parent.insertBefore(beforeNode, textNode);
      parent.insertBefore(codeEl, textNode);
      parent.insertBefore(afterNode, textNode);
      parent.removeChild(textNode);

      // Place cursor after the code element
      const newRange = document.createRange();
      newRange.setStart(afterNode, afterText ? 0 : 1);
      newRange.collapse(true);
      selection.removeAllRanges();
      selection.addRange(newRange);

      closeSuggestions();
      onUpdateContent?.();
   }, [shadowRootRef, onSaveHistory, onUpdateContent, closeSuggestions]);

   // Handle keyboard navigation
   const handleKeyDown = useCallback((e: KeyboardEvent) => {
      // Only handle keys if autocomplete is showing with suggestions
      if (!suggestions.show || filteredFields.length === 0) {
         // Close autocomplete on Escape even if no suggestions
         if (e.key === 'Escape' && suggestions.show) {
            closeSuggestions();
         }
         return;
      }

      if (e.key === 'ArrowDown') {
         e.preventDefault();
         e.stopPropagation();
         setSuggestions(prev => ({
            ...prev,
            selectedIndex: (prev.selectedIndex + 1) % filteredFields.length
         }));
      } else if (e.key === 'ArrowUp') {
         e.preventDefault();
         e.stopPropagation();
         setSuggestions(prev => ({
            ...prev,
            selectedIndex: (prev.selectedIndex - 1 + filteredFields.length) % filteredFields.length
         }));
      } else if (e.key === 'Enter' || e.key === 'Tab') {
         e.preventDefault();
         e.stopPropagation();
         const selected = filteredFields[suggestions.selectedIndex];
         if (selected) {
            insertField(selected);
         }
      } else if (e.key === 'Escape') {
         e.preventDefault();
         e.stopPropagation();
         closeSuggestions();
      }
   }, [suggestions.show, suggestions.selectedIndex, filteredFields, insertField, closeSuggestions]);

   // Update ref
   handleKeyDownRef.current = handleKeyDown;

   // Set selected index (for mouse hover on popup)
   const setSelectedIndex = useCallback((index: number) => {
      setSuggestions(prev => ({ ...prev, selectedIndex: index }));
   }, []);

   return {
      suggestions,
      filteredFields,
      checkTrigger,
      checkTriggerRef,
      handleKeyDown,
      handleKeyDownRef,
      insertField,
      closeSuggestions,
      setSelectedIndex
   };
}

export default useMergeFields;
