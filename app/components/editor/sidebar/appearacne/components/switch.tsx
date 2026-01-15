import React, { useState } from 'react'
import { cn } from '@/lib/utils'

type Props = {
    defaultValue?: boolean
    parentClassName?: string
    childClassName?: string
    parentStyle?: React.CSSProperties
    childStyle?: React.CSSProperties
    onSwitchChange?: (value: boolean) => void
}

export default function Switch({ defaultValue, parentClassName, childClassName, parentStyle, childStyle, onSwitchChange }: Props) {
    const [selected, setSelected] = useState(defaultValue || false)

    const handleToogleChange = () => {
        setSelected(!selected)

        if (onSwitchChange) {
            onSwitchChange(!selected)
        }
    }

    return (
        <div
            onClick={handleToogleChange}
            style={parentStyle}
            className={cn(`relative w-[35px] h-[20px] border-2 border-[#808080] rounded-full flex justify-between items-center`, parentClassName, {
                'border-lightGreen': selected
            })}
        >
            <div
                style={childStyle}
                className={cn(`absolute left-[5px] w-[10px] h-[10px] border-2 border-[#808080] rounded-full transition-all`, childClassName, {
                    'left-[calc(100%-15px)] transition-all border-lightGreen': selected
                })}
            />
        </div>
    )
}
