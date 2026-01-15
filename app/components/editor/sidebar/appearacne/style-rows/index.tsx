'use client'
import React from 'react'
import Alignment from './alignment'
import Background from './background'
import Width from './width'
import BorderRadius from './border-radius'
import Padding from './padding'
import Font from './font'


export default function EditorStyleRows() {
    return (
        <>
            <Alignment />
            <Background />
            <Width />
            <Padding />
            <BorderRadius />
            <Font />
        </>
    )
}

