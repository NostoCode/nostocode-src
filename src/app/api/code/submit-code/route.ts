import { connectToDb } from "@/lib/dbConnect";
import { runCodeBatch } from "@/lib/pistonApiFunction";
import { codeSubmissionValidation } from "@/schemas/codeSubmissionSchema";
import { codeRunValidation } from "@/schemas/codeRunSchema";
import { prepareForSubmit, resolveSubmitStatus, recordSubmission } from "@/lib/execution";
import { getAuthToken, unauthorizedResponse, forbiddenResponse } from "@/lib/apiAuth";
import { checkRateLimit, rateLimitResponse } from "@/lib/rateLimit";
import { NextRequest, NextResponse } from "next/server";

const SUBMIT_LIMIT = 20; // submissions per minute per user
const SUBMIT_WINDOW_MS = 60_000;

export async function POST(req: NextRequest) {
  const token = await getAuthToken(req);
  if (!token) {
    return unauthorizedResponse();
  }

  const rate = checkRateLimit(`submit:${token._id}`, SUBMIT_LIMIT, SUBMIT_WINDOW_MS);
  if (!rate.allowed) {
    return rateLimitResponse(rate);
  }

  await connectToDb();

  try {
    const body = await req.json();
    const { userId, language, problemId, sourceCode, languageId, testCases, ancientCodeScore, ancientCodeLevel, scoreDetails } = body;

    // never let one user submit on behalf of another
    if (String(userId) !== String(token._id)) {
      return forbiddenResponse("You can only submit code for your own account");
    }

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
