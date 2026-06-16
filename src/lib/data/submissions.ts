import { connectToDb } from "@/lib/dbConnect";
import { serializeForClient } from "@/lib/serialize";
import submissionModel from "@/models/Submission";
import "@/models/Problem";
import type { codeSubmissionResultType } from "@/types/ApiResponse";

export async function getUserAllSubmissions(
  userId: string
): Promise<codeSubmissionResultType[]> {
  await connectToDb();
  const submissions = await submissionModel
    .find({ userId })
    .populate({ path: "problemId", select: "title" })
    .sort({ createdAt: -1 })
    .lean();
  return serializeForClient(submissions) as unknown as codeSubmissionResultType[];
}