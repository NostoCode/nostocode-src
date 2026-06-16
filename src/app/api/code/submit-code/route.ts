import { connectToDb } from "@/lib/dbConnect";
import { runCodeBatch } from "@/lib/pistonApiFunction";
import problemModel from "@/models/Problem";
import submissionModel from "@/models/Submission";
import userModel from "@/models/User";
import { codeRunValidation } from "@/schemas/codeRunSchema";
import { codeSubmissionValidation } from "@/schemas/codeSubmissionSchema";
import { prepareForSubmit, resolveSubmitStatus } from "@/lib/execution";
import { getToken } from "next-auth/jwt";
import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });

  if (!token) {
    return NextResponse.json(
      { success: false, message: "Unauthorized" },
      { status: 400 }
    );
  }

  await connectToDb();

  try {
    const body = await req.json();
    const {
      userId,
      language,
      problemId,
      sourceCode,
      languageId,
      testCases,
      ancientCodeScore,
      ancientCodeLevel,
      scoreDetails,
    } = body;

    const parsedData1 = codeSubmissionValidation.safeParse({
      userId,
      language,
      sourceCode,
      problemId,
    });

    if (!parsedData1.success) {
      return NextResponse.json(
        {
          success: false,
          message: parsedData1.error.issues[0].message,
        },
        { status: 400 }
      );
    }

    const parsedData2 = codeRunValidation.safeParse({
      sourceCode,
      languageId,
      testCases,
      problemId,
    });

    if (!parsedData2.success) {
      return NextResponse.json(
        {
          success: false,
          message: parsedData2.error.issues[0].message,
        },
        { status: 400 }
      );
    }

    const { finalCode, finalTestCases, isTemplateMode } = await prepareForSubmit(
      problemId,
      sourceCode,
      languageId,
      testCases
    );

    if (!finalTestCases.length) {
      return NextResponse.json(
        {
          success: false,
          message: "No test cases available for this problem",
        },
        { status: 400 }
      );
    }

    const apiResponse = await runCodeBatch(finalCode, String(languageId), finalTestCases);

    if (!apiResponse.success) {
      return NextResponse.json(
        { success: false, message: apiResponse.result },
        { status: 400 }
      );
    }

    let sumOfTime = 0;
    let sumOfMemory = 0;
    if (isTemplateMode) {
      sumOfTime = parseFloat(apiResponse.result[0]?.time || "0") || 0;
      sumOfMemory = apiResponse.result[0]?.memory || 0;
    } else {
      for (const result of apiResponse.result) {
        sumOfTime += parseFloat(result.time || "0") || 0;
        sumOfMemory += result.memory || 0;
      }
    }

    const { status: currentStatus, failedCase } = resolveSubmitStatus(
      apiResponse.result,
      isTemplateMode
    );

    const newSubmission = await submissionModel.create({
      userId,
      status: currentStatus,
      language,
      time: sumOfTime / apiResponse.result.length,
      memory: sumOfMemory / apiResponse.result.length,
      sourceCode,
      ancientCodeScore: ancientCodeScore ?? 100,
      ancientCodeLevel: ancientCodeLevel ?? "🟢 Ancient Master",
      scoreDetails: scoreDetails ?? undefined,
      problemId,
    });

    const problem = await problemModel.findById(problemId);
    if (!problem) {
      await submissionModel.findByIdAndDelete(newSubmission._id);
      return NextResponse.json(
        { success: false, message: "Problem not found" },
        { status: 404 }
      );
    }

    const user = await userModel.findById(userId);
    if (!user) {
      await submissionModel.findByIdAndDelete(newSubmission._id);
      return NextResponse.json(
        { success: false, message: "User not found" },
        { status: 404 }
      );
    }

    user.submissions.push(newSubmission._id);
    if (currentStatus === "Accepted") {
      const alreadySolved = (user.solvedQuestions as unknown[]).some(
        (q) => (q as { toString(): string })?.toString() === problemId.toString()
      );
      if (!alreadySolved) {
        user.solvedQuestions.push(problemId);
        user.solvedProblems = user.solvedProblems + 1;
      }
    }
    await user.save();

    return NextResponse.json(
      {
        success: true,
        message: "Your code submitted successfully",
        submissionOutput: newSubmission,
        totalTestCases: problem.testCases?.length || 0,
        failedCase,
      },
      { status: 201 }
    );
  } catch {
    return NextResponse.json(
      {
        success: false,
        message: "Something went wrong during code submitting",
      },
      { status: 500 }
    );
  }
}