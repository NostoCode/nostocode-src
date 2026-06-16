"use client";
import React, { useState } from "react";
import Link from "next/link";
import { Session } from "next-auth";
import { ListVideo, Shuffle } from "lucide-react";
import axios from "axios";
import { useRouter } from "next/navigation";
import { ApiResponse } from "@/types/ApiResponse";
import { IProblem } from "@/models/Problem";

export const PROBLEM_RUN_SUBMIT_PORTAL_ID = "problem-run-submit-portal";

export default function NavLinks({
  theme,
  session,
  pathname,
}: {
  theme: string | undefined;
  session: Session | null;
  pathname: string;
}) {
  const [isShuffling, setIsShuffling] = useState(false);
  const router = useRouter();
  const onProblemPage = pathname.startsWith("/problem/");

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

  const linkClass = (path: string) =>
    theme === "dark"
      ? pathname === path
        ? "text-white"
        : "text-neutral-300"
      : pathname === path
        ? ""
        : "text-neutral-400";

  if (onProblemPage) {
    return (
      <div className="w-[80%] px-4 border-l grid grid-cols-3 items-center h-full">
        <div className="flex items-center gap-2">
          <Link href="/problems" className="flex items-center gap-2">
            <ListVideo
              className={`${theme === "dark" ? "text-neutral-300" : ""} resize-custom w-5`}
            />
            Problem List
          </Link>
          <button
            onClick={handleShuffle}
            disabled={isShuffling}
            title="Random Problem"
            className="ml-4 cursor-pointer disabled:opacity-50 nav-shuffle-btn"
            style={{ background: "none", border: "none", padding: 0, boxShadow: "none" }}
          >
            <Shuffle
              className={`${theme === "dark" ? "text-neutral-300" : ""} resize-custom w-4`}
            />
          </button>
        </div>
        <div
          id={PROBLEM_RUN_SUBMIT_PORTAL_ID}
          className="flex justify-center gap-1 min-h-[2rem]"
        />
        <div />
      </div>
    );
  }

  return (
    <div className="flex gap-6 w-[80%] ml-8 items-center">
      <Link href="/problems" className={linkClass("/problems")}>
        Problems
      </Link>
      <Link href="/solution" className={linkClass("/solution")}>
        Discuss
      </Link>
      <Link href="/about" className={linkClass("/about")}>
        Explore
      </Link>
      {session && session.user.userType === "admin" && (
        <Link href="/add-problem" className={linkClass("/add-problem")}>
          Add Problem
        </Link>
      )}
    </div>
  );
}