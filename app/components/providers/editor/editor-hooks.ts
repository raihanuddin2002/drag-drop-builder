import { useContext } from "react"
import { EditorContext } from "./editor-provider"
import { EditorState } from "./editor-state"

export const useEditorDispatch = () => {
    const context = useContext(EditorContext)

    if (!context) {
        throw new Error('useGlobalDispatch must be used within a GlobalStateProvider')
    }

    return context.dispatch

}

export const useEditor = <T>(selector: (state: EditorState) => T): T => {
    const context = useContext(EditorContext)

    if (!context) {
        throw new Error('EditorState must be used within a GlobalStateProvider')
    }

    return selector(context.state);
};