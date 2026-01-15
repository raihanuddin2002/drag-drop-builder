import Image from 'next/image'
import React from 'react'
import { Accordion, AccordionItem, AccordionTrigger, AccordionContent } from '@/components/ui/accordion'
import {
    ButtonBlocksImg,
    CallToActionImg,
    CodeImg,
    DesignMakersImg,
    HeadingImg,
    MenuImg,
    PhotoImg,
    SeperatorImg,
    ShareLinkImg,
    TimerImg,
    TypographyImg,
    VideoImg
} from '@/config/image-paths'

export default function ElementsTab() {
    return (
        <section className='py-4 px-8'>
            <Accordion className='mb-4' type="single" collapsible>
                <AccordionItem className='!border-b-0' value="item-1">
                    <AccordionTrigger
                        type='button'
                        className=' bg-[#f4f4f4] text-[#808080] px-5 mx-auto rounded-md hover:no-underline font-poppins'
                    >
                        Container
                    </AccordionTrigger>

                    <AccordionContent className='pt-3'>
                        <div draggable className='border rounded-xl p-2 mb-3'>
                            <div className='border border-dashed border-[#83C27B] bg-[#E6F7E6] h-[40px]'></div>
                        </div>

                        <div draggable className='flex gap-3 border rounded-xl p-2 mb-3'>
                            <div className='w-full border border-dashed border-[#83C27B] bg-[#E6F7E6] h-[40px]'></div>
                            <div className='w-full border border-dashed border-[#83C27B] bg-[#E6F7E6] h-[40px]'></div>
                        </div>

                        <div draggable className='flex gap-3 border rounded-xl p-2 mb-3'>
                            <div className='w-full border border-dashed border-[#83C27B] bg-[#E6F7E6] h-[40px]'></div>
                            <div className='w-full border border-dashed border-[#83C27B] bg-[#E6F7E6] h-[40px]'></div>
                            <div className='w-full border border-dashed border-[#83C27B] bg-[#E6F7E6] h-[40px]'></div>
                        </div>

                        <div draggable className='flex gap-3 border rounded-xl p-2 mb-3'>
                            <div className='w-full border border-dashed border-[#83C27B] bg-[#E6F7E6] h-[40px]'></div>
                            <div className='w-full border border-dashed border-[#83C27B] bg-[#E6F7E6] h-[40px]'></div>
                            <div className='w-full border border-dashed border-[#83C27B] bg-[#E6F7E6] h-[40px]'></div>
                            <div className='w-full border border-dashed border-[#83C27B] bg-[#E6F7E6] h-[40px]'></div>
                        </div>

                        <div draggable className='flex gap-3 border rounded-xl p-2 mb-3'>
                            <div className='w-2/6 border border-dashed border-[#83C27B] bg-[#E6F7E6] h-[40px]'></div>
                            <div className='w-4/6 border border-dashed border-[#83C27B] bg-[#E6F7E6] h-[40px]'></div>
                        </div>

                        <div draggable className='flex gap-3 border rounded-xl p-2 mb-3'>
                            <div className='w-4/6 border border-dashed border-[#83C27B] bg-[#E6F7E6] h-[40px]'></div>
                            <div className='w-2/6 border border-dashed border-[#83C27B] bg-[#E6F7E6] h-[40px]'></div>
                        </div>
                    </AccordionContent>
                </AccordionItem>
            </Accordion>

            <Accordion className='mb-4' type="single" collapsible>
                <AccordionItem className='!border-b-0' value="item-1">
                    <AccordionTrigger
                        type='button'
                        className=' bg-[#f4f4f4] text-[#808080] font-poppins px-5 mx-auto rounded-md hover:no-underline'
                    >
                        Blocks
                    </AccordionTrigger>

                    <AccordionContent className='pt-5'>
                        {/* <EditorStyleRows /> */}
                        <div className='grid grid-cols-2 gap-5'>
                            <div draggable className='col h-[100px] border rounded-md flex justify-center items-center'>
                                <div className='text-center'>
                                    <Image src={PhotoImg} className='mx-auto mb-1' alt='' />
                                    <p className='text-[#808080] font-[500] text-[16px]'>Image</p>
                                </div>
                            </div>

                            <div draggable className='col h-[100px] border rounded-md flex justify-center items-center'>
                                <div className='text-center'>
                                    <Image src={TypographyImg} className='mx-auto mb-1' alt='' />
                                    <p className='text-[#808080] font-[500] text-[16px]'>Text</p>
                                </div>
                            </div>
                            <div draggable className='col h-[100px] border rounded-md flex justify-center items-center'>
                                <div className='text-center'>
                                    <Image src={ButtonBlocksImg} className='mx-auto mb-1' alt='' />
                                    <p className='text-[#808080] font-[500] text-[16px]'>Button</p>
                                </div>
                            </div>
                            <div draggable className='col h-[100px] border rounded-md flex justify-center items-center'>
                                <div className='text-center'>
                                    <Image src={SeperatorImg} className='mx-auto mb-1' alt='' />
                                    <p className='text-[#808080] font-[500] text-[16px]'>Spacer</p>
                                </div>
                            </div>
                            <div draggable className='col h-[100px] border rounded-md flex justify-center items-center'>
                                <div className='text-center'>
                                    <Image src={VideoImg} className='mx-auto mb-1' alt='' />
                                    <p className='text-[#808080] font-[500] text-[16px]'>Video</p>
                                </div>
                            </div>
                            <div draggable className='col h-[100px] border rounded-md flex justify-center items-center'>
                                <div className='text-center'>
                                    <Image src={ShareLinkImg} className='mx-auto mb-1' alt='' />
                                    <p className='text-[#808080] font-[500] text-[16px]'>Social</p>
                                </div>
                            </div>
                            <div draggable className='col h-[100px] border rounded-md flex justify-center items-center'>
                                <div className='text-center'>
                                    <Image src={HeadingImg} className='mx-auto mb-1' alt='' />
                                    <p className='text-[#808080] font-[500] text-[16px]'>Heading</p>
                                </div>
                            </div>
                            <div draggable className='col h-[100px] border rounded-md flex justify-center items-center'>
                                <div className='text-center'>
                                    <Image src={TimerImg} className='mx-auto mb-1' alt='' />
                                    <p className='text-[#808080] font-[500] text-[16px]'>Timer</p>
                                </div>
                            </div>
                            <div draggable className='col h-[100px] border rounded-md flex justify-center items-center'>
                                <div className='text-center'>
                                    <Image src={MenuImg} className='mx-auto mb-1' alt='' />
                                    <p className='text-[#808080] font-[500] text-[16px]'>Menu</p>
                                </div>
                            </div>
                            <div draggable className='col h-[100px] border rounded-md flex justify-center items-center'>
                                <div className='text-center'>
                                    <Image src={CodeImg} className='mx-auto mb-1' alt='' />
                                    <p className='text-[#808080] font-[500] text-[16px]'>HTML</p>
                                </div>
                            </div>
                        </div>
                    </AccordionContent>
                </AccordionItem>
            </Accordion>

            <Accordion className='mb-5' type="single" collapsible>
                <AccordionItem className='!border-b-0' value="item-1">
                    <AccordionTrigger
                        type='button'
                        className=' bg-[#f4f4f4] text-[#808080] px-5 mx-auto rounded-md hover:no-underline font-poppins'
                    >
                        Modules
                    </AccordionTrigger>

                    <AccordionContent className='pt-3 px-2'>
                        <Image className='w-full mb-3' src={CallToActionImg} alt='' />
                        <Image className='w-full' src={DesignMakersImg} alt='' />
                    </AccordionContent>
                </AccordionItem>
            </Accordion>
        </section>
    )
}
