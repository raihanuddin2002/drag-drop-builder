import EditorCounter from '@/components/editor/sidebar/appearacne/components/counter'
import React from 'react'

export default function BorderRadius() {
    return (
        <div className='flex justify-between items-center py-4 border-b border-[#ddd]'>
            <p className='text-[#808080]'>Border radius</p>

            <EditorCounter />
        </div>
    )
}
