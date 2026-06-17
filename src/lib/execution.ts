import { connectToDb } from "@/lib/dbConnect";
import problemModel from "@/models/Problem";
import { extractAssertLines, buildDetailedHarness } from "@/lib/buildDetailedHarness";
import type { CodeRunResult } from "@/types/ApiResponse";

export interface PistonRunResult {
  status: { id: number; description: string };
  time?: string | null;
  memory?: number | null;
  stdout?: string | null;
  stderr?: string | null;
  token?: string;
}

export interface PreparedExecution {
  finalCode: string;
  finalTestCases: Array<{ input: string; output: string }>;
  isTemplateMode: boolean;
}

export interface FailedCase {
  index: number;
  input: string;
  expected: string;
  actual: string;
}

interface TemplateProblem {
  promptCode?: string;
  testCode?: string;
  examples?: string;
}

function stripSortedListImport(
  promptCode: string,
  testCode: string,
  sourceCode: string
): string {
  if (!testCode.includes("SortedList") && !sourceCode.includes("SortedList")) {
    return promptCode.replace(/^from sortedcontainers import SortedList\n?/m, "");
  }
  return promptCode;
}

function buildTemplateExecution(
  problem: TemplateProblem,
  sourceCode: string,
  asserts: string[]
): PreparedExecution {
  const cleanPrompt = stripSortedListImport(
    problem.promptCode!,
    problem.testCode!,
    sourceCode
  );
  const allowAnyOrder = problem.testCode!.includes("# ALLOW_ANY_ORDER");
  const allowOuterOrder = problem.testCode!.includes("# ALLOW_OUTER_ORDER");
  return {
    finalCode: buildDetailedHarness(
      cleanPrompt,
      sourceCode,
      asserts,
      allowAnyOrder,
      allowOuterOrder
    ),
    finalTestCases: [{ input: "", output: "" }],
    isTemplateMode: true,
  };
}

function budgetAsserts(allAsserts: string[], budgetBytes: number): string[] {
  let budgetUsed = 2;
  return allAsserts.filter((line) => {
    const cost = JSON.stringify(line).length + 1;
    if (budgetUsed + cost > budgetBytes) return false;
    budgetUsed += cost;
    return true;
  });
}

export async function prepareForRun(
  problemId: string | null | undefined,
  sourceCode: string,
  languageId: number,
  testCases: Array<{ input: string; output: string }> | undefined
): Promise<PreparedExecution> {
  let finalCode = sourceCode;
  let finalTestCases = testCases || [];
  let isTemplateMode = false;

  if (problemId && languageId === 10) {
    await connectToDb();
    const problem = await problemModel
      .findById(problemId)
      .select("promptCode testCode examples")
      .lean<TemplateProblem>();
    if (problem?.promptCode && problem?.testCode) {
      const numExamples =
        (problem.examples?.match(/Example\s+\d+/gi) || []).length || 3;
      const allAsserts = extractAssertLines(problem.testCode);
      const exampleAsserts = allAsserts.slice(0, numExamples);
      const prepared = buildTemplateExecution(problem, sourceCode, exampleAsserts);
      finalCode = prepared.finalCode;
      finalTestCases = prepared.finalTestCases;
      isTemplateMode = prepared.isTemplateMode;
    }
  }

  return { finalCode, finalTestCases, isTemplateMode };
}

export async function prepareForSubmit(
  problemId: string | null | undefined,
  sourceCode: string,
  languageId: number,
  testCases: Array<{ input: string; output: string }> | undefined
): Promise<PreparedExecution> {
  let finalCode = sourceCode;
  let finalTestCases = testCases || [];
  let isTemplateMode = false;

  if (languageId === 10 && problemId) {
    await connectToDb();
    const problem = await problemModel
      .findById(problemId)
      .select("promptCode testCode")
      .lean<TemplateProblem>();
    if (problem?.promptCode && problem?.testCode) {
      const allAsserts = extractAssertLines(problem.testCode);
      const budgetedAsserts = budgetAsserts(allAsserts, 65_000);
      const prepared = buildTemplateExecution(problem, sourceCode, budgetedAsserts);
      finalCode = prepared.finalCode;
      finalTestCases = prepared.finalTestCases;
      isTemplateMode = prepared.isTemplateMode;
    }
  }

  return { finalCode, finalTestCases, isTemplateMode };
}

export function normalizeExecutionResult(
  pistonResults: PistonRunResult[],
  isTemplateMode: boolean
): { normalizedResults: CodeRunResult[]; failedCase: FailedCase | null } {
  if (!isTemplateMode) {
    return { normalizedResults: pistonResults.map((r) => toCodeRunResult(r)), failedCase: null };
  }

  const stdout = pistonResults[0]?.stdout?.trim();
  try {
    const parsed = JSON.parse(stdout || "");
    if (parsed.ok) {
      return {
        normalizedResults: [
          toCodeRunResult(pistonResults[0], "PASS", { description: "Accepted", id: 3 }),
        ],
        failedCase: null,
      };
    }
    return {
      normalizedResults: [
        toCodeRunResult(pistonResults[0], "FAIL", { description: "Wrong Answer", id: 4 }),
      ],
      failedCase: {
        index: parsed.index,
        input: parsed.input,
        expected: parsed.expected,
        actual: parsed.actual,
      },
    };
  } catch {
    return { normalizedResults: pistonResults.map((r) => toCodeRunResult(r)), failedCase: null };
  }
}

function toCodeRunResult(
  result: PistonRunResult,
  stdout?: string,
  status?: { description: string; id: number }
): CodeRunResult {
  return {
    token: result.token ?? "",
    status: status ?? result.status,
    stdout: stdout ?? result.stdout,
    stderr: result.stderr,
    time: result.time,
    memory: result.memory,
  };
}

export function resolveSubmitStatus(
  pistonResults: PistonRunResult[],
  isTemplateMode: boolean
): { status: string; failedCase: FailedCase | null } {
  if (!isTemplateMode) {
    for (const result of pistonResults) {
      if (result.status.description !== "Accepted") {
        return { status: result.status.description, failedCase: null };
      }
    }
    return { status: "Accepted", failedCase: null };
  }

  const stdout = pistonResults[0]?.stdout?.trim();
  try {
    const parsed = JSON.parse(stdout || "");
    if (!parsed.ok) {
      return {
        status: "Wrong Answer",
        failedCase: {
          index: parsed.index,
          input: parsed.input,
          expected: parsed.expected,
          actual: parsed.actual,
        },
      };
    }
    return { status: "Accepted", failedCase: null };
  } catch {
    const pistonStatus = pistonResults[0]?.status?.description;
    if (pistonStatus && pistonStatus !== "Accepted") {
      return { status: pistonStatus, failedCase: null };
    }
    const stderr = pistonResults[0]?.stderr?.trim();
    return { status: stderr ? "Runtime Error" : "Wrong Answer", failedCase: null };
  }
}

export interface SubmissionData {
  userId: string;
  status: string;
  language: string;
  time: number;
  memory: number;
  sourceCode: string;
  ancientCodeScore?: number;
  ancientCodeLevel?: string;
  scoreDetails?: unknown;
  problemId: string;
}

export async function recordSubmission(
  data: SubmissionData,
  pistonResults: PistonRunResult[],
  isTemplateMode: boolean
) {
  const { default: submissionModel } = await import("@/models/Submission");
  const { default: problemModel } = await import("@/models/Problem");
  const { default: userModel } = await import("@/models/User");

  let sumOfTime = 0;
  let sumOfMemory = 0;
  if (isTemplateMode) {
    sumOfTime = parseFloat(pistonResults[0]?.time || "0") || 0;
    sumOfMemory = pistonResults[0]?.memory || 0;
  } else {
    for (const r of pistonResults) {
      sumOfTime += parseFloat(r.time || "0") || 0;
      sumOfMemory += r.memory || 0;
    }
  }

  const newSubmission = await submissionModel.create({
    ...data,
    time: sumOfTime / pistonResults.length,
    memory: sumOfMemory / pistonResults.length,
    ancientCodeScore: data.ancientCodeScore ?? 100,
    ancientCodeLevel: data.ancientCodeLevel ?? "🟢 Ancient Master",
    scoreDetails: data.scoreDetails ?? undefined,
  });

  const problem = await problemModel.findById(data.problemId);
  if (!problem) {
    await submissionModel.findByIdAndDelete(newSubmission._id);
    return { error: "Problem not found", status: 404 };
  }

  const user = await userModel.findById(data.userId);
  if (!user) {
    await submissionModel.findByIdAndDelete(newSubmission._id);
    return { error: "User not found", status: 404 };
  }

  user.submissions.push(newSubmission._id);
  if (data.status === "Accepted") {
    const alreadySolved = (user.solvedQuestions as unknown[]).some(
      (q) => (q as { toString(): string })?.toString() === data.problemId.toString()
    );
    if (!alreadySolved) {
      user.solvedQuestions.push(data.problemId);
      user.solvedProblems = user.solvedProblems + 1;
    }
  }
  await user.save();

  return {
    submission: newSubmission,
    totalTestCases: problem.testCases?.length || 0,
  };
}
