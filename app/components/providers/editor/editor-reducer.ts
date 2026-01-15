import { EditorActions } from "./editor-actions";
import { EditorState } from "./editor-state";

export const editorReducer = (state: EditorState, action: EditorActions): EditorState => {
    const copiedState = structuredClone(state)

    switch (action.type) {
        case 'SET_HTML':
            copiedState.editor.html = action.payload
            return copiedState

        case 'SELECTED_ELEMENT':
            copiedState.editor.selectedElement = action.payload
            return copiedState

        default:
            return state;
    }
};