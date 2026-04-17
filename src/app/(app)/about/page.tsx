import React from 'react'

export default function Page() {
  return (
    <div className='w-full h-[calc(100vh-3rem)] py-10 px-20'>
      <h3 className="text-2xl text-gray-500 font-semibold">Welcome</h3>
      <h1 className='text-4xl my-4'>NostoCode Explore</h1>
      <p className="my-4 text-lg w-[80%] dark:text-gray-400">
        NostoCode is an open platform for practicing coding problems and sharpening your algorithmic thinking.
        Explore our curated problem set, track your progress, and compete with others.
      </p>
      <div className="grid grid-cols-1 gap-6 mt-8 w-[80%]">
        <div className="border rounded-lg p-6">
          <h2 className="text-xl font-semibold mb-2">📚 Problem Library</h2>
          <p className="text-gray-500 dark:text-gray-400">200+ LeetCode-style problems across Easy, Medium, and Hard difficulties. All solvable in Python.</p>
        </div>
        <div className="border rounded-lg p-6">
          <h2 className="text-xl font-semibold mb-2">🧠 Ancient Coding Mode</h2>
          <p className="text-gray-500 dark:text-gray-400">Our unique anti-cheat system. Disable AI assistance, browser tools and prove your skills the old-fashioned way.</p>
        </div>

      </div>
    </div>
  )
}
