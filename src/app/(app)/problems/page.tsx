import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/authOptions";
import {
  getProblemsListData,
  getUserProblemsProgress,
} from "@/lib/data/problems";
import { serializeForClient } from "@/lib/serialize";
import ProblemsListClient from "./ProblemsListClient";

export default async function Page() {
  const { allProblems, totalLevelWiseProblem } = await getProblemsListData();
  const session = await getServerSession(authOptions);

  let userTotalLevelProblem = { easy: 0, medium: 0, hard: 0 };
  let solvedIds: string[] = [];
  let solvedCount = 0;

  if (session?.user?._id) {
    const progress = await getUserProblemsProgress(session.user._id);
    if (progress) {
      userTotalLevelProblem = progress.userTotalLevelProblem;
      solvedIds = progress.solvedIds;
      solvedCount = new Set(solvedIds).size;
    }
  }

  return (
    <ProblemsListClient
      allProblems={serializeForClient(allProblems)}
      totalLevelWiseProblem={totalLevelWiseProblem}
      userTotalLevelProblem={userTotalLevelProblem}
      solvedIds={solvedIds}
      solvedCount={solvedCount}
    />
  );
}