'use client'

import {
   Copy,
   Download,
   Eye,
   GripVertical,
   Monitor,
   Plus,
   Redo2,
   Smartphone,
   Tablet,
   Trash,
   Trash2,
   Undo2,
   Upload
} from "lucide-react";
import { SettingsPanel } from "./SettingsSidebar";
import { useState, useCallback, useRef, useEffect } from "react";
import { Page, Breakpoint, Component, ElementInfo } from "./type";
import {
   CONTAINER_TAGS,
   EDITOR_STYLES,
   INITIAL_PAGE_HTML,
   NON_EDITABLE_TAGS,
   wrapPageInDocument
} from "./data";
import {
   createDefaultPage,
   extractBodyContent,
   extractStyles,
   generatePageId,
   generateXPath,
   isEditableElement,
   parseStyles
} from "./utils";
import RichTextToolbar from "./RichEditorToolbar";
import { ElementsSidebar } from "./ElementsSidebar";
import { PageSizeSettings } from "./PageSizeSettings";

export default function DragAndDropBuilder() {
   // Multi-page state
   const [pages, setPages] = useState<Page[]>(() => [createDefaultPage('Page 1')]);
   const [currentPageIndex, setCurrentPageIndex] = useState<number>(0);
   const currentPage = pages[currentPageIndex];

   // Selection state
   const [selectedXPath, setSelectedXPath] = useState<string | null>(null);
   const [selectedElement, setSelectedElement] = useState<HTMLElement | null>(null);
   const [breakpoint, setBreakpoint] = useState<Breakpoint>('desktop');
   const [draggedComponent, setDraggedComponent] = useState<Component | null>(null);
   const [isPreviewMode, setIsPreviewMode] = useState<boolean>(false);
   const [editorKey, setEditorKey] = useState<number>(0);

   // History tracks entire pages array for global undo/redo
   const [history, setHistory] = useState<{ past: Page[][]; future: Page[][] }>({ past: [], future: [] });

   // Helper to get/set current page html
   const html = currentPage.html;
   const setHtml = useCallback((newHtml: string) => {
      setPages(prev => prev.map((page, idx) =>
         idx === currentPageIndex ? { ...page, html: newHtml } : page
      ));
   }, [currentPageIndex]);

   const containerRef = useRef<HTMLDivElement>(null);
   const shadowRootRef = useRef<ShadowRoot | null>(null);
   const draggedElementRef = useRef<HTMLElement | null>(null);

   // Save to history (saves entire pages array)
   const saveHistory = useCallback(() => {
      setHistory(prev => ({
         past: [...prev.past.slice(-50), pages],
         future: []
      }));
   }, [pages]);

   // Undo
   const undo = useCallback(() => {
      setHistory(prev => {
         if (prev.past.length === 0) return prev;
         const newPast = [...prev.past];
         const previous = newPast.pop()!;
         const currentPages = pages;
         setPages(previous);
         // Adjust currentPageIndex if needed
         if (currentPageIndex >= previous.length) {
            setCurrentPageIndex(previous.length - 1);
         }
         return {
            past: newPast,
            future: [currentPages, ...prev.future]
         };
      });
   }, [pages, currentPageIndex]);

   // Redo
   const redo = useCallback(() => {
      setHistory(prev => {
         if (prev.future.length === 0) return prev;
         const [next, ...newFuture] = prev.future;
         const currentPages = pages;
         setPages(next);
         return {
            past: [...prev.past, currentPages],
            future: newFuture
         };
      });
   }, [pages]);

   // Page manipulation functions
   const addPage = useCallback(() => {
      saveHistory();
      const newPage = createDefaultPage(`Page ${pages.length + 1}`, {
         name: 'Custom',
         width: currentPage.width,
         height: currentPage.height,
      });
      setPages(prev => [...prev, newPage]);
      setCurrentPageIndex(pages.length);
   }, [pages.length, currentPage.width, currentPage.height, saveHistory]);

   const duplicatePage = useCallback((index: number) => {
      saveHistory();
      const pageToDuplicate = pages[index];
      const newPage: Page = {
         ...pageToDuplicate,
         id: generatePageId(),
         name: `${pageToDuplicate.name} (Copy)`,
      };
      const newPages = [...pages];
      newPages.splice(index + 1, 0, newPage);
      setPages(newPages);
      setCurrentPageIndex(index + 1);
   }, [pages, saveHistory]);

   const deletePage = useCallback((index: number) => {
      if (pages.length <= 1) return;
      saveHistory();
      setPages(prev => prev.filter((_, i) => i !== index));
      if (currentPageIndex >= index && currentPageIndex > 0) {
         setCurrentPageIndex(prev => prev - 1);
      }
   }, [pages.length, currentPageIndex, saveHistory]);

   const renamePage = useCallback((index: number, name: string) => {
      saveHistory();
      setPages(prev => prev.map((page, i) =>
         i === index ? { ...page, name } : page
      ));
   }, [saveHistory]);

   const changePageSize = useCallback((width: number, height: number) => {
      saveHistory();
      setPages(prev => prev.map((page, idx) =>
         idx === currentPageIndex ? { ...page, width, height } : page
      ));
   }, [currentPageIndex, saveHistory]);

   // Initialize shadow DOM - must reinitialize when page changes
   useEffect(() => {
      if (!containerRef.current) return;

      // Check if we need to attach a new shadow root
      // (shadow root might be attached to a different element)
      if (!containerRef.current.shadowRoot) {
         shadowRootRef.current = containerRef.current.attachShadow({ mode: 'open' });
      } else {
         shadowRootRef.current = containerRef.current.shadowRoot;
      }
   }, [currentPageIndex]);

   // Build full HTML from shadow DOM content
   const updateHtmlFromShadow = useCallback(() => {
      const shadow = shadowRootRef.current;
      if (!shadow) return;

      const container = shadow.querySelector('.shadow-root-container');
      if (!container) return;

      const clone = container.cloneNode(true) as HTMLElement;
      // Clean up editor attributes
      clone.querySelectorAll('[data-xpath]').forEach(el => {
         el.removeAttribute('data-xpath');
         el.removeAttribute('data-selected');
         el.removeAttribute('draggable');
      });
      clone.querySelectorAll('[contenteditable]').forEach(el => {
         el.removeAttribute('contenteditable');
      });
      clone.querySelectorAll('.element-toolbar').forEach(el => el.remove());
      clone.querySelectorAll('.drop-indicator').forEach(el => el.remove());

      const userStyles = extractStyles(html);
      const newHtml = /*html*/`
            <!DOCTYPE html>
                <html>
                    <head>
                        <meta charset="UTF-8">
                        <meta name="viewport" content="width=device-width, initial-scale=1.0">
                        <style>
                        ${userStyles}
                        </style>
                    </head>
                    <body>
                        ${clone.innerHTML}
                    </body>
                </html>
            `;

      setHtml(newHtml);
   }, [html]);

   // Duplicate element
   const duplicateElement = useCallback(() => {
      const shadow = shadowRootRef.current;
      if (!selectedXPath || !shadow) return;

      const el = shadow.querySelector(`[data-xpath="${selectedXPath}"]`) as HTMLElement;
      if (el && !el.hasAttribute('data-container')) {
         saveHistory();
         const clone = el.cloneNode(true) as HTMLElement;
         // Remove editor-specific attributes from clone
         clone.removeAttribute('data-xpath');
         clone.removeAttribute('data-selected');
         clone.removeAttribute('contenteditable');
         clone.querySelectorAll('.element-toolbar').forEach(t => t.remove());
         el.parentNode?.insertBefore(clone, el.nextSibling);
         updateHtmlFromShadow();
      }
   }, [selectedElement, selectedXPath, saveHistory, updateHtmlFromShadow]);

   // Render content into shadow DOM (main)
   useEffect(() => {
      const shadow = shadowRootRef.current;
      if (!shadow) return;

      const bodyContent = extractBodyContent(html);
      const userStyles = extractStyles(html);

      shadow.innerHTML = /*html*/`
         <style>${userStyles}</style>
         <style>
            ${EDITOR_STYLES({ currentPageHeight: currentPage?.height })}
         </style>
         <div class="shadow-root-container">${bodyContent}</div>
      `;

      const rootContainer = shadow.querySelector('.shadow-root-container');
      if (!rootContainer) return;

      // Drag & Drop adding imported html
      const normalizeForEditor = (root: HTMLElement) => {
         root.querySelectorAll('*').forEach(el => {
            // Remove foreign state
            el.removeAttribute('data-xpath');
            el.removeAttribute('data-selected');
            el.removeAttribute('contenteditable');
            el.removeAttribute('draggable');

            // ✅ semantic hints ONLY
            if (!NON_EDITABLE_TAGS.includes(el.tagName)) {
               el.setAttribute('data-editable', 'true');
            }

            // Only add data-container to the main page-container, not to column containers or widget DIVs
            if (CONTAINER_TAGS.includes(el.tagName) &&
               el.classList.contains('page-container') &&
               !el.hasAttribute('data-column-container')) {
               el.setAttribute('data-container', 'true');
            }
         });
      };
      normalizeForEditor(rootContainer as HTMLElement);

      // Add XPath data attributes and toolbar to all elements
      const addXPathData = (el: Element, root: HTMLElement): void => {
         if (el.nodeType !== 1) return;
         if (
            !NON_EDITABLE_TAGS.includes(el.tagName?.toUpperCase())
            && !el.classList.contains('shadow-root-container')
            && !el.classList.contains('element-toolbar')
         ) {
            const xpath = generateXPath(el as HTMLElement, root);
            el.setAttribute('data-xpath', xpath);

            // Add toolbar to editable elements AND column containers (but not main container or drop zones)
            const isColumnContainer = el.hasAttribute('data-column-container');
            const shouldHaveToolbar = !el.hasAttribute('data-container') && !el.classList.contains('drop-zone');

            if (shouldHaveToolbar) {
               // Add element toolbar
               const toolbar = document.createElement('div');
               toolbar.className = isColumnContainer ? 'element-toolbar column-toolbar' : 'element-toolbar';
               toolbar.setAttribute('contenteditable', 'false'); // Prevent toolbar from inheriting contenteditable
               toolbar.innerHTML = /*html*/`
                        <button class="element-toolbar-btn" data-action="drag" title="Drag">
                            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="9" cy="5" r="1"/><circle cx="9" cy="12" r="1"/><circle cx="9" cy="19" r="1"/><circle cx="15" cy="5" r="1"/><circle cx="15" cy="12" r="1"/><circle cx="15" cy="19" r="1"/></svg>
                        </button>
                        <button class="element-toolbar-btn" data-action="duplicate" title="Duplicate">
                            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>
                        </button>
                        <button class="element-toolbar-btn" data-action="delete" title="Delete">
                            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/></svg>
                        </button>
                    `;
               el.insertBefore(toolbar, el.firstChild);

               // Make element editable if it's an editable type (not img, hr, spacer, html-block, column-container)
               if (!isColumnContainer && isEditableElement(el as HTMLElement)) {
                  el.setAttribute('contenteditable', 'true');
               }
            }
         }
         Array.from(el.children).forEach(child => {
            if (!child.classList.contains('element-toolbar')) {
               addXPathData(child, root);
            }
         });
      };
      addXPathData(rootContainer, rootContainer as HTMLElement);

      // Click handler for selection
      const handleClick = (e: Event) => {
         const mouseEvent = e as MouseEvent;
         const target = mouseEvent.target as HTMLElement;

         // Handle toolbar button clicks
         const toolbarBtn = target.closest('.element-toolbar-btn');
         if (toolbarBtn) {
            mouseEvent.preventDefault();
            mouseEvent.stopPropagation();
            const action = toolbarBtn.getAttribute('data-action');
            const parentElement = toolbarBtn.closest('[data-xpath]');
            const xpath = parentElement?.getAttribute('data-xpath');

            if (xpath && action) {
               if (action === 'delete') {
                  const el = shadow.querySelector(`[data-xpath="${xpath}"]`) as HTMLElement;
                  if (el && !el.hasAttribute('data-container')) {
                     saveHistory();
                     el.remove();
                     updateHtmlFromShadow();
                     setSelectedXPath(null);
                     setSelectedElement(null);
                  }
               } else if (action === 'duplicate') {
                  const el = shadow.querySelector(`[data-xpath="${xpath}"]`) as HTMLElement;
                  if (el && !el.hasAttribute('data-container')) {
                     saveHistory();
                     const clone = el.cloneNode(true) as HTMLElement;
                     clone.removeAttribute('data-xpath');
                     clone.removeAttribute('data-selected');
                     el.parentNode?.insertBefore(clone, el.nextSibling);
                     updateHtmlFromShadow();
                  }
               }
            }
            return;
         }

         // Ignore clicks on toolbar itself
         if (target.closest('.element-toolbar')) {
            return;
         }

         // Check if click is on a drop-zone inside a column container
         const parentColumnContainer = target.closest('[data-column-container="true"]') as HTMLElement;

         // If clicking on a drop-zone inside a column container, select the column container
         if (target.classList.contains('drop-zone') && parentColumnContainer) {
            const xpath = parentColumnContainer.getAttribute('data-xpath');
            if (xpath) {
               mouseEvent.preventDefault();
               mouseEvent.stopPropagation();
               setSelectedXPath(xpath);
               setSelectedElement(parentColumnContainer);
            }
            return;
         }

         // Handle main container/drop-zone clicks - deselect
         if (target.hasAttribute('data-container') ||
            target.classList.contains('drop-zone') ||
            target.classList.contains('drop-indicator') ||
            target.classList.contains('shadow-root-container')) {
            setSelectedXPath(null);
            setSelectedElement(null);
            return;
         }

         // Check if clicking directly on a column container
         if (target.hasAttribute('data-column-container')) {
            const xpath = target.getAttribute('data-xpath');
            if (xpath) {
               mouseEvent.preventDefault();
               mouseEvent.stopPropagation();
               setSelectedXPath(xpath);
               setSelectedElement(target);
            }
            return;
         }

         // Find the element with xpath (could be the target or a parent)
         const elementWithXPath = target.closest('[data-xpath]') as HTMLElement;
         if (elementWithXPath && !elementWithXPath.classList.contains('element-toolbar')) {
            const xpath = elementWithXPath.getAttribute('data-xpath');
            if (xpath) {
               // Don't prevent default for contenteditable elements
               if (!elementWithXPath.hasAttribute('contenteditable')) {
                  mouseEvent.preventDefault();
               }
               mouseEvent.stopPropagation();
               setSelectedXPath(xpath);
               setSelectedElement(elementWithXPath);
            }
         }
      };

      rootContainer.addEventListener('click', handleClick);

      // Handle input/blur for contenteditable elements
      const handleInput = () => {
         // Debounced save on input
      };

      const handleBlur = (e: Event) => {
         const target = e.target as HTMLElement;
         if (target.hasAttribute('contenteditable') && target.hasAttribute('data-xpath')) {
            saveHistory();
            updateHtmlFromShadow();
         }
      };

      // Handle paste to strip inline styles from pasted content
      const handlePaste = (e: ClipboardEvent) => {
         const target = e.target as HTMLElement;
         if (!target.hasAttribute('contenteditable')) return;

         e.preventDefault();

         // Get HTML content from clipboard, fallback to plain text
         const html = e.clipboardData?.getData('text/html');
         const plainText = e.clipboardData?.getData('text/plain') || '';

         let contentToInsert = plainText;

         if (html) {
            // Parse and clean the HTML - remove inline styles
            const parser = new DOMParser();
            const doc = parser.parseFromString(html, 'text/html');

            // Remove style attributes from all elements
            doc.body.querySelectorAll('*').forEach(el => {
               el.removeAttribute('style');
               // Also remove class attributes that might carry external styling
               el.removeAttribute('class');
            });

            // Get cleaned text content (strip HTML tags for simpler insertion)
            contentToInsert = doc.body.textContent || plainText;
         }

         // Use execCommand for reliable insertion in contenteditable (works in Shadow DOM)
         document.execCommand('insertText', false, contentToInsert);

         saveHistory();
         updateHtmlFromShadow();
      };

      rootContainer.addEventListener('input', handleInput);
      rootContainer.addEventListener('paste', handlePaste as EventListener);
      rootContainer.addEventListener('focusout', handleBlur as EventListener);

      // Prevent contenteditable from capturing mousedown on toolbar buttons (except drag button)
      const actionBtns = shadow.querySelectorAll('.element-toolbar-btn[data-action="duplicate"], .element-toolbar-btn[data-action="delete"]');
      actionBtns.forEach(btn => {
         btn.addEventListener('mousedown', (e: Event) => {
            e.preventDefault();
            e.stopPropagation();
         });
      });

      // Setup drag buttons (dragstart/dragend)
      const allDragBtns = shadow.querySelectorAll('.element-toolbar-btn[data-action="drag"]');
      allDragBtns.forEach(dragBtn => {
         const el = dragBtn.closest('[data-xpath]') as HTMLElement;
         if (!el) return;

         (dragBtn as HTMLElement).draggable = true;
         dragBtn.addEventListener('dragstart', (e: Event) => {
            const dragEvent = e as DragEvent;
            dragEvent.stopPropagation();
            draggedElementRef.current = el;
            el.classList.add('dragging');
            if (dragEvent.dataTransfer) {
               dragEvent.dataTransfer.effectAllowed = 'move';
               dragEvent.dataTransfer.setData('text/plain', 'element');
            }
         });

         dragBtn.addEventListener('dragend', () => {
            if (draggedElementRef.current) {
               draggedElementRef.current.classList.remove('dragging');
               shadow.querySelectorAll('.drop-indicator').forEach(ind => ind.remove());
               shadow.querySelectorAll('.drag-over').forEach(zone => zone.classList.remove('drag-over'));
               draggedElementRef.current = null;
            }
         });
      });

      // Event delegation for dragover and drop
      const handleDragOver = (e: Event) => {
         const dragEvent = e as DragEvent;
         dragEvent.preventDefault();

         const target = dragEvent.target as HTMLElement;
         const dragged = draggedElementRef.current;

         if (!draggedComponent && !dragged) return;

         // Helper function to calculate insertion point within a container
         const calculateInsertionPoint = (container: HTMLElement, mouseY: number): { insertBefore: HTMLElement | null; lastChild: HTMLElement | null } => {
            const children = Array.from(
               container.querySelectorAll(':scope > [data-xpath]:not(.drop-zone):not(.drop-indicator)')
            ) as HTMLElement[];

            // Filter out the dragged element itself when reordering
            const validChildren = dragged
               ? children.filter(child => child !== dragged && !child.contains(dragged) && !dragged.contains(child))
               : children;

            if (validChildren.length === 0) {
               return { insertBefore: null, lastChild: null };
            }

            let insertBeforeElement: HTMLElement | null = null;
            for (const child of validChildren) {
               const rect = child.getBoundingClientRect();
               const centerY = rect.top + rect.height / 2;
               if (mouseY < centerY) {
                  insertBeforeElement = child;
                  break;
               }
            }

            return {
               insertBefore: insertBeforeElement,
               lastChild: validChildren[validChildren.length - 1]
            };
         };

         // Helper function to place indicator if position changed
         const placeIndicatorIfNeeded = (container: HTMLElement, insertBefore: HTMLElement | null, lastChild: HTMLElement | null) => {
            shadow.querySelectorAll('.drag-over').forEach(z => z.classList.remove('drag-over'));

            // If no children, highlight the container
            if (!lastChild) {
               const existingIndicator = shadow.querySelector('.drop-indicator');
               if (existingIndicator) existingIndicator.remove();
               container.classList.add('drag-over');
               return;
            }

            // Check if indicator is already at the correct position
            const existingIndicator = shadow.querySelector('.drop-indicator') as HTMLElement;
            if (existingIndicator) {
               if (insertBefore === null) {
                  if (existingIndicator.previousSibling === lastChild) return;
               } else {
                  if (existingIndicator.nextSibling === insertBefore) return;
               }
               existingIndicator.remove();
            }

            // Create and place the indicator
            const indicator = document.createElement('div');
            indicator.className = 'drop-indicator';

            if (insertBefore) {
               insertBefore.parentNode?.insertBefore(indicator, insertBefore);
            } else {
               lastChild.parentNode?.insertBefore(indicator, lastChild.nextSibling);
            }
         };

         // Check if we're inside a drop-zone (column container cell)
         const dropZone = target.closest('.drop-zone') as HTMLElement;

         if (dropZone) {
            // Check if there are elements inside the drop-zone to reorder around
            const { insertBefore, lastChild } = calculateInsertionPoint(dropZone, dragEvent.clientY);

            if (lastChild) {
               // Has children - show indicator for reordering
               placeIndicatorIfNeeded(dropZone, insertBefore, lastChild);
            } else {
               // Empty drop-zone - highlight it
               const existingIndicator = shadow.querySelector('.drop-indicator');
               if (existingIndicator) existingIndicator.remove();

               if (!dropZone.classList.contains('drag-over')) {
                  shadow.querySelectorAll('.drag-over').forEach(z => z.classList.remove('drag-over'));
                  dropZone.classList.add('drag-over');
               }
            }
            return;
         }

         // For main container: use unified insertion point calculation
         const mainContainer = shadow.querySelector('[data-container="true"]') as HTMLElement;
         if (!mainContainer) return;

         const { insertBefore, lastChild } = calculateInsertionPoint(mainContainer, dragEvent.clientY);
         placeIndicatorIfNeeded(mainContainer, insertBefore, lastChild);
      };

      const handleDragLeave = (e: Event) => {
         const target = e.target as HTMLElement;
         if (target.classList.contains('drop-zone') || target.hasAttribute('data-container') || target.hasAttribute('data-column-container')) {
            target.classList.remove('drag-over');
         }
      };

      const handleDrop = (e: Event) => {
         const dragEvent = e as DragEvent;
         dragEvent.preventDefault();
         dragEvent.stopPropagation();

         const target = dragEvent.target as HTMLElement;
         const dragged = draggedElementRef.current;

         // Check if there's a drop indicator - use it for placement
         const dropIndicator = shadow.querySelector('.drop-indicator') as HTMLElement;

         // Clean up visual states
         shadow.querySelectorAll('.drag-over').forEach(zone => zone.classList.remove('drag-over'));

         // Handle drop at indicator position (for both new components and existing elements)
         if (dropIndicator) {
            saveHistory();

            if (draggedComponent) {
               // Insert new component at indicator position
               dropIndicator.insertAdjacentHTML('beforebegin', draggedComponent.html);
               dropIndicator.remove();
               setDraggedComponent(null);
               updateHtmlFromShadow();
               return;
            } else if (dragged) {
               // Move existing element to indicator position
               const parent = dropIndicator.parentNode;
               dropIndicator.parentNode?.insertBefore(dragged, dropIndicator);
               dropIndicator.remove();
               dragged.classList.remove('dragging');
               draggedElementRef.current = null;

               // Recalculate XPath for the moved element to update selection
               const container = shadow.querySelector('.shadow-root-container') as HTMLElement;
               if (container && parent) {
                  const newXPath = generateXPath(dragged, container);
                  setSelectedXPath(newXPath);
                  setSelectedElement(dragged);
               }

               updateHtmlFromShadow();
               return;
            }
         }

         // Remove indicator if not used
         shadow.querySelectorAll('.drop-indicator').forEach(ind => ind.remove());

         // Handle drop zones and containers (for new components)
         // Include column containers as valid drop targets
         const dropZone = target.closest('.drop-zone, [data-container="true"], [data-column-container="true"]') as HTMLElement;
         if (dropZone) {
            if (draggedComponent) {
               saveHistory();
               dropZone.insertAdjacentHTML('beforeend', draggedComponent.html);
               setDraggedComponent(null);
               updateHtmlFromShadow();
               return;
            } else if (dragged && !dropZone.contains(dragged) && !dragged.contains(dropZone)) {
               saveHistory();
               dropZone.appendChild(dragged);
               dragged.classList.remove('dragging');
               draggedElementRef.current = null;
               updateHtmlFromShadow();
               return;
            }
         }

         // Cleanup if nothing happened
         if (dragged) {
            dragged.classList.remove('dragging');
            draggedElementRef.current = null;
         }
      };

      rootContainer.addEventListener('dragover', handleDragOver);
      rootContainer.addEventListener('dragleave', handleDragLeave);
      rootContainer.addEventListener('drop', handleDrop);

      return () => {
         rootContainer.removeEventListener('click', handleClick);
         rootContainer.removeEventListener('input', handleInput);
         rootContainer.removeEventListener('paste', handlePaste as EventListener);
         rootContainer.removeEventListener('focusout', handleBlur as EventListener);
         rootContainer.removeEventListener('dragover', handleDragOver);
         rootContainer.removeEventListener('dragleave', handleDragLeave);
         rootContainer.removeEventListener('drop', handleDrop);
      };
   }, [html, draggedComponent, saveHistory, updateHtmlFromShadow, currentPageIndex]);

   // Update selection highlight
   useEffect(() => {
      const shadow = shadowRootRef.current;
      if (!shadow) return;

      shadow.querySelectorAll('[data-selected]').forEach(el => el.removeAttribute('data-selected'));

      if (selectedXPath) {
         const el = shadow.querySelector(`[data-xpath="${selectedXPath}"]`);
         if (el) {
            el.setAttribute('data-selected', 'true');
            setSelectedElement(el as HTMLElement);
         }
      }
   }, [selectedXPath, html]);

   const updateContent = (value: string, isHtml: boolean = false): void => {
      const shadow = shadowRootRef.current;
      if (!selectedXPath || !shadow) return;

      const el = shadow.querySelector(`[data-xpath="${selectedXPath}"]`) as HTMLElement;
      if (el) {
         saveHistory();

         if (isHtml) {
            // For HTML blocks, update innerHTML
            el.innerHTML = value;

            // Re-add toolbar
            const toolbar = document.createElement('div');
            toolbar.className = 'element-toolbar';
            toolbar.setAttribute('contenteditable', 'false'); // Prevent toolbar from inheriting contenteditable
            toolbar.innerHTML = /* html */`
                    <button class="element-toolbar-btn" data-action="drag" title="Drag">
                        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="9" cy="5" r="1"/><circle cx="9" cy="12" r="1"/><circle cx="9" cy="19" r="1"/><circle cx="15" cy="5" r="1"/><circle cx="15" cy="12" r="1"/><circle cx="15" cy="19" r="1"/></svg>
                    </button>
                    <button class="element-toolbar-btn" data-action="duplicate" title="Duplicate">
                        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>
                    </button>
                    <button class="element-toolbar-btn" data-action="delete" title="Delete">
                        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/></svg>
                    </button>
                `;
            el.insertBefore(toolbar, el.firstChild);
         } else if (el.tagName === 'IMG') {
            (el as HTMLImageElement).src = value;
         } else {
            el.textContent = value;
         }
         updateHtmlFromShadow();
      }
   };

   const updateStyle = (prop: string, value: string, livePreview?: boolean): void => {
      const shadow = shadowRootRef.current;
      if (!selectedXPath || !shadow) return;

      const el = shadow.querySelector(`[data-xpath="${selectedXPath}"]`) as HTMLElement;
      if (el) {
         if (!livePreview) {
            saveHistory();
         }
         (el.style as any)[prop] = value;
         // Skip HTML sync during live preview to avoid re-renders
         if (!livePreview) {
            updateHtmlFromShadow();
         }
      }
   };

   const updateAttribute = (attr: string, value: string): void => {
      const shadow = shadowRootRef.current;
      if (!selectedXPath || !shadow) return;

      const el = shadow.querySelector(`[data-xpath="${selectedXPath}"]`) as HTMLElement;
      if (el) {
         saveHistory();
         el.setAttribute(attr, value);
         updateHtmlFromShadow();
      }
   };

   const updateInlineLink = (index: number, href: string): void => {
      const shadow = shadowRootRef.current;
      if (!selectedXPath || !shadow) return;

      const el = shadow.querySelector(`[data-xpath="${selectedXPath}"]`) as HTMLElement;
      if (el) {
         const links = el.querySelectorAll('a');
         if (links[index]) {
            saveHistory();
            links[index].setAttribute('href', href);
            links[index].setAttribute('target', '_blank');
            links[index].setAttribute('rel', 'noopener noreferrer');
            updateHtmlFromShadow();
         }
      }
   };

   const removeInlineLink = (index: number): void => {
      const shadow = shadowRootRef.current;
      if (!selectedXPath || !shadow) return;

      const el = shadow.querySelector(`[data-xpath="${selectedXPath}"]`) as HTMLElement;
      if (el) {
         const links = el.querySelectorAll('a');
         if (links[index]) {
            saveHistory();
            const link = links[index];
            // Create a document fragment with the anchor's contents
            const fragment = document.createDocumentFragment();
            while (link.firstChild) {
               fragment.appendChild(link.firstChild);
            }
            // Replace the anchor with its contents
            link.parentNode?.replaceChild(fragment, link);
            updateHtmlFromShadow();
         }
      }
   };

   const updateCustomCss = (css: string): void => {
      const shadow = shadowRootRef.current;
      if (!selectedXPath || !shadow) return;

      const el = shadow.querySelector(`[data-xpath="${selectedXPath}"]`) as HTMLElement;
      if (el) {
         saveHistory();
         el.setAttribute('style', css);
         updateHtmlFromShadow();
      }
   };

   const deleteElement = (): void => {
      const shadow = shadowRootRef.current;
      if (!selectedXPath || !shadow) return;

      const el = shadow.querySelector(`[data-xpath="${selectedXPath}"]`) as HTMLElement;
      if (el && !el.hasAttribute('data-container')) {
         saveHistory();
         el.remove();
         updateHtmlFromShadow();
         setSelectedXPath(null);
         setSelectedElement(null);
      }
   };

   const handleSidebarDragStart = (component: Component): void => {
      setDraggedComponent(component);
   };

   const handleSidebarDragEnd = (): void => {
      setDraggedComponent(null);
      const shadow = shadowRootRef.current;
      if (shadow) {
         shadow.querySelectorAll('.drag-over').forEach(zone => zone.classList.remove('drag-over'));
      }
   };

   // Rich editor
   const handleFormat = useCallback((command: string, value?: string) => {
      const shadow = shadowRootRef.current;
      if (!shadow) return;

      // Get selection from shadow root or document
      const selection = (shadow as any).getSelection?.() ?? document.getSelection();

      // For unlink, try to work even without selection by using the active element
      if (command === 'unlink') {
         let anchor: HTMLAnchorElement | null = null;

         // First try to find anchor from selection
         if (selection && selection.rangeCount > 0) {
            const range = selection.getRangeAt(0);
            let node: Node | null = range.startContainer;

            while (node) {
               if (node.nodeType === Node.ELEMENT_NODE && (node as Element).tagName === 'A') {
                  anchor = node as HTMLAnchorElement;
                  break;
               }
               if (node === shadow || node === document.body || !node.parentNode) {
                  break;
               }
               node = node.parentNode;
            }

            if (!anchor) {
               node = range.commonAncestorContainer;
               while (node) {
                  if (node.nodeType === Node.ELEMENT_NODE && (node as Element).tagName === 'A') {
                     anchor = node as HTMLAnchorElement;
                     break;
                  }
                  if (node === shadow || node === document.body || !node.parentNode) {
                     break;
                  }
                  node = node.parentNode;
               }
            }
         }

         // Fallback: try to find anchor from the currently selected element
         if (!anchor && selectedXPath) {
            const selectedEl = shadow.querySelector(`[data-xpath="${selectedXPath}"]`);
            if (selectedEl) {
               // Check if the selected element itself is an anchor
               if (selectedEl.tagName === 'A') {
                  anchor = selectedEl as HTMLAnchorElement;
               } else {
                  // Find the first anchor inside
                  anchor = selectedEl.querySelector('a');
               }
            }
         }

         if (anchor) {
            saveHistory();
            const fragment = document.createDocumentFragment();
            while (anchor.firstChild) {
               fragment.appendChild(anchor.firstChild);
            }
            anchor.parentNode?.replaceChild(fragment, anchor);
            updateHtmlFromShadow();
         }
         return;
      }

      if (!selection || selection.rangeCount === 0) return;

      // Handle fontSize specially - execCommand expects 1-7, but we want px values
      if (command === 'fontSize' && value) {
         const range = selection.getRangeAt(0);
         if (!range.collapsed) {
            // Wrap selection in a span with font-size style
            const span = document.createElement('span');
            span.style.fontSize = value;
            try {
               range.surroundContents(span);
               saveHistory();
               updateHtmlFromShadow();
            } catch (e) {
               // If surroundContents fails (selection spans multiple elements), use execCommand fallback
               // Map px to legacy font sizes (1-7)
               const pxValue = parseInt(value);
               let legacySize = '3'; // default
               if (pxValue <= 10) legacySize = '1';
               else if (pxValue <= 13) legacySize = '2';
               else if (pxValue <= 16) legacySize = '3';
               else if (pxValue <= 18) legacySize = '4';
               else if (pxValue <= 24) legacySize = '5';
               else if (pxValue <= 32) legacySize = '6';
               else legacySize = '7';
               document.execCommand('fontSize', false, legacySize);
               updateHtmlFromShadow();
            }
         }
         return;
      }

      // Handle fontName specially
      if (command === 'fontName' && value) {
         const range = selection.getRangeAt(0);
         if (!range.collapsed) {
            // Wrap selection in a span with font-family style
            const span = document.createElement('span');
            span.style.fontFamily = value;
            try {
               range.surroundContents(span);
               saveHistory();
               updateHtmlFromShadow();
            } catch (e) {
               // Fallback to execCommand
               document.execCommand(command, false, value);
               updateHtmlFromShadow();
            }
         }
         return;
      }

      // Handle alignment - skip execCommand, use style update instead (handled by onUpdateStyle)
      if (['justifyLeft', 'justifyCenter', 'justifyRight', 'justifyFull'].includes(command)) {
         // Alignment is handled via onUpdateStyle('textAlign', ...) in RichTextToolbar
         // Don't use execCommand as it creates wrapper elements
         return;
      }

      // Handle foreColor - skip execCommand, use style update instead
      if (command === 'foreColor') {
         // Color is handled via onUpdateStyle('color', ...) in RichTextToolbar
         return;
      }

      // Handle createLink specially - add target="_blank" and styling
      if (command === 'createLink' && value) {
         const range = selection.getRangeAt(0);
         if (!range.collapsed) {
            const anchor = document.createElement('a');
            anchor.href = value;
            anchor.target = '_blank';
            anchor.rel = 'noopener noreferrer';
            anchor.style.color = '#2563eb';
            anchor.style.textDecoration = 'underline';
            try {
               range.surroundContents(anchor);
               saveHistory();
               updateHtmlFromShadow();
            } catch (e) {
               // Fallback to execCommand if selection spans multiple elements
               document.execCommand(command, false, value);
               // Try to add target="_blank" to newly created links
               const container = range.commonAncestorContainer;
               const parent = container.nodeType === Node.TEXT_NODE ? container.parentElement : container as Element;
               if (parent) {
                  const links = parent.querySelectorAll('a[href="' + value + '"]:not([target])');
                  links.forEach((link: Element) => {
                     link.setAttribute('target', '_blank');
                     link.setAttribute('rel', 'noopener noreferrer');
                     (link as HTMLElement).style.color = '#2563eb';
                     (link as HTMLElement).style.textDecoration = 'underline';
                  });
               }
               updateHtmlFromShadow();
            }
         }
         return;
      }

      // Handle indent/outdent with margin instead of blockquote
      if (command === 'indent' || command === 'outdent') {
         const range = selection.getRangeAt(0);
         let blockElement: HTMLElement | null = null;

         // Find the parent block element
         let node: Node | null = range.startContainer;
         while (node) {
            if (node.nodeType === Node.ELEMENT_NODE) {
               const el = node as HTMLElement;
               const display = window.getComputedStyle(el).display;
               if (display === 'block' || display === 'list-item' || el.tagName === 'P' || el.tagName === 'DIV' || el.tagName === 'LI') {
                  blockElement = el;
                  break;
               }
            }
            if (node === shadow || !node.parentNode) break;
            node = node.parentNode;
         }

         if (blockElement) {
            saveHistory();
            const currentMargin = parseInt(blockElement.style.marginLeft) || 0;
            const step = 20; // 20px per indent level
            if (command === 'indent') {
               blockElement.style.marginLeft = `${currentMargin + step}px`;
            } else {
               blockElement.style.marginLeft = `${Math.max(0, currentMargin - step)}px`;
            }
            updateHtmlFromShadow();
         }
         return;
      }

      // execCommand is deprecated but still works for rich text editing
      document.execCommand(command, false, value);

      // Save changes after formatting
      setTimeout(() => {
         updateHtmlFromShadow();
      }, 0);
   }, [updateHtmlFromShadow, saveHistory, selectedXPath]);

   // Clean page HTML for export (remove editor-specific attributes)
   const cleanPageHtml = (pageHtml: string): string => {
      const parser = new DOMParser();
      const doc = parser.parseFromString(`<div>${pageHtml}</div>`, 'text/html');
      const container = doc.body.firstElementChild;
      if (!container) return pageHtml;

      container.querySelectorAll('[data-xpath]').forEach(el => {
         el.removeAttribute('data-xpath');
         el.removeAttribute('data-selected');
         el.removeAttribute('draggable');
         el.removeAttribute('contenteditable');
      });
      container.querySelectorAll('.element-toolbar').forEach(el => el.remove());
      container.querySelectorAll('[data-editable]').forEach(el => el.removeAttribute('data-editable'));

      return container.innerHTML;
   };

   // Export all pages as a single HTML file with page breaks
   const exportHTML = () => {
      const pageStyles = pages.map((page, idx) => /* css */`
            .page-${idx + 1} {
                width: ${page.width}px;
                min-height: ${page.height}px;
                margin: 0 auto 40px auto;
                background: white;
                box-shadow: 0 2px 8px rgba(0,0,0,0.1);
                page-break-after: always;
            }
            @media print {
                .page-${idx + 1} {
                    box-shadow: none;
                    margin: 0;
                }
            }
        `).join('\n');

      const pagesHtml = pages.map((page, idx) =>/* html */ `
            <div class="page-${idx + 1}" data-page-name="${page.name}">
                ${cleanPageHtml(page.html)}
            </div>
        `).join('\n');

      const fullHtml = /* html */`
      <!DOCTYPE html>
         <html>
            <head>
               <meta charset="UTF-8">
               <meta name="viewport" content="width=device-width, initial-scale=1.0">
               <title>Exported Document</title>
               <style>
                  * { box-sizing: border-box; }
                  body { margin: 0; padding: 20px; font-family: system-ui, sans-serif; background: #f5f5f5; }
                  ${pageStyles}
               </style>
            </head>

            <body>
            ${pagesHtml}
            </body>
         </html>
      `;

      const blob = new Blob([fullHtml], { type: 'text/html' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'document.html';
      a.click();
      URL.revokeObjectURL(url);
   };

   // Export current page only
   const exportCurrentPage = () => {
      const page = currentPage;
      const cleanHtml = cleanPageHtml(page.html);
      const fullHtml = wrapPageInDocument({ ...page, html: cleanHtml });

      const blob = new Blob([fullHtml], { type: 'text/html' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${page.name.replace(/\s+/g, '-').toLowerCase()}.html`;
      a.click();
      URL.revokeObjectURL(url);
   };

   const importHTML = (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;

      const reader = new FileReader();
      reader.onload = (event) => {
         const content = event.target?.result as string;
         if (content) {
            saveHistory();
            // Extract body content for the current page
            const bodyMatch = content.match(/<body[^>]*>([\s\S]*)<\/body>/i);
            const bodyContent = bodyMatch ? bodyMatch[1].trim() : content;
            setHtml(bodyContent || INITIAL_PAGE_HTML);
            setSelectedXPath(null);
            setSelectedElement(null);
         }
      };
      reader.readAsText(file);
      e.target.value = '';
   };


   const getElementInfo = (): ElementInfo | null => {
      const shadow = shadowRootRef.current;
      if (!selectedXPath || !shadow) return null;

      // Always query the current element from shadow DOM to avoid stale references
      const el = shadow.querySelector(`[data-xpath="${selectedXPath}"]`) as HTMLElement;
      if (!el) return null;

      const customCss = el.getAttribute('style') || '';
      const styles = parseStyles(customCss);
      const tag = el.tagName.toLowerCase();
      const content = el.textContent || '';

      // Get innerHTML without the toolbar
      const clone = el.cloneNode(true) as HTMLElement;
      clone.querySelectorAll('.element-toolbar').forEach(t => t.remove());

      const innerHTML = clone.innerHTML;
      const src = el.getAttribute('src') || '';
      const href = el.getAttribute('href') || '';
      const alt = el.getAttribute('alt') || '';
      const isHtmlBlock = el.hasAttribute('data-html-block');

      // Extract inline links from the element
      const inlineLinks: { href: string; text: string; index: number }[] = [];
      const links = el.querySelectorAll('a');
      links.forEach((link, index) => {
         inlineLinks.push({
            href: link.getAttribute('href') || '',
            text: link.textContent || '',
            index
         });
      });

      return { tag, styles, content, innerHTML, src, href, alt, isHtmlBlock, customCss, inlineLinks };
   };

   const elementInfo = getElementInfo();

   return (
      <div className="flex h-screen bg-gray-100">
         {/* Left Sidebar - Elements */}
         {!isPreviewMode && (
            <div className="w-52 bg-white border-r flex flex-col">
               <ElementsSidebar
                  onDragStart={handleSidebarDragStart}
                  onDragEnd={handleSidebarDragEnd}
               />
            </div>
         )}

         {/* Main Canvas Area */}
         <div className="flex-1 flex flex-col">
            {/* Main Toolbar */}
            <div className="bg-white border-b p-2 flex items-center justify-between">
               <div className="flex items-center gap-2">
                  <button
                     onClick={undo}
                     disabled={history.past.length === 0}
                     className="p-2 rounded text-gray-600 hover:bg-gray-100 disabled:opacity-50"
                     title="Undo"
                  >
                     <Undo2 size={18} />
                  </button>
                  <button
                     onClick={redo}
                     disabled={history.future.length === 0}
                     className="p-2 rounded text-gray-600 hover:bg-gray-100 disabled:opacity-50"
                     title="Redo"
                  >
                     <Redo2 size={18} />
                  </button>

                  <div className="w-px h-6 bg-gray-300 mx-2" />

                  {/* Page Size Settings */}
                  <PageSizeSettings
                     currentPage={currentPage}
                     onChangeSize={changePageSize}
                  />

                  <div className="w-px h-6 bg-gray-300 mx-2" />

                  <button
                     onClick={() => setBreakpoint('desktop')}
                     className={`p-2 rounded ${breakpoint === 'desktop' ? 'bg-green-100 text-green-600' : 'text-gray-600 hover:bg-gray-100'}`}
                     title="Desktop (100%)"
                  >
                     <Monitor size={18} />
                  </button>
                  <button
                     onClick={() => setBreakpoint('tablet')}
                     className={`p-2 rounded ${breakpoint === 'tablet' ? 'bg-green-100 text-green-600' : 'text-gray-600 hover:bg-gray-100'}`}
                     title="Tablet Preview"
                  >
                     <Tablet size={18} />
                  </button>
                  <button
                     onClick={() => setBreakpoint('mobile')}
                     className={`p-2 rounded ${breakpoint === 'mobile' ? 'bg-green-100 text-green-600' : 'text-gray-600 hover:bg-gray-100'}`}
                     title="Mobile Preview"
                  >
                     <Smartphone size={18} />
                  </button>
               </div>

               <div className="flex items-center gap-2">
                  <button
                     onClick={() => {
                        if (isPreviewMode) {
                           setEditorKey(k => k + 1);
                        } else {
                           setSelectedXPath(null);
                           setSelectedElement(null);
                        }
                        setIsPreviewMode(!isPreviewMode);
                     }}
                     className={`flex items-center gap-2 px-4 py-2 rounded text-sm ${isPreviewMode
                        ? 'bg-blue-500 text-white hover:bg-blue-600'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                        }`}
                     title={isPreviewMode ? "Exit Preview" : "Preview Mode"}
                  >
                     <Eye size={16} />
                     {isPreviewMode ? 'Exit Preview' : 'Preview'}
                  </button>
                  <label className="flex items-center gap-2 px-4 py-2 bg-gray-100 text-gray-700 rounded hover:bg-gray-200 cursor-pointer text-sm">
                     <Upload size={16} />
                     Import
                     <input type="file" accept=".html,.htm" onChange={importHTML} className="hidden" />
                  </label>
                  <button
                     onClick={exportCurrentPage}
                     className="flex items-center gap-2 px-4 py-2 bg-gray-100 text-gray-700 rounded hover:bg-gray-200 text-sm"
                     title="Export current page only"
                  >
                     <Download size={16} />
                     Page
                  </button>
                  <button
                     onClick={exportHTML}
                     className="flex items-center gap-2 px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600 text-sm"
                     title="Export all pages"
                  >
                     <Download size={16} />
                     Export All
                  </button>
               </div>
            </div>

            {/* Rich Text Toolbar */}
            {!isPreviewMode && (
               <RichTextToolbar
                  onFormat={handleFormat}
                  onUpdateStyle={updateStyle}
                  onCommitChanges={() => {
                     saveHistory();
                     updateHtmlFromShadow();
                  }}
                  elementInfo={elementInfo}
               />
            )}

            {/* Canvas - Vertical Scrolling Pages */}
            <div className="flex-1 overflow-auto bg-gray-300 p-6">
               <div className="flex flex-col items-center gap-8">
                  {pages.map((page, index) => (
                     <div key={page.id} className="relative">
                        {/* Page Label */}
                        <div className="absolute -top-6 left-0 flex items-center gap-2">
                           <span className="text-sm font-medium text-gray-600">
                              {page.name}
                           </span>
                           <span className="text-xs text-gray-400">
                              {page.width} x {page.height}
                           </span>
                           {!isPreviewMode && pages.length > 1 && (
                              <button
                                 onClick={(e) => {
                                    e.stopPropagation();
                                    deletePage(index);
                                 }}
                                 className="p-1 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded"
                                 title="Delete page"
                              >
                                 <Trash2 size={14} />
                              </button>
                           )}
                           {!isPreviewMode && (
                              <button
                                 onClick={(e) => {
                                    e.stopPropagation();
                                    duplicatePage(index);
                                 }}
                                 className="p-1 text-gray-400 hover:text-green-500 hover:bg-green-50 rounded"
                                 title="Duplicate page"
                              >
                                 <Copy size={14} />
                              </button>
                           )}
                        </div>

                        {/* Page Canvas */}
                        <div
                           onClick={() => !isPreviewMode && currentPageIndex !== index && setCurrentPageIndex(index)}
                           className={`bg-white shadow-lg rounded transition-all ${isPreviewMode
                              ? ''
                              : currentPageIndex === index
                                 ? 'ring-2 ring-green-500 ring-offset-2'
                                 : 'cursor-pointer hover:ring-2 hover:ring-gray-300 hover:ring-offset-2'
                              }`}
                           style={{
                              width: page.width,
                              minHeight: page.height,
                              overflow: 'visible',
                           }}
                        >
                           {isPreviewMode ? (
                              /* Preview Mode - show clean HTML */
                              <div
                                 style={{
                                    width: '100%',
                                    minHeight: page.height,
                                    overflow: 'hidden',
                                 }}
                                 dangerouslySetInnerHTML={{ __html: cleanPageHtml(page.html) }}
                              />
                           ) : currentPageIndex === index ? (
                              <>
                                 {draggedComponent && (
                                    <div className="bg-green-50 border border-green-300 p-3 text-center text-sm text-green-700 rounded-t">
                                       <GripVertical className="inline mr-2" size={16} />
                                       Dragging <strong>{draggedComponent.label}</strong> - Drop into container
                                    </div>
                                 )}
                                 <div
                                    key={`editor-${page.id}-${editorKey}`}
                                    ref={containerRef}
                                    onClick={(e) => e.stopPropagation()}
                                    onDragOver={(e) => e.stopPropagation()}
                                    onDrop={(e) => e.stopPropagation()}
                                    style={{
                                       width: '100%',
                                       minHeight: page.height,
                                       overflow: 'visible',
                                       // paddingTop: '40px',
                                    }}
                                 />
                              </>
                           ) : (
                              /* Preview for non-active pages */
                              <div
                                 className="pointer-events-none opacity-90"
                                 style={{
                                    width: '100%',
                                    minHeight: page.height,
                                    overflow: 'hidden',
                                 }}
                                 dangerouslySetInnerHTML={{ __html: page.html }}
                              />
                           )}
                        </div>
                     </div>
                  ))}

                  {/* Add Page Button */}
                  {!isPreviewMode && (
                     <button
                        onClick={addPage}
                        className="flex items-center gap-2 px-6 py-3 border border-dashed border-gray-400 rounded-lg text-gray-500 hover:border-green-500 hover:text-green-600 hover:bg-green-50 transition-colors"
                     >
                        <Plus size={20} />
                        Add New Page
                     </button>
                  )}
               </div>
            </div>
         </div>

         {/* Right Sidebar - Settings */}
         {!isPreviewMode && (
            <div className={`bg-white border-l transition-all duration-300 ${selectedXPath ? 'w-72' : 'w-0'} overflow-hidden`}>
               {selectedXPath && elementInfo && (
                  <SettingsPanel
                     elementInfo={elementInfo}
                     elementKey={selectedXPath}
                     onUpdateContent={updateContent}
                     onUpdateStyle={updateStyle}
                     onUpdateAttribute={updateAttribute}
                     onUpdateInlineLink={updateInlineLink}
                     onRemoveInlineLink={removeInlineLink}
                     onUpdateCustomCss={updateCustomCss}
                     onCommitChanges={() => {
                        saveHistory();
                        updateHtmlFromShadow();
                     }}
                     onDelete={deleteElement}
                     onDuplicate={duplicateElement}
                     onClose={() => {
                        setSelectedXPath(null);
                        setSelectedElement(null);
                     }}
                  />
               )}
            </div>
         )}
      </div>
   );
}