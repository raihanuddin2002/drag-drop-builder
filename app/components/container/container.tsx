import { cn } from '@/lib/utils'
import React from 'react'

type Props = {
    element?: 'div' | 'section'
    children: React.ReactNode
} & React.HTMLAttributes<HTMLDivElement>

export default function Container({ children, className, element = 'div' }: Props) {
    return (
        element === 'div' ? (
            <div className={cn('w-[80%] xl:w-[70%] mx-auto', className)}>
                {children}
            </div>
        ) : (
            <section className={cn('w-[80%] xl:w-[70%] mx-auto', className)}>
                {children}
            </section>
        )
    )
}
