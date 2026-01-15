'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import { useAccessToken } from '../token/access-token-provider';
import { axios } from '@/utils/axios';
import { isAxiosError } from 'axios';
import { toast } from 'react-toastify';

export type MyProfile = {
    id: number
    name: string
    email: string
    email_verified_at: string | null
    created_at: string
    updated_at: string
}

type Props = {
    children: React.ReactNode
}


export const MyProifleContext = createContext<MyProfile | null>(null);

export default function MyProfileProvider({ children }: Props) {
    const access_token = useAccessToken()
    const [myProfile, setMyProfile] = useState<MyProfile | null>(null)

    useEffect(() => {
        async function Load() {
            try {
                const res = await axios.get<{ message: string; result: MyProfile }>('/me', {
                    headers: {
                        Authorization: `Bearer ${access_token}`
                    }
                })

                setMyProfile(res.data.result)
            } catch (error) {
                if (isAxiosError(error)) {
                    toast.error(error.response?.data)
                }
            }
        }

        Load()
    }, [access_token])

    return (
        <MyProifleContext.Provider value={myProfile}>
            {children}
        </MyProifleContext.Provider>
    )
}

export function useMyProfile() {
    const myProfile = useContext(MyProifleContext)
    return myProfile
}