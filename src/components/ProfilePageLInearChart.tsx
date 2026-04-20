"use client"
import React from 'react'
import { Construction } from "lucide-react"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"

export default function ProfilePageLInearChart() {
  return (
    <Card className='w-full h-full border-none py-4 gap-3'>
      <CardHeader className='pb-2 gap-1'>
        <CardDescription className='font-semibold text-lg'>Contest Rating</CardDescription>
        <CardTitle className='text-2xl font-normal text-gray-400'>—</CardTitle>
      </CardHeader>
      <CardContent className='w-full h-full flex flex-col items-center justify-center gap-2 text-muted-foreground'>
        <Construction className='w-8 h-8' />
        <span className='text-sm'>Coming Soon</span>
      </CardContent>
    </Card>
  )
}
