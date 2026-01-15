import React from 'react'
import ColorPicker from '../components/color-picker';

export default function Background() {
    return (
        <div className='flex justify-between items-center py-4 border-b border-[#ddd]'>
            <p className='text-[#808080]'>Background color</p>

            <ColorPicker />
        </div>
    )
}
