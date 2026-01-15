import { cn } from '@/lib/utils'
import { cva, type VariantProps } from 'class-variance-authority'
import React from 'react'

const spinnerVariants = cva(
    'rounded-full shadow-thumbnailLoader animate-thumbnailLoader',
    {
        variants: {
            variant: {
                default: 'text-[#3f795c]',
                success: "text-green-500",
                danger: "border-red-500",
                primary: "border-blue-500",
            },
            size: {
                default: "w-2 h-2",
                xs: "w-1 h-1",
                sm: "w-1.5 h-1.5",
                lg: "w-3 h-3"
            },
        },
        defaultVariants: {
            variant: "default",
            size: "default",
        },
    }
)

interface Props extends React.HTMLAttributes<HTMLDivElement>, VariantProps<typeof spinnerVariants> {
    asChild?: boolean
}

export default function Spinner({ variant, size, className, ...props }: Props) {
    let dSize = 18

    if (size === 'xs') {
        dSize = 14
    } else if (size === 'sm')
        dSize = 16
    else if (size === 'lg') {
        dSize = 22
    }

    return (
        <div
            style={{ "--d": dSize + 'px' } as React.CSSProperties}
            className={cn(spinnerVariants({ variant, size, className }))}
            {...props}
        ></div>
    )
}
