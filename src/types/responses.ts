import type { IProblem } from "@/models/Problem";
import type { ISolution } from "@/models/Solution";
import type { IUser } from "@/models/User";
import type mongoose from "mongoose";

export interface CodeRunResult {
  token: string;
  status: {
    id: number;
    description: string;
  };
  stdout?: string | null;
  stderr?: string | null;
  compile_output?: string | null;
  message?: string | null;
  time?: string | null;
  memory?: number | null;
}

export interface FailedCase {
  index: number;
  input: string;
  expected: string;
  actual: string;
}

export interface ScoreDetails {
  typingRatio: number;
  rhythmScore: number;
  editActivity: number;
  largeInserts: number;
  speedScore: number;
  burstScore: number;
  sessionSecs: number;
}

export interface codeSubmissionResultType {
  _id?: string | mongoose.Types.ObjectId;
  userId: string | mongoose.Types.ObjectId;
  status: string;
  language: string;
  time: number;
  memory: number;
  sourceCode: string;
  problemId: string | mongoose.Types.ObjectId | IProblem;
  ancientCodeScore?: number;
  ancientCodeLevel?: string;
  scoreDetails?: ScoreDetails;
  createdAt?: Date;
  udpatedAt?: Date;
}

export interface RunCodeResponse {
  success: boolean;
  message: string;
  results?: CodeRunResult[];
  failedCase?: FailedCase | null;
}

export interface SubmitCodeResponse {
  success: boolean;
  message: string;
  submissionOutput?: codeSubmissionResultType;
  totalTestCases?: number;
  failedCase?: FailedCase | null;
}

export interface ProblemsListResponse {
  success: boolean;
  message: string;
  allProblems?: IProblem[];
  total?: number;
  page?: number;
  limit?: number;
  totalPages?: number;
}

export interface UserProfileResponse {
  success: boolean;
  message: string;
  user?: IUser;
}

export interface ProblemDetailResponse {
  success: boolean;
  message: string;
  problem?: IProblem;
}

export interface SolutionsResponse {
  success: boolean;
  message: string;
  solutions?: Array<mongoose.Types.ObjectId> | ISolution[];
}