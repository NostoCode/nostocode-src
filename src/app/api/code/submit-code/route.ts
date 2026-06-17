import { connectToDb } from "@/lib/dbConnect";
import { runCodeBatch } from "@/lib/pistonApiFunction";
import { codeRunValidation } from "@/schemas/codeRunSchema";
import { codeSubmissionValidation } from "@/schemas/codeSubmissionSchema";
import { prepareForSubmit, resolveSubmitStatus, recordSubmission } from "@/lib/execution";
import { getToken } from "next-auth/jwt";
import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
  if (!token) {
    return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 400 });
  }

  await connectToDb();

  try {
    const body = await req.json();
    const { userId, language, problemId, sourceCode, languageId, testCases, ancientCodeScore, ancientCodeLevel, scoreDetails } = body;

    const v1 = codeSubmissionValidation.safeParse({ userId, language, sourceCode, problemId });
    if (!v1.success) {
      return NextResponse.json({ success: false, message: v1.error.issues[0].message }, { status: 400 });
    }

    const v2 = codeRunValidation.safeParse({ sourceCode, languageId, testCases, problemId });
    if (!v2.success) {
      return NextResponse.json({ success: false, message: v2.error.issues[0].message }, { status: 400 });
    }

    const { finalCode, finalTestCases, isTemplateMode } = await prepareForSubmit(problemId, sourceCode, languageId, testCases);
    if (!finalTestCases.length) {
      return NextResponse.json({ success: false, message: "No test cases available for this problem" }, { status: 400 });
    }

    const apiResponse = await runCodeBatch(finalCode, String(languageId), finalTestCases);
    if (!apiResponse.success) {
      return NextResponse.json({ success: false, message: apiResponse.result }, { status: 400 });
    }

    const { status: currentStatus, failedCase } = resolveSubmitStatus(apiResponse.result, isTemplateMode);

    const result = await recordSubmission(
      { userId, status: currentStatus, language, time: 0, memory: 0, sourceCode, ancientCodeScore, ancientCodeLevel, scoreDetails, problemId },
      apiResponse.result,
      isTemplateMode
    );

    if ("error" in result) {
      return NextResponse.json({ success: false, message: result.error }, { status: result.status });
    }

    return NextResponse.json({
      success: true,
      message: "Your code submitted successfully",
      submissionOutput: result.submission,
      totalTestCases: result.totalTestCases,
      failedCase,
    }, { status: 201 });
  } catch {
    return NextResponse.json({ success: false, message: "Something went wrong during code submitting" }, { status: 500 });
  }
}
