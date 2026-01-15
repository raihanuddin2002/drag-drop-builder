'use client'

import { createContext, Dispatch, useReducer } from 'react'
import { editorReducer } from './editor-reducer'
import { EditorActions } from './editor-actions'
import { EditorState, initialState } from './editor-state'

type EditorProps = {
    children: React.ReactNode
}

type ContextValue = {
    state: EditorState
    dispatch: Dispatch<EditorActions>
}

export const EditorContext = createContext<ContextValue | null>(null)

const EditorProvider = ({ children }: EditorProps) => {
    const [state, dispatch] = useReducer(editorReducer, initialState)

    return (
        <EditorContext.Provider value={{ state, dispatch }}>
            {children}
        </EditorContext.Provider>
    )
}

export default EditorProvider
