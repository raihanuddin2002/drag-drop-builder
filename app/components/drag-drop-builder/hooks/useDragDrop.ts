import { useState, useCallback, useRef, RefObject } from 'react';

export interface DragDropBlock {
   id: string;
   html: string;
}

export interface UseDragDropOptions {
   shadowRootRef: RefObject<ShadowRoot | null>;
   onDrop?: (html: string, targetElement: HTMLElement) => void;
   onSaveHistory?: () => void;
   onUpdateContent?: () => void;
   onCalculatePageBreaks?: () => void;
}

/**
 * useDragDrop - A reusable hook for drag and drop functionality in editors
 *
 * Features:
 * - Handles dragging blocks from sidebar
 * - Handles reordering existing elements
 * - Shows drop indicator
 * - Supports drop zones (columns)
 *
 * @example
 * ```tsx
 * const {
 *   draggedComponent,
 *   setDraggedComponent,
 *   setupDragDropHandlers
 * } = useDragDrop({
 *   shadowRootRef,
 *   onDrop: (html, target) => { ... },
 *   onSaveHistory: saveHistory
 * });
 * ```
 */
export function useDragDrop({
   shadowRootRef,
   onDrop,
   onSaveHistory,
   onUpdateContent,
   onCalculatePageBreaks
}: UseDragDropOptions) {
   const [draggedComponent, setDraggedComponent] = useState<DragDropBlock | null>(null);
   const draggedElementRef = useRef<HTMLElement | null>(null);

   // Calculate insertion point based on mouse position
   const calculateInsertionPoint = useCallback((
      container: HTMLElement,
      mouseY: number
   ): { insertBefore: HTMLElement | null; lastChild: boolean } => {
      const children = Array.from(
         container.querySelectorAll(':scope > [data-xpath]:not(.drop-zone):not(.drop-indicator)')
      ) as HTMLElement[];

      if (children.length === 0) {
         return { insertBefore: null, lastChild: true };
      }

      for (const child of children) {
         const rect = child.getBoundingClientRect();
         const midY = rect.top + rect.height / 2;
         if (mouseY < midY) {
            return { insertBefore: child, lastChild: false };
         }
      }

      return { insertBefore: null, lastChild: true };
   }, []);

   // Place drop indicator
   const placeIndicator = useCallback((
      container: HTMLElement,
      insertBefore: HTMLElement | null,
      lastChild: boolean
   ) => {
      const shadow = shadowRootRef.current;
      if (!shadow) return;

      // Remove existing indicator
      shadow.querySelector('.drop-indicator')?.remove();

      // Create new indicator
      const indicator = document.createElement('div');
      indicator.className = 'drop-indicator';

      if (lastChild) {
         container.appendChild(indicator);
      } else if (insertBefore) {
         container.insertBefore(indicator, insertBefore);
      }
   }, [shadowRootRef]);

   // Setup drag/drop event handlers on a container
   const setupDragDropHandlers = useCallback((container: HTMLElement) => {
      const shadow = shadowRootRef.current;
      if (!shadow) return () => {};

      const handleDragOver = (e: Event) => {
         const dragEvent = e as DragEvent;
         dragEvent.preventDefault();

         const dragged = draggedElementRef.current;
         if (!draggedComponent && !dragged) return;

         const target = dragEvent.target as HTMLElement;

         // Find content container
         const contentFlow = shadow.querySelector('.content-flow') as HTMLElement;
         if (!contentFlow) return;

         // Check for drop-zone (column)
         const dropZone = target.closest('.drop-zone') as HTMLElement;
         if (dropZone) {
            const { insertBefore, lastChild } = calculateInsertionPoint(dropZone, dragEvent.clientY);
            placeIndicator(dropZone, insertBefore, lastChild);
            return;
         }

         // Check if over content container or its children
         if (target.closest('.content-flow') || target.classList.contains('content-flow')) {
            const { insertBefore, lastChild } = calculateInsertionPoint(contentFlow, dragEvent.clientY);
            placeIndicator(contentFlow, insertBefore, lastChild);
         }
      };

      const handleDragLeave = (e: Event) => {
         const dragEvent = e as DragEvent;
         const relatedTarget = dragEvent.relatedTarget as HTMLElement;

         // Only remove indicator if leaving the container entirely
         if (!container.contains(relatedTarget)) {
            shadow.querySelector('.drop-indicator')?.remove();
         }
      };

      const handleDrop = (e: Event) => {
         const dragEvent = e as DragEvent;
         dragEvent.preventDefault();

         const dropIndicator = shadow.querySelector('.drop-indicator') as HTMLElement;
         const dragged = draggedElementRef.current;

         if (dropIndicator) {
            onSaveHistory?.();

            if (draggedComponent) {
               // Insert new block
               dropIndicator.insertAdjacentHTML('beforebegin', draggedComponent.html);
               dropIndicator.remove();
               setDraggedComponent(null);
            } else if (dragged) {
               // Move existing element
               dropIndicator.parentNode?.insertBefore(dragged, dropIndicator);
               dropIndicator.remove();
               dragged.classList.remove('dragging');
               draggedElementRef.current = null;
            }

            onUpdateContent?.();
            onCalculatePageBreaks?.();
         }

         // Cleanup
         shadow.querySelectorAll('.drop-indicator').forEach(ind => ind.remove());
      };

      container.addEventListener('dragover', handleDragOver);
      container.addEventListener('dragleave', handleDragLeave);
      container.addEventListener('drop', handleDrop);

      // Return cleanup function
      return () => {
         container.removeEventListener('dragover', handleDragOver);
         container.removeEventListener('dragleave', handleDragLeave);
         container.removeEventListener('drop', handleDrop);
      };
   }, [
      shadowRootRef,
      draggedComponent,
      calculateInsertionPoint,
      placeIndicator,
      onSaveHistory,
      onUpdateContent,
      onCalculatePageBreaks
   ]);

   // Setup drag handlers for an element's drag button
   const setupElementDragHandlers = useCallback((
      dragBtn: HTMLElement,
      element: HTMLElement
   ) => {
      const shadow = shadowRootRef.current;
      if (!shadow) return () => {};

      dragBtn.draggable = true;

      const handleDragStart = (e: Event) => {
         const dragEvent = e as DragEvent;
         dragEvent.stopPropagation();
         draggedElementRef.current = element;
         element.classList.add('dragging');
         if (dragEvent.dataTransfer) {
            dragEvent.dataTransfer.effectAllowed = 'move';
            dragEvent.dataTransfer.setData('text/plain', 'element');
         }
      };

      const handleDragEnd = () => {
         if (draggedElementRef.current) {
            draggedElementRef.current.classList.remove('dragging');
            draggedElementRef.current = null;
            shadow.querySelectorAll('.drop-indicator').forEach(ind => ind.remove());
         }
      };

      dragBtn.addEventListener('dragstart', handleDragStart);
      dragBtn.addEventListener('dragend', handleDragEnd);

      return () => {
         dragBtn.removeEventListener('dragstart', handleDragStart);
         dragBtn.removeEventListener('dragend', handleDragEnd);
      };
   }, [shadowRootRef]);

   // Clear dragged component
   const clearDraggedComponent = useCallback(() => {
      setDraggedComponent(null);
      draggedElementRef.current = null;
   }, []);

   return {
      draggedComponent,
      setDraggedComponent,
      draggedElementRef,
      setupDragDropHandlers,
      setupElementDragHandlers,
      calculateInsertionPoint,
      placeIndicator,
      clearDraggedComponent
   };
}

export default useDragDrop;
