import React from 'react'

export default function Alignment() {
    return (
        <div className='flex justify-between items-center py-4 border-b border-[#ddd]'>
            <p className='text-[#808080] text-sm'>Text alignment</p>

            <div className='flex items-center bg-white rounded-[6px] h-[30px] cursor-pointer border'>
                <div className=' px-2 h-full bg-[#f4f4f4] text-[#808080] rounded-l-[6px] border-r flex items-center'>
                    <i className='fa fa-align-left text-[12px]' />
                </div>
                {/* <span className='text-[#d2d2d2]'>|</span> */}

                <div className='px-2 h-full text-[#808080] border-r flex items-center'>
                    <i className='fa fa-align-center text-[12px]' />
                </div>

                <div className='px-2 h-full rounded-r-[6px] text-[#808080] flex items-center'>
                    <i className='fa fa-align-right text-[12px] ' />
                </div>
            </div>
        </div>
    )
}
