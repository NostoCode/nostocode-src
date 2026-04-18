"use client";
import Link from 'next/link'
import React, { useState } from 'react'
import { ListVideo, Shuffle } from 'lucide-react'
import { Session } from 'next-auth';
import axios from 'axios';
import { ApiResponse } from '@/types/ApiResponse';
import { IProblem } from '@/models/Problem';
import { useRouter } from 'next/navigation';

interface NavRunButtonType {
  theme: string | undefined,
  session: Session | null
}

export default function NavRunButtonsContainer({ theme, session }: NavRunButtonType) {
  const [isShuffling, setIsShuffling] = useState(false);
  const router = useRouter();

  const handleShuffle = async () => {
    if (isShuffling) return;
    setIsShuffling(true);
    try {
      const res = await axios.get<ApiResponse>("/api/problem/all-problems");
      const problems: IProblem[] = res.data.allProblems || [];
      if (problems.length > 0) {
        const randomProblem = problems[Math.floor(Math.random() * problems.length)];
        router.push(`/problem/${randomProblem._id}`);
      }
    } catch {
      // silently ignore
    } finally {
      setIsShuffling(false);
    }
  };

  return (
    <div className="w-[80%] px-4 border-l flex justify-between items-center h-full">
      <div className="flex items-center gap-2">
        <Link href="/problems"><ListVideo className={`${theme === "dark" ? 'text-neutral-300' : ''} resize-custom w-5`} /></Link>
        <Link href="/problems" className=''>Problem List</Link>
        <button
          onClick={handleShuffle}
          disabled={isShuffling}
          title="Random Problem"
          className="ml-4 cursor-pointer disabled:opacity-50"
          style={{ background: 'none', border: 'none', padding: 0, boxShadow: 'none' }}
        >
          <Shuffle className={`${theme === "dark" ? 'text-neutral-300' : ''} resize-custom w-4`} />
        </button>
      </div>
    </div>
  )
}
