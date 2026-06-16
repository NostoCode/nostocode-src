import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/authOptions";
import { mongodbObjectId } from "@/schemas/similarQuestionSchema";
import { getProblemById, getUserProblemsProgress } from "@/lib/data/problems";
import { serializeForClient } from "@/lib/serialize";
import ProblemPageClient from "./ProblemPageClient";
import type { IProblem } from "@/models/Problem";

interface PageProps {
  params: Promise<{ problemId: string }>;
}

export default async function Page({ params }: PageProps) {
  const { problemId } = await params;
  const parsed = mongodbObjectId.safeParse(problemId);
  let initialProblem: IProblem | null = null;

  if (parsed.success) {
    const raw = await getProblemById(problemId);
    initialProblem = raw ? (serializeForClient(raw) as IProblem) : null;
  }

  const session = await getServerSession(authOptions);
  let isSolved = false;
  if (session?.user?._id && initialProblem) {
    const progress = await getUserProblemsProgress(session.user._id);
    if (progress) {
      isSolved = progress.solvedIds.includes(problemId);
    }
  }

  return (
    <ProblemPageClient
      problemId={problemId}
      initialProblem={initialProblem}
      isSolved={isSolved}
    />
  );
}