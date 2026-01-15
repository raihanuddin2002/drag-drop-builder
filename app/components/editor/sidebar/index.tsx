import { cn } from '@/lib/utils'
import React, { useState } from 'react'
import { EDITOR } from '@/config/config-layout'
import AppearanceTab from './appearacne'
import ElementsTab from './elements'
import { ScrollArea } from '@/components/ui/scroll-area'

type Props = {
    showSidebar: boolean
    onHideSidebar: () => void
}

export default function EditorSidebar({ showSidebar }: Props) {
    const [selectedTab, setSelectedTab] = useState<'appearance' | 'elements'>('appearance')

    return (
        <aside
            style={{ width: EDITOR.SIDEBAR.width + 'px' }}
            className={cn('absolute top-0 left-[-1000%] h-full bg-white border-r', {
                'left-0 transition-all delay-500 ease-in-out': showSidebar
            })}
        >
            {/* <div className='flex items-center gap-2 pb-5'>
                <div
                    onClick={onHideSidebar}
                    className='w-[32px] h-[32px] border border-black rounded-[50%] flex items-center justify-center cursor-pointer'
                >
                    <i className='fa fa-arrow-circle-left text-[18px]' />
                </div>
                <span className='text-xl'>Exit</span>
            </div>

            <EditorStyleRows /> */}

            <div
                style={{ height: EDITOR.TOOLBAR.height + 'px' }}
                className='grid grid-cols-2 items-end gap-10 px-8 font-[500] text-center border-b'
            >
                <h3
                    onClick={() => setSelectedTab('appearance')}
                    className={cn('pb-1 text-[#808080] cursor-pointer font-poppins', {
                        'text-[#3F795C] border-b-2 border-[#3F795C]': selectedTab === 'appearance'
                    })}
                >
                    Appearance
                </h3>

                <h3
                    onClick={() => setSelectedTab('elements')}
                    className={cn('pb-1 text-[#808080] cursor-pointer font-poppins', {
                        'text-[#3F795C] border-b-2 border-[#3F795C]': selectedTab === 'elements'
                    })}
                >
                    Elements
                </h3>
            </div>


            <ScrollArea style={{ height: `calc(100% - ${EDITOR.TOOLBAR.height}px)` }} className='w-full'>
                {selectedTab === 'appearance' && <AppearanceTab />}
                {selectedTab === 'elements' && <ElementsTab />}
            </ScrollArea>
        </aside>
    )
}
