import { NextResponse, NextRequest } from "next/server";
import { codeRunValidation } from "@/schemas/codeRunSchema";
import { runCodeBatch } from "@/lib/pistonApiFunction";
import { getAuthToken, unauthorizedResponse } from "@/lib/apiAuth";
import { checkRateLimit, rateLimitResponse } from "@/lib/rateLimit";
import {
  prepareForRun,
  normalizeExecutionResult,
} from "@/lib/execution";

const RUN_LIMIT = 30; // runs per minute per user
const RUN_WINDOW_MS = 60_000;

export async function POST(req: NextRequest) {
  const token = await getAuthToken(req);

  if (!token) {
    return unauthorizedResponse();
  }

  const rate = checkRateLimit(`run:${token._id}`, RUN_LIMIT, RUN_WINDOW_MS);
  if (!rate.allowed) {
    return rateLimitResponse(rate);
  }

  try {
    const body = await req.json();
    const parsedData = codeRunValidation.safeParse(body);

    if (!parsedData.success) {
      return NextResponse.json(
        {
          success: false,
          message: parsedData.error.issues[0].message,
        },
        { status: 400 }
      );
    }

    const { sourceCode, languageId, testCases, problemId } = parsedData.data;
    const { finalCode, finalTestCases, isTemplateMode } = await prepareForRun(
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

    const response = await runCodeBatch(finalCode, String(languageId), finalTestCases);

    if (!response.success) {
      return NextResponse.json(
        { success: false, message: response.result },
        { status: 400 }
      );
    }

    const { normalizedResults, failedCase } = normalizeExecutionResult(
      response.result,
      isTemplateMode
    );

    return NextResponse.json(
      {
        success: true,
        message: "Code executed successfully",
        results: normalizedResults,
        failedCase,
      },
      { status: 200 }
    );
  } catch {
    return NextResponse.json(
      {
        success: false,
        message: "Something went wrong while submitting code into api",
      },
      { status: 500 }
    );
  }
}