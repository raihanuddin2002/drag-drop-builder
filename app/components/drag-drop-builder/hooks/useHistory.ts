import { useState, useCallback, useRef } from 'react';

export interface HistoryState<T> {
   past: T[];
   future: T[];
}

export interface UseHistoryOptions {
   maxHistory?: number;
}

export interface UseHistoryReturn<T> {
   /** Save current state to history */
   saveHistory: () => void;
   /** Undo to previous state */
   undo: () => void;
   /** Redo to next state */
   redo: () => void;
   /** Check if undo is available */
   canUndo: boolean;
   /** Check if redo is available */
   canRedo: boolean;
   /** Clear all history */
   clearHistory: () => void;
   /** Get current history state */
   history: HistoryState<T>;
}

/**
 * useHistory - A generic undo/redo history hook
 *
 * Features:
 * - Maintains undo/redo stacks
 * - Configurable max history size
 * - Clear future on new save
 * - Type-safe with generics
 *
 * @example
 * ```tsx
 * const [document, setDocument] = useState<EditorDocument>(initialDoc);
 * const { saveHistory, undo, redo, canUndo, canRedo } = useHistory({
 *   currentState: document,
 *   onStateChange: setDocument,
 *   maxHistory: 50
 * });
 *
 * // Before making changes:
 * saveHistory();
 * setDocument(newDoc);
 *
 * // To undo:
 * if (canUndo) undo();
 * ```
 */
export function useHistory<T>(
   currentState: T,
   onStateChange: (state: T) => void,
   options: UseHistoryOptions = {}
): UseHistoryReturn<T> {
   const { maxHistory = 50 } = options;

   const [history, setHistory] = useState<HistoryState<T>>({
      past: [],
      future: []
   });

   const stateRef = useRef(currentState);
   stateRef.current = currentState;

   const onChangeRef = useRef(onStateChange);
   onChangeRef.current = onStateChange;

   const saveHistory = useCallback(() => {
      setHistory(prev => ({
         past: [...prev.past.slice(-maxHistory), stateRef.current],
         future: []
      }));
   }, [maxHistory]);

   const undo = useCallback(() => {
      setHistory(prev => {
         if (prev.past.length === 0) return prev;

         const newPast = [...prev.past];
         const previous = newPast.pop()!;

         onChangeRef.current(previous);

         return {
            past: newPast,
            future: [stateRef.current, ...prev.future]
         };
      });
   }, []);

   const redo = useCallback(() => {
      setHistory(prev => {
         if (prev.future.length === 0) return prev;

         const [next, ...newFuture] = prev.future;

         onChangeRef.current(next);

         return {
            past: [...prev.past, stateRef.current],
            future: newFuture
         };
      });
   }, []);

   const clearHistory = useCallback(() => {
      setHistory({ past: [], future: [] });
   }, []);

   return {
      saveHistory,
      undo,
      redo,
      canUndo: history.past.length > 0,
      canRedo: history.future.length > 0,
      clearHistory,
      history
   };
}

export default useHistory;
