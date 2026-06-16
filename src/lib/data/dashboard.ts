import { connectToDb } from "@/lib/dbConnect";
import { serializeForClient } from "@/lib/serialize";
import userModel from "@/models/User";
import submissionModel from "@/models/Submission";
import { getProblemsListData } from "@/lib/data/problems";
import { levelWiseProblemSeperate } from "@/helpers/levelWiseProblemSeparate";
import { languageWiseSubmissionSeperate } from "@/helpers/languageWiseSubmissionSeparate";
import type { IProblem } from "@/models/Problem";
import type { IUser } from "@/models/User";
import type { codeSubmissionResultType } from "@/types/ApiResponse";
import type { LevelWiseProblemType } from "@/types/problems";

const LIST_FIELDS = "_id title level topics companies like dislike";

export interface FilteredLanguageType {
  c: number;
  cpp: number;
  js: number;
  java: number;
  py: number;
}

export interface DashboardData {
  user: IUser | null;
  levelWiseSolvedQuestions: LevelWiseProblemType;
  allQuestionsLevelWise: LevelWiseProblemType;
  allSubmissions: codeSubmissionResultType[];
  filterLanguageWiseSubmission: FilteredLanguageType;
}

export async function getDashboardData(userId: string): Promise<DashboardData> {
  await connectToDb();

  const [user, { totalLevelWiseProblem }, submissions] = await Promise.all([
    userModel
      .findById(userId)
      .populate({ path: "solvedQuestions", select: LIST_FIELDS })
      .lean(),
    getProblemsListData(),
    submissionModel.find({ userId }).sort({ createdAt: -1 }).lean(),
  ]);

  const typedUser = user as IUser | null;
  const solvedQuestions = (typedUser?.solvedQuestions || []) as unknown as IProblem[];
  const solvedCounts = levelWiseProblemSeperate(solvedQuestions);
  const submissionList = submissions as unknown as codeSubmissionResultType[];
  const langCounts = languageWiseSubmissionSeperate(submissionList);

  return serializeForClient({
    user: typedUser,
    levelWiseSolvedQuestions: {
      easy: solvedCounts.e,
      medium: solvedCounts.m,
      hard: solvedCounts.h,
    },
    allQuestionsLevelWise: totalLevelWiseProblem,
    allSubmissions: submissionList,
    filterLanguageWiseSubmission: {
      c: langCounts.c,
      cpp: langCounts.cpp,
      js: langCounts.js,
      py: langCounts.py,
      java: langCounts.java,
    },
  });
}