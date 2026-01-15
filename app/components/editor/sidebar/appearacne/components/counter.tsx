import React from 'react'
import { useState } from 'react'


type Props = {
    onCounterChange?: (value: number) => void
}

export default function EditorCounter({ onCounterChange }: Props) {
    const [inputValue, setInputValue] = useState(0)

    const handleChange = (value: number, type?: 'INC' | 'DEC') => {
        if (type === 'INC') {
            const newValue = value + 1
            setInputValue(newValue)

            if (onCounterChange) {
                onCounterChange(newValue)
            }
        } else if (type === 'DEC') {
            const newValue = value === 0 ? 0 : value - 1
            setInputValue(newValue)

            if (onCounterChange) {
                onCounterChange(newValue)
            }
        } else {
            setInputValue(value)

            if (onCounterChange) {
                onCounterChange(value)
            }
        }
    }

    return (
        <div className='flex items-center bg-white text-[#808080] rounded-[6px] h-[30px] cursor-pointer border'>
            <div
                onClick={() => handleChange(inputValue, 'DEC')}
                className='px-2 h-full rounded-l-[6px] border-r flex items-center'
            >
                -
            </div>

            <div className='w-[25px] h-full bg-[#f4f4f4] border-r flex items-center justify-center'>
                {inputValue}
            </div>

            <button
                onClick={() => handleChange(inputValue, 'INC')}
                className='px-2 h-full rounded-r-[6px] flex items-center'
            >
                +
            </button>
        </div>
    )
}
