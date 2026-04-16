"use client";
import { Compass, Search } from 'lucide-react'
import React from 'react'
import { Input } from './ui/input'

export default function DiscussPageSideBox() {
    return (
        <div className="w-[20%] h-full flex flex-col items-center px-4 py-8">
            <div className="w-full rounded-full overflow-hidden flex gap-1 items-center px-4 bg-input">
                <Search className='resize-custom w-5 text-gray-400' />
                <Input placeholder='Search' className='customTransparent border-none outline-none focus-visible:ring-[0px]' />
            </div>
            <div className="w-full h-[32rem] border-2 rounded-md mt-4 p-3">
                <div className="flex items-center gap-2 pb-4">
                    <Compass className='resize-custom w-5' />
                    <h3 className="text-lg">Explore</h3>
                </div>
                <p className="text-gray-500 py-3">#Python</p>
                <h2 className="line-clamp-2">How I solved Two Sum in O(n) using a hashmap — explained step by step</h2>
                <p className="text-gray-500 py-3">#Algorithms</p>
                <h2 className="line-clamp-2">Understanding Dynamic Programming: from Fibonacci to Knapsack</h2>
                <p className="text-gray-500 py-3">#Interview</p>
                <h2 className="line-clamp-2">Top 10 patterns to recognise in coding interviews</h2>
                <p className="text-gray-500 py-3">#AncientMode</p>
                <h2 className="line-clamp-2">Ancient Coding Mode tips: how to train without autocomplete</h2>
                <p className="text-blue-600 cursor-pointer pt-6">Show More</p>
            </div>
        </div>
    )
}
