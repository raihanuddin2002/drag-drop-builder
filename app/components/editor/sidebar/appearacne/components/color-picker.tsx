import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import React from 'react'
import { useState } from 'react';
import { HexColorPicker } from 'react-colorful'

type Props = {
    onColorChange?: (color: string) => void
    width?: number
}

export default function ColorPicker({ onColorChange, width }: Props) {
    const [color, setColor] = useState("#000000");
    const [showColorPicker, setShowColorPicker] = useState(false)

    const handleColorChange = (color: string) => {
        setColor(color)

        if (onColorChange) {
            onColorChange(color)
        }
    }

    return (
        <div style={{ width: `${width ?? 130}px` }} className='relative'>
            <Input
                className='shadow-md text-darkGray py-2 ps-3 pe-10 rounded-md'
                placeholder='#000000'
                value={color}
                onChange={(e) => handleColorChange(e.target.value)}
            />

            <Button
                variant='custom'
                size='sm'
                onClick={() => setShowColorPicker(prev => !prev)}
                style={{ background: color ?? '#000000' }}
                className='absolute top-0 right-0 w-[40px] h-full text-[12px] rounded-l-none rounded-r-md p-0'
            />

            {showColorPicker && (
                <div
                    onBlur={() => setShowColorPicker(false)}
                    className='absolute top-[50px] left-[-50px] z-40'
                >
                    <HexColorPicker
                        color={color ?? '#000000'}
                        onChange={(color) => handleColorChange(color)}
                    />
                </div>
            )}
        </div>
    )
}
