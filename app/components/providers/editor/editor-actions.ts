
export type EditorActions =
    | {
        type: 'SET_HTML'
        payload: string
    }
    | {
        type: 'SELECTED_ELEMENT'
        payload: string
    }
