'use client'

import React, { useEffect, useRef, useState } from 'react'
import EditorToolbar from './toolbar'
import EditorSidebar from './sidebar'
import { DASHBOARD, EDITOR } from '@/config/config-layout'
import { cn } from '@/lib/utils'
import { useEditor, useEditorDispatch } from '../providers/editor'


// Generate XPath for a given element
const generateXPath = (el: HTMLElement | null): string => {
    if (!el || el.parentElement === null) return "";
    const parent = el.parentElement;
    const siblings = Array.from(parent.children);
    console.log(siblings, "siblings")
    const index = siblings.filter((sibling) => sibling.tagName === el.tagName).indexOf(el) + 1;
    const tag = el.tagName.toLowerCase();
    const path = generateXPath(parent);
    return `${path}/${tag}[${index}]`;
};

export default function Editor() {
    const dispatch = useEditorDispatch()
    const [showSidebar, setShowSidebar] = useState(true)
    const { html, selectedElement: selectedElementXPath } = useEditor((state) => state.editor);
    const iframeRef = useRef<HTMLIFrameElement>(null);

    console.log(selectedElementXPath)

    // side
    const [selectedElement, setSelectedElement] = useState<HTMLElement>()
    // const [attributes, setAttributes] = useState<Record<string, string>>({});
    // const [styles, setStyles] = useState<Record<string, string>>({});

    useEffect(() => {
        if (iframeRef.current) {
            const iframeDoc = iframeRef.current.contentDocument || iframeRef.current.contentWindow?.document;
            if (iframeDoc) {
                iframeDoc.open();
                iframeDoc.write(html);
                iframeDoc.close();

                // Add click event listener to capture selected elements
                iframeDoc.body.addEventListener("click", (event: MouseEvent) => {
                    event.preventDefault();
                    event.stopPropagation();

                    const target = event.target as HTMLElement;
                    console.log("target", target)
                    const xpath = `/html${generateXPath(target)}`;
                    console.log("xpath", xpath)
                    // dispatch(setSelectedElement(xpath));
                    dispatch({
                        type: 'SELECTED_ELEMENT',
                        payload: xpath
                    })
                });
            }
        }
    }, [html, dispatch])


    const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0]

        if (file) {
            const reader = new FileReader()

            reader.onload = (event) => {
                dispatch({
                    type: "SET_HTML",
                    payload: event.target?.result as string
                })

                // console.log(event.target?.result)
            }

            reader.readAsText(file)
        }
    };


    // side

    useEffect(() => {
        if (!selectedElementXPath) return;

        try {
            const parser = new DOMParser();
            const doc = parser.parseFromString(html, "text/html"); // Directly parse the HTML string
            console.log(doc);
            const element = doc.evaluate(
                selectedElementXPath,
                doc,
                null,
                XPathResult.FIRST_ORDERED_NODE_TYPE,
                null
            ).singleNodeValue as HTMLElement;
            setSelectedElement(element);

        } catch (error) {
            console.error("Error parsing HTML or evaluating XPath:", error);
        }
    }, [html, selectedElementXPath]);

    const handleInnerHtmlUpdate = (value: string) => {
        if (!selectedElementXPath) return;

        const parser = new DOMParser();
        const doc = parser.parseFromString(html, "text/html");

        // Use XPath to find the selected element
        const element = doc.evaluate(
            selectedElementXPath,
            doc,
            null,
            XPathResult.FIRST_ORDERED_NODE_TYPE,
            null
        ).singleNodeValue as HTMLElement;

        if (element) {
            element.innerHTML = value;

            // Update the Redux store
            //   dispatch(setHtml(doc.documentElement.outerHTML));
            dispatch({
                type: 'SET_HTML',
                payload: doc.documentElement.outerHTML
            })
        } else {
            console.warn("Element not found for XPath:", selectedElement);
        }
    };

    return (
        <section
            style={{
                height: `calc(100vh - ${DASHBOARD.HEADER.height}px)`,
                maxHeight: `calc(100vh - ${DASHBOARD.HEADER.height}px)`
            }}
            className='relative bg-[#f4f4f4] overflow-auto'
        >

            <EditorSidebar showSidebar={showSidebar} onHideSidebar={() => setShowSidebar(false)} />

            <section
                style={{ width: showSidebar ? `calc(100% - ${EDITOR.SIDEBAR.width}px)` : '100%' }}
                className={cn({ 'float-right transition-all delay-500 ease-in-out': showSidebar })}
            >
                <EditorToolbar />

                {/* canvas content Render */}
                <div>
                    <input type="file" accept="text/html" onChange={handleFileUpload} />

                    <div className='grid grid-cols-2 gap-5'>
                        <iframe ref={iframeRef} style={{ width: "100%", height: "75vh", border: "none" }} />

                        {selectedElement && (
                            <textarea
                                className='h-[100px]'
                                cols={50}
                                rows={8}
                                defaultValue={selectedElement.innerText}
                                onChange={(e) =>
                                    handleInnerHtmlUpdate(e.target.value)
                                }
                            />
                        )}
                    </div>
                </div>
            </section>
        </section >
    )
}
