import { IProblem } from "@/models/Problem";
import { ISolution } from "@/models/Solution";
import { ISubmission } from "@/models/Submission";
import { IUser } from "@/models/User";
import mongoose from "mongoose";

export type {
  CodeRunResult,
  codeSubmissionResultType,
  FailedCase,
  ScoreDetails,
  RunCodeResponse,
  SubmitCodeResponse,
  ProblemsListResponse,
  UserProfileResponse,
  ProblemDetailResponse,
  SolutionsResponse,
} from "./responses";
import type { CodeRunResult, codeSubmissionResultType, FailedCase } from "./responses";

export interface ApiResponse {
    success: boolean,
    message: string,
    user?: IUser,
    userId?: string | mongoose.Types.ObjectId,
    solutions?: Array<mongoose.Types.ObjectId> | ISolution[],
    submissions?: Array<mongoose.Types.ObjectId> | codeSubmissionResultType[],
    solvedQuestions?: Array<mongoose.Types.ObjectId>,
    submissionOutput?: codeSubmissionResultType,
    problemId?: string | mongoose.Types.ObjectId,
    problem?: IProblem,
    solution?: ISolution,
    allProblems?: IProblem[],
    results?: CodeRunResult[],
    output?: string,
    submissionDetails?: ISubmission,
    total?: number,
    page?: number,
    limit?: number,
    totalPages?: number,
    totalTestCases?: number,
    failedCase?: FailedCase | null,
}