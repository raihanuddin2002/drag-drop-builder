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
 * Get caret coordinates for positioning popup
 */
function getCaretCoordinates(): { top: number; left: number } | null {
   const selection = window.getSelection();
   if (!selection || selection.rangeCount === 0) return null;

   const range = selection.getRangeAt(0).cloneRange();
   range.collapse(true);

   // Use a zero-width space to get accurate position
   const span = document.createElement('span');
   span.textContent = '\u200B';
   range.insertNode(span);

   const rect = span.getBoundingClientRect();
   const coords = {
      top: rect.bottom + window.scrollY,
      left: rect.left + window.scrollX
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

      // Get caret position for popup
      const coords = getCaretCoordinates();
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

   // Insert selected merge field
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

      // Replace from {{ to cursor with the full merge field
      const newText = text.slice(0, lastOpenBrace) + `{{${field.path}}}` + text.slice(cursorPos);
      textNode.textContent = newText;

      // Move cursor after the inserted token
      const newCursorPos = lastOpenBrace + field.path.length + 4; // 4 = {{}}
      range.setStart(textNode, newCursorPos);
      range.setEnd(textNode, newCursorPos);
      selection.removeAllRanges();
      selection.addRange(range);

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

   return {
      suggestions,
      filteredFields,
      checkTrigger,
      checkTriggerRef,
      handleKeyDown,
      handleKeyDownRef,
      insertField,
      closeSuggestions
   };
}

export default useMergeFields;
