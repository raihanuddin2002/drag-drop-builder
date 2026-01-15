export type EditorState = {
    editor: {
        html: string
        selectedElement: string
    }
}

export const initialState: EditorState = {
    editor: {
        html: '',
        selectedElement: ''
    }
}