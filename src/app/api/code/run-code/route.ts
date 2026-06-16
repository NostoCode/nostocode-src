import { NextResponse, NextRequest } from "next/server";
import { codeRunValidation } from "@/schemas/codeRunSchema";
import { runCodeBatch } from "@/lib/pistonApiFunction";
import { getToken } from "next-auth/jwt";
import {
  prepareForRun,
  normalizeExecutionResult,
} from "@/lib/execution";

export async function POST(req: NextRequest) {
  const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });

  if (!token) {
    return NextResponse.json(
      { success: false, message: "Unauthorized" },
      { status: 400 }
    );
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