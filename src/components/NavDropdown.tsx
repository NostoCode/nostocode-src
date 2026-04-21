"use client";
import React from 'react'
import { ModeToggle } from './modeToggle'
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuGroup,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import Link from 'next/link';
import { Settings, FlaskConical, CreditCard, Package, LogOut } from "lucide-react"
import { signOut } from 'next-auth/react';
import { Session } from 'next-auth';
import { useWin98Theme } from '@/context/ThemeContext';

interface NavDropdownPropsType {
    session: Session | null,
    signOut: typeof signOut,
    theme: string | undefined
}

function AvatarImg({ src, username, className }: { src?: string; username?: string; className: string }) {
    const initials = (username || "U").slice(0, 1).toUpperCase();
    if (!src) {
        return (
            <div className={`${className} flex items-center justify-center bg-indigo-500 text-white font-bold`}>
                {initials}
            </div>
        );
    }
    return (
        <img
            src={src}
            alt={username || ""}
            className={`${className} object-cover`}
            onError={(e) => {
                const target = e.currentTarget.parentElement;
                if (target) {
                    target.innerHTML = `<div class="${className} flex items-center justify-center bg-indigo-500 text-white font-bold" style="width:100%;height:100%">${initials}</div>`;
                }
            }}
        />
    );
}

export default function NavDropdown({ session, signOut, theme }: NavDropdownPropsType) {
    const { theme: win98Theme } = useWin98Theme();

    return (
        <div className="flex items-center gap-4">
            <DropdownMenu>
                <DropdownMenuTrigger asChild>
                    <div className="w-9 h-9 overflow-hidden rounded-full bg-amber-200 border-2 cursor-pointer">
                        <AvatarImg src={session?.user.avatar} username={session?.user.username} className="w-full h-full" />
                    </div>
                </DropdownMenuTrigger>
                <DropdownMenuContent className="w-[18rem]" align="center">
                    <DropdownMenuLabel>
                        <Link href={`/dashboard/${session?.user._id}`}>
                            <div className="flex items-center gap-4 my-2">
                                <div className="w-16 h-16 rounded-full overflow-hidden border">
                                    <AvatarImg src={session?.user.avatar} username={session?.user.username} className="w-full h-full" />
                                </div>
                                <div className="w-[70%] relative">
                                    <h2 className="text-2xl font-semibold truncate w-full">{session?.user.username}</h2>
                                    {session?.user.userType === "admin" &&  <img src="/admin text dark.png" className={`w-16 mt-1 mb-2`} alt="" />
                                    }

                                    <p className="w-full text-sm leading-4 text-yellow-300">Access all features with our Premium subscription!</p>
                                </div>
                            </div>
                        </Link>
                    </DropdownMenuLabel>
                    <DropdownMenuSeparator />
                    <DropdownMenuGroup>
                        <DropdownMenuItem className='cursor-not-allowed opacity-50 text-sm'>
                            <FlaskConical className='resize-custom w-5 mr-2' /> Try New Features
                            <span className="ml-auto text-xs text-gray-400">Coming soon</span>
                        </DropdownMenuItem>
                        <DropdownMenuItem className='cursor-not-allowed opacity-50 text-sm'>
                            <CreditCard className='resize-custom w-5 mr-2' /> Billing
                            <span className="ml-auto text-xs text-gray-400">Coming soon</span>
                        </DropdownMenuItem>
                        <DropdownMenuItem className='cursor-not-allowed opacity-50 text-sm'>
                            <Settings className='resize-custom w-5 mr-2' /> Settings
                            <span className="ml-auto text-xs text-gray-400">Coming soon</span>
                        </DropdownMenuItem>
                        <DropdownMenuItem className='cursor-not-allowed opacity-50 text-sm'>
                            <Package className='resize-custom w-5 mr-2' /> Orders
                            <span className="ml-auto text-xs text-gray-400">Coming soon</span>
                        </DropdownMenuItem>
                    </DropdownMenuGroup>
                    <DropdownMenuSeparator />
                    {win98Theme !== 'win98' && (
                        <div className='p-1 flex gap-4 items-center sm:text-base'><ModeToggle /> {theme && theme[0].toUpperCase() + theme?.slice(1)}</div>
                    )}
                    {win98Theme !== 'win98' && <DropdownMenuSeparator />}
                    <DropdownMenuItem onClick={() => signOut()} className='sm:text-base cursor-pointer'>
                        <LogOut className='resize-custom w-5 mr-2' /> Sign out
                    </DropdownMenuItem>
                </DropdownMenuContent>
            </DropdownMenu>
        </div>
    )
}
