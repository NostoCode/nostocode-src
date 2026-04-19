"use client";
import React from 'react'
import Link from 'next/link';
import { Construction } from 'lucide-react';

export default function Page() {
  return (
    <div className='w-full h-[calc(100vh-3rem)] flex items-center justify-center'>
      <div className="flex flex-col items-center gap-4 text-center">
        <Construction className="w-16 h-16 text-gray-400" />
        <h1 className="text-3xl font-bold">Discuss</h1>
        <p className="text-gray-500 text-lg max-w-md">
          The community discussion board is coming soon. Stay tuned!
        </p>
        <Link href="/problems" className="mt-4 px-6 py-2 rounded-md bg-primary text-primary-foreground font-semibold hover:opacity-90 transition-opacity">
          Back to Problems
        </Link>
      </div>
    </div>
  )
}
