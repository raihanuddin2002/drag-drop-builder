import React, { useState } from 'react'
import EditorCounter from '../components/counter'
import Switch from '../components/switch'
import { PaddingDefaultImg } from '@/config/image-paths'
import Image from 'next/image'

export default function Padding() {
    const [hideAll, setHideAll] = useState(false)

    return (
        <div className='border-b border-[#ddd] py-4'>
            <div className='flex justify-between items-center mb-5'>
                <p className='text-[#808080]'>Padding</p>
                <Switch onSwitchChange={value => setHideAll(value)} />
            </div>

            {
                !hideAll ? (
                    <div className='flex justify-between items-center'>
                        <p className='text-[#808080]'>All</p>
                        <EditorCounter />
                    </div>
                ) : (
                    <div className='flex gap-10 justify-between items-center'>
                        <div className='col'>
                            <Image src={PaddingDefaultImg} alt='' />
                        </div>

                        <div className="col flex-1">
                            <div className='flex justify-between items-center mb-2'>
                                <p className='text-darkGray'>Top</p>
                                <EditorCounter />
                            </div>
                            <div className='flex justify-between items-center mb-2'>
                                <p className='text-darkGray'>Bottom</p>
                                <EditorCounter />
                            </div>
                            <div className='flex justify-between items-center mb-2'>
                                <p className='text-darkGray'>Left</p>
                                <EditorCounter />
                            </div>
                            <div className='flex justify-between items-center'>
                                <p className='text-darkGray'>Right</p>
                                <EditorCounter />
                            </div>
                        </div>
                    </div>
                )
            }
        </div>
    )
}
