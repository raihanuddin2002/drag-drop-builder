import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion'
import React from 'react'
import Alignment from './style-rows/alignment'
import Background from './style-rows/background'
import Width from './style-rows/width'
import Padding from './style-rows/padding'
import BorderRadius from './style-rows/border-radius'
import Font from './style-rows/font'

export default function AppearanceTab() {
    return (
        <section className='py-4 px-8 h-full overflow-y-auto'>
            <Accordion className='' type="single" collapsible>
                <AccordionItem className='!border-b-0' value="item-1">
                    <AccordionTrigger
                        type='button'
                        className=' bg-[#f4f4f4] text-[#808080] font-poppins px-5 mx-auto rounded-md hover:no-underline'
                    >
                        General Settings
                    </AccordionTrigger>

                    <AccordionContent className='pt-1'>
                        <Width />
                        <Alignment />
                        <Padding />
                        <Background />
                        <BorderRadius />
                        <Font />
                    </AccordionContent>
                </AccordionItem>
            </Accordion>
        </section>
    )
}
