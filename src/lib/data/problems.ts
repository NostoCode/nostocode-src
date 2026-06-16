import { unstable_cache } from "next/cache";
import { connectToDb } from "@/lib/dbConnect";
import problemModel from "@/models/Problem";
import userModel from "@/models/User";
import { levelWiseProblemSeperate } from "@/helpers/levelWiseProblemSeparate";
import type { IProblem } from "@/models/Problem";
import type { IUser } from "@/models/User";

const LIST_FIELDS = "_id title level topics companies like dislike";

export const getCachedProblems = unstable_cache(
  async () => {
    await connectToDb();
    return problemModel.find().select(LIST_FIELDS).lean();
  },
  ["all-problems-list"],
  {
    revalidate: 30,
    tags: ["problems"],
  }
);

export async function getProblemsListData() {
  const allProblems = (await getCachedProblems()) as unknown as IProblem[];
  const counts = levelWiseProblemSeperate(allProblems);
  return {
    allProblems,
    totalLevelWiseProblem: { easy: counts.e, medium: counts.m, hard: counts.h },
  };
}

export async function getUserProblemsProgress(userId: string) {
  await connectToDb();
  const user = (await userModel
    .findById(userId)
    .populate({ path: "solvedQuestions", select: LIST_FIELDS })
    .lean()) as IUser | null;

  if (!user) return null;

  const solvedQuestions = (user.solvedQuestions || []) as unknown as IProblem[];
  const counts = levelWiseProblemSeperate(solvedQuestions);
  const solvedIds = solvedQuestions.map((q) => String(q._id));

  return {
    user,
    solvedIds,
    userTotalLevelProblem: { easy: counts.e, medium: counts.m, hard: counts.h },
  };
}

export async function getProblemById(problemId: string) {
  await connectToDb();
  return problemModel.findById(problemId).lean() as Promise<IProblem | null>;
}