import EditorCounter from '@/components/editor/sidebar/appearacne/components/counter'
import React from 'react'

export default function Width() {
    return (
        <div className='flex justify-between items-center py-4 border-b border-[#ddd]'>
            <p className='text-[#808080]'>Width</p>

            <EditorCounter />
        </div>
    )
}
