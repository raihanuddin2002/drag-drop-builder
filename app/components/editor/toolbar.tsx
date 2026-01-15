import React from 'react'
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select"
import { Label } from '../ui/label'
import { EDITOR } from '@/config/config-layout'

export default function EditorToolbar() {
    return (
        <div
            style={{ height: EDITOR.TOOLBAR.height + 'px' }}
            className='bg-white py-2 text-center flex justify-center items-center gap-4'>
            <div className=' bg-[#f4f4f4] p-[7px] rounded-[10px] flex items-center gap-[5px]'>
                <div className='w-[30px] bg-white rounded-[6px] cursor-pointer'>
                    <i className='fa fa-font text-[12px] text-[#5b5b5b]' />
                </div>
                <div className='w-[30px] bg-white rounded-[6px] cursor-pointer'>
                    <i className='fa fa-bold text-[12px] text-[#5b5b5b]' />
                </div>
                <div className='w-[30px] bg-white rounded-[6px] cursor-pointer'>
                    <i className='fa fa-underline text-[12px] text-[#5b5b5b]' />
                </div>
                <div className='w-[30px] bg-white rounded-[6px] cursor-pointer'>
                    <i className='fa fa-italic text-[12px] text-[#5b5b5b]' />
                </div>
                <div className='w-[30px] bg-white rounded-[6px] cursor-pointer'>
                    <i className='fa fa-strikethrough text-[12px] text-[#5b5b5b]' />
                </div>

                {/* Align */}
                <div className='flex items-center bg-white rounded-[6px] h-[26px] cursor-pointer'>
                    <div className=' px-2 h-full bg-[#5c7275] text-white rounded-[6px]'>
                        <i className='fa fa-align-left text-[12px]' />
                    </div>
                    <span className='text-[#d2d2d2]'>|</span>

                    <div className='px-2 h-full rounded-[6px] text-[#5b5b5b]'>
                        <i className='fa fa-align-center text-[12px] ' />
                    </div>

                    <span className='text-[#d2d2d2]'>|</span>

                    <div className='px-2 h-full rounded-[6px] text-[#5b5b5b]'>
                        <i className='fa fa-align-right text-[12px] ' />
                    </div>
                </div>

                {/* List */}
                <div className='flex items-center bg-white rounded-[6px] h-[26px] cursor-pointer'>
                    <div className='px-2 h-full rounded-[6px] text-[#5b5b5b]'>
                        <i className='fa fa-list-ol text-[12px] ' />
                    </div>
                    <span className='text-[#d2d2d2]'>|</span>
                    <div className='px-2 h-full rounded-[6px] text-[#5b5b5b]'>
                        <i className='fa fa-list-ul text-[12px] ' />
                    </div>
                </div>

                {/* Power of */}
                <div className='flex items-center bg-white rounded-[6px] h-[26px] cursor-pointer'>
                    <div className='px-2 h-full rounded-[6px] text-[#5b5b5b]'>
                        <i className='fa fa-subscript text-[12px] ' />
                    </div>
                    <span className='text-[#d2d2d2]'>|</span>
                    <div className='px-2 h-full rounded-[6px] text-[#5b5b5b]'>
                        <i className='fa fa-superscript text-[12px] ' />
                    </div>
                </div>

                <div className='flex items-center bg-white rounded-[6px] h-[26px] cursor-pointer'>
                    <div className='px-2 h-full rounded-[6px] text-[#5b5b5b]'>
                        <i className='fa fa-link text-[12px] ' />
                    </div>
                    <span className='text-[#d2d2d2]'>|</span>
                    <div className='px-2 h-full rounded-[6px] text-[#5b5b5b]'>
                        <i className='fa fa-unlink text-[12px] ' />
                    </div>
                </div>
            </div>

            <Select>
                <Label className='text-[12px] font-[500] text-[#5c7275] me-[-5px]'>Size</Label>
                <SelectTrigger className="w-[60px] h-[25px] m-0] text-[12px] bg-[#f4f4f4] text-[#5b5b5b] font-[500]">
                    <SelectValue placeholder="6px" />
                </SelectTrigger>
                <SelectContent>
                    {
                        [...Array(105)].map((_, index) => {
                            const value = index + 6
                            return <SelectItem key={index} value={value.toString()}>{value} px</SelectItem>
                        })
                    }
                </SelectContent>
            </Select>
            <Select>
                <Label className='text-[12px] font-[500] text-[#5c7275] me-[-5px]'>LineHeight</Label>
                <SelectTrigger className="w-[60px] h-[25px] m-0] text-[12px] bg-[#f4f4f4] text-[#5b5b5b] font-[500]">
                    <SelectValue placeholder="6px" />
                </SelectTrigger>
                <SelectContent>
                    {
                        [...Array(105)].map((_, index) => {
                            const value = index + 6
                            return <SelectItem key={index} value={value.toString()}>{value} px</SelectItem>
                        })
                    }
                </SelectContent>
            </Select>
        </div >
    )
}
