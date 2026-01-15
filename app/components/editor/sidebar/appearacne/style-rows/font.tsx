import { Select, SelectContent, SelectTrigger, SelectValue } from '@/components/ui/select'
import { SelectItem } from '@radix-ui/react-select'
import React from 'react'

export default function Font() {
    return (
        <div className='flex justify-between items-center py-4 border-b border-[#ddd]'>
            <p className='text-[#808080] text-sm'>Font</p>

            <Select>
                <SelectTrigger className="w-[100px] h-[25px] m-0 text-[12px] bg-[#f4f4f4] text-[#5b5b5b] font-[500]">
                    <SelectValue placeholder="Poppins" />
                </SelectTrigger>
                <SelectContent>
                    {
                        [...Array(105)].map((_, index) => {
                            return (
                                <SelectItem key={index} value='Poppins'
                                    className='text-center text-[14px] cursor-pointer border-b py-2'
                                >
                                    Poppins
                                </SelectItem>
                            )
                        })
                    }
                </SelectContent>
            </Select>
        </div>
    )
}
