"use client";

import CustomRadialChart from "@/components/CustomRadialChart";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  ArrowDownUp,
  Barcode,
  Check,
  ExternalLink,
  Funnel,
  GitFork,
  GraduationCap,
  LibraryBig,
  Play,
  Plus,
  RotateCcw,
  Search,
  Shuffle,
  Star,
} from "lucide-react";
import Link from "next/link";
import Image from "next/image";
import React, { useCallback, useState } from "react";
import { useAppTheme } from "@/context/ThemeContext";
import { useRouter } from "next/navigation";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { IProblem } from "@/models/Problem";
import { toast } from "sonner";
import { Skeleton } from "@/components/ui/skeleton";
import type { LevelWiseProblemType } from "@/types/problems";

interface ProblemsListClientProps {
  allProblems: IProblem[];
  totalLevelWiseProblem: LevelWiseProblemType;
  userTotalLevelProblem: LevelWiseProblemType;
  solvedIds: string[];
  solvedCount: number;
}

export default function ProblemsListClient({
  allProblems,
  totalLevelWiseProblem,
  userTotalLevelProblem,
  solvedIds,
  solvedCount,
}: ProblemsListClientProps) {
  const { isWin98 } = useAppTheme();
  const [isShuffling, setIsShuffling] = useState(false);
  const [favorites, setFavorites] = useState<Set<string>>(() => {
    if (typeof window === "undefined") return new Set();
    try {
      const raw = localStorage.getItem("nostocode-favorites");
      return new Set(raw ? (JSON.parse(raw) as string[]) : []);
    } catch {
      return new Set();
    }
  });
  const router = useRouter();
  const [filteredProblems, setFilteredProblems] = useState<IProblem[]>(allProblems);
  const [searchQuery, setSearchQuery] = useState("");
  const [filter, setFilter] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [showFavoritesOnly, setShowFavoritesOnly] = useState(false);

  const problemColors = {
    Easy: "text-green-500",
    Medium: "text-yellow-400",
    Hard: "text-red-500",
  };

  type problemColorsType = keyof typeof problemColors;

  const solvedSet = new Set(solvedIds);

  const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setSearchQuery(value);
    setCurrentPage(1);

    if (!value) {
      setFilteredProblems(allProblems);
      return;
    }

    const filtered = allProblems.filter((problem) =>
      problem.title.toLowerCase().includes(value.toLowerCase())
    );
    setFilteredProblems(filtered);
  };

  const handleFilterBtn = (level: string) => {
    const temp = filter === level ? "" : level;
    setFilter(temp);
    setCurrentPage(1);

    if (!temp) {
      setFilteredProblems(allProblems);
    } else {
      const filtered = allProblems.filter((problem) => problem.level === temp);
      setFilteredProblems(filtered);
    }
  };

  const handleReverseArray = () => {
    setFilteredProblems([...filteredProblems].reverse());
    setCurrentPage(1);
  };

  const displayProblems = showFavoritesOnly
    ? filteredProblems.filter((p) => favorites.has(String(p._id)))
    : filteredProblems;

  const totalPages = Math.ceil(displayProblems.length / pageSize);
  const pagedProblems = displayProblems.slice(
    (currentPage - 1) * pageSize,
    currentPage * pageSize
  );

  const persistFavorites = useCallback((next: Set<string>) => {
    setFavorites(next);
    localStorage.setItem("nostocode-favorites", JSON.stringify([...next]));
  }, []);

  const toggleFavorite = (problemId: string, e?: React.MouseEvent) => {
    e?.preventDefault();
    e?.stopPropagation();
    const next = new Set(favorites);
    if (next.has(problemId)) {
      next.delete(problemId);
      toast.info("Removed from favorites");
    } else {
      next.add(problemId);
      toast.success("Added to favorites");
    }
    persistFavorites(next);
  };

  const handleRefresh = () => {
    setSearchQuery("");
    setFilter("");
    setCurrentPage(1);
    setFilteredProblems(allProblems);
    toast.success("List refreshed");
  };

  const handleShuffle = async () => {
    if (isShuffling) return;
    const pool = allProblems.length > 0 ? allProblems : filteredProblems;
    if (pool.length === 0) return;
    setIsShuffling(true);
    const randomProblem = pool[Math.floor(Math.random() * pool.length)];
    router.push(`/problem/${randomProblem._id}`);
    setIsShuffling(false);
  };

  return (
    <div className="w-full h-[calc(100vh-3rem)] flex problems-outer-container">
      <div className="w-[15%] h-full py-6 px-4 border-r-4">
        <div
          className="w-full p-2 rounded mb-3 flex items-center gap-4 opacity-50 cursor-not-allowed"
          title="Coming soon"
        >
          <LibraryBig className="resize-custom w-6" /> Library
        </div>
        <div
          className="w-full p-2 rounded mb-3 flex items-center gap-4 opacity-50 cursor-not-allowed"
          title="Coming soon"
        >
          <GraduationCap className="resize-custom w-6" /> Study Plan
        </div>
        <div className="w-full border-2 mb-4 mt-8"></div>
        <div
          className="w-full p-2 rounded mb-3 flex items-center justify-between opacity-50 cursor-not-allowed text-gray-500"
          title="Coming soon"
        >
          My List <Plus className="resize-custom w-6 text-gray-500" />
        </div>
        <div
          className={`w-full p-2 rounded mb-3 flex items-center gap-4 cursor-pointer ${showFavoritesOnly ? "bg-[var(--sidebar-accent)]" : ""}`}
          onClick={() => {
            setShowFavoritesOnly((v) => !v);
            setCurrentPage(1);
            toast.info(showFavoritesOnly ? "Showing all problems" : "Showing favorites only");
          }}
        >
          <Star className={`resize-custom w-5 ${showFavoritesOnly ? "text-yellow-500 fill-yellow-500" : ""}`} /> Favorite
        </div>
      </div>
      <div className="w-[35%] h-full py-4 px-12">
        <div className="w-full h-full bg-[var(--sidebar-accent)] rounded-md p-6 flex flex-col gap-2">
          <Image src="/problem page logo.png" alt="" width={88} height={88} className="w-22 rounded-md" />
          <h2 className="text-2xl font-semibold">All Problems</h2>
          <p className="text-gray-500 text-sm mb-2">
            NostoCode — {allProblems.length} problems · {solvedCount} solved
          </p>
          <div className="flex items-center gap-3 mb-2">
            <Button
              onClick={handleShuffle}
              disabled={isShuffling}
              className="rounded-full font-semibold w-32 text-base flex items-center h-10 cursor-pointer"
            >
              <Play className="resize-custom w-5" /> Practice
            </Button>
            <Button
              onClick={() => {
                setShowFavoritesOnly((v) => !v);
                setCurrentPage(1);
              }}
              variant="outline"
              className="rounded-full w-10 h-10 cursor-pointer"
              title="Show favorites only"
            >
              <Star
                className={`resize-custom w-5 ${showFavoritesOnly ? "text-yellow-500 fill-yellow-500" : "text-gray-400"}`}
              />
            </Button>
            <Button
              onClick={() => {
                navigator.clipboard.writeText(window.location.href);
                toast.success("Link copied!");
              }}
              variant="outline"
              className="rounded-full w-10 h-10 cursor-pointer"
            >
              <ExternalLink className="resize-custom w-5 text-gray-400" />
            </Button>
            <Button
              onClick={() => toast.info("Fork coming soon")}
              variant="outline"
              className="rounded-full w-10 h-10 cursor-pointer"
            >
              <GitFork className="text-gray-400" />
            </Button>
          </div>
          <p className="text-gray-500 text-sm border-b-2 pb-4">Updated 15 days ago</p>
          <div className="w-full flex items-center justify-between">
            <h2 className="font-semibold mb-4">Progress</h2>
            <button
              type="button"
              onClick={handleRefresh}
              className="cursor-pointer"
              title="Refresh list"
            >
              <RotateCcw className="resize-custom w-5 text-gray-400" />
            </button>
          </div>
          <div className="w-full h-60 flex gap-2">
            <div className="w-[70%] h-full bg-[var(--popover)] rounded-md overflow-hidden">
              <CustomRadialChart
                totalLevelWiseProblem={totalLevelWiseProblem}
                userTotalLevelProblem={userTotalLevelProblem}
              />
            </div>
            <div className="w-[30%] h-full flex flex-col gap-2">
              <div className="w-full h-[33.3%] bg-[var(--popover)] rounded-md flex justify-center items-center flex-col font-semibold">
                <h3 className="text-green-500">Easy</h3>
                <h3>
                  {userTotalLevelProblem.easy}/{totalLevelWiseProblem.easy}
                </h3>
              </div>
              <div className="w-full h-[33.3%] bg-[var(--popover)] rounded-md flex justify-center items-center flex-col font-semibold">
                <h3 className="text-yellow-500">Med.</h3>
                <h3>
                  {userTotalLevelProblem.medium}/{totalLevelWiseProblem.medium}
                </h3>
              </div>
              <div className="w-full h-[33.3%] bg-[var(--popover)] rounded-md flex justify-center items-center flex-col font-semibold">
                <h3 className="text-red-500">Hard</h3>
                <h3>
                  {userTotalLevelProblem.hard}/{totalLevelWiseProblem.hard}
                </h3>
              </div>
            </div>
          </div>
        </div>
      </div>
      <div className="w-1/2 h-full flex flex-col">
        <div className="w-full h-18 py-2 flex justify-between items-center pl-4 pr-8 shrink-0">
          <div className="flex items-center gap-4">
            <div className="w-[20rem] rounded-full overflow-hidden flex gap-1 items-center px-4 bg-input">
              <Search className="resize-custom w-5 text-gray-400" />
              <Input
                onChange={handleSearch}
                placeholder="Search questions"
                className="customTransparent border-none outline-none focus-visible:ring-[0px]"
                value={searchQuery}
              />
            </div>
            <Button
              onClick={handleReverseArray}
              variant="outline"
              className="rounded-full w-9 h-9 cursor-pointer"
            >
              <ArrowDownUp className="resize-custom w-4 text-gray-400" />
            </Button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" className="rounded-full w-9 h-9 cursor-pointer">
                  <Funnel className="resize-custom w-4 text-gray-400" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent>
                <DropdownMenuItem onClick={() => handleFilterBtn("Easy")} className="justify-between">
                  Easy {filter === "Easy" && <Check className="text-orange-300" />}
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => handleFilterBtn("Medium")}
                  className="justify-between"
                >
                  Medium {filter === "Medium" && <Check className="text-orange-300" />}
                </DropdownMenuItem>
                <DropdownMenuItem className="justify-between" onClick={() => handleFilterBtn("Hard")}>
                  Hard {filter === "Hard" && <Check className="text-orange-300" />}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
          <button
            onClick={handleShuffle}
            disabled={isShuffling}
            title="Random Problem"
            className="cursor-pointer disabled:opacity-50"
            style={{ background: "none", border: "none", padding: 0, boxShadow: "none" }}
          >
            <Shuffle className="resize-custom w-5 text-gray-400" />
          </button>
        </div>
        <div className="flex-1 min-h-0">
          <ScrollArea className="w-full h-full px-4 pb-4">
            {allProblems.length === 0 && (
              <div className="w-full">
                <Skeleton className="w-full h-12 flex items-center gap-2 px-4 rounded-md mb-2"></Skeleton>
                <Skeleton className="w-full h-12 flex items-center gap-2 px-4 rounded-md mb-2"></Skeleton>
              </div>
            )}
            {pagedProblems.length > 0 &&
              pagedProblems.map((problem, index) => {
                const pid = String(problem._id);
                const isFav = favorites.has(pid);
                return (
                  <Link key={pid ?? index} href={`/problem/${problem._id}`}>
                    <div
                      className={`w-full h-12 flex items-center gap-2 px-4 rounded-md ${index % 2 === 0 ? "bg-[var(--sidebar-accent)]" : ""} ${isWin98 ? "border-b border-[var(--win98-dark)]" : ""}`}
                    >
                      <h2 className="w-[5%] flex justify-center">
                        {solvedSet.has(pid) && (
                          <Check className="resize-custom w-5 text-orange-400" />
                        )}
                      </h2>
                      <h2 className="w-[65%] font-semibold truncate">{problem.title}</h2>
                      <h2
                        className={`w-[12%] text-sm whitespace-nowrap ${problemColors[problem.level as problemColorsType]}`}
                      >
                        {problem.level}
                      </h2>
                      <button
                        type="button"
                        className="w-[8%] flex justify-center cursor-pointer"
                        onClick={(e) => toggleFavorite(pid, e)}
                        title={isFav ? "Remove from favorites" : "Add to favorites"}
                      >
                        <Star
                          className={`resize-custom w-4 ${isFav ? "text-yellow-500 fill-yellow-500" : "text-gray-500"}`}
                        />
                      </button>
                      <h2 className="flex w-[10%] justify-end">
                        <Barcode className="resize-custom w-4 text-gray-500" />
                      </h2>
                    </div>
                  </Link>
                );
              })}
          </ScrollArea>
        </div>
        <div className="flex items-center justify-center gap-3 py-2 border-t shrink-0">
          <button
            onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
            disabled={currentPage === 1}
            className="px-3 py-1 text-sm disabled:opacity-40 cursor-pointer"
          >
            ← Prev
          </button>
          <span className="text-sm">
            Page {currentPage} / {totalPages || 1}
            <span className="text-gray-500 ml-2">({displayProblems.length} problems)</span>
          </span>
          <button
            onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
            disabled={currentPage === totalPages || totalPages === 0}
            className="px-3 py-1 text-sm disabled:opacity-40 cursor-pointer"
          >
            Next →
          </button>
          <select
            value={pageSize}
            onChange={(e) => {
              setPageSize(Number(e.target.value));
              setCurrentPage(1);
            }}
            className="ml-4 text-sm border rounded px-2 py-1 bg-[var(--sidebar-accent)] cursor-pointer"
            title="Problems per page"
          >
            <option value={10}>10 / page</option>
            <option value={20}>20 / page</option>
            <option value={50}>50 / page</option>
          </select>
        </div>
      </div>
    </div>
  );
}