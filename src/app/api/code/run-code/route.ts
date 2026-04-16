import { NextResponse, NextRequest } from "next/server";
import { codeRunValidation } from "@/schemas/codeRunSchema";
import { runJudge0Batch } from "@/lib/judge0ApiFunction";
import { getToken } from "next-auth/jwt";
import { connectToDb } from "@/lib/dbConnect";
import problemModel from "@/models/Problem";

/** Build the full Python program from user code + problem template */
function buildTemplateCode(promptCode: string, userCode: string, testCode: string): string {
    // Remove sortedcontainers import if not used in test code
    let cleanPrompt = promptCode;
    if (!testCode.includes('SortedList') && !userCode.includes('SortedList')) {
        cleanPrompt = cleanPrompt.replace(/^from sortedcontainers import SortedList\n?/m, '');
    }

    return `${cleanPrompt}

${userCode}

${testCode}

import inspect
try:
    _sol = Solution()
    _methods = [m for m, _ in inspect.getmembers(_sol, predicate=inspect.ismethod) if not m.startswith('_')]
    check(getattr(_sol, _methods[0]))
    print("PASS")
except AssertionError:
    print("FAIL")
except Exception as e:
    print(f"ERR: {e}")
`;
}

export async function POST(req: NextRequest) {
    const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });

    if (!token) {
        return NextResponse.json({
            success: false,
            message: "Unauthorized"
        }, { status: 400 });
    }

    try {
        const body = await req.json();
        const { sourceCode, languageId, testCases, problemId } = body;

        const parsedData = codeRunValidation.safeParse(body);

        if (!parsedData.success) {
            console.log(parsedData.error.issues[0].message)
            return NextResponse.json({
                success: false,
                message: parsedData.error.issues[0].message,
            }, { status: 400 });
        }

        let finalCode = sourceCode;
        let finalTestCases: { input: string; output: string }[] = testCases || [];

        // Use template approach when problemId is provided and language is Python (10)
        if (problemId && languageId === 10) {
            await connectToDb();
            const problem = await problemModel.findById(problemId).select('promptCode testCode');
            if (problem?.promptCode && problem?.testCode) {
                finalCode = buildTemplateCode(problem.promptCode, sourceCode, problem.testCode);
                finalTestCases = [{ input: "", output: "PASS" }];
            }
        }

        if (!finalTestCases.length) {
            return NextResponse.json({
                success: false,
                message: "No test cases available for this problem",
            }, { status: 400 });
        }

        // call judge0 api
        const response = await runJudge0Batch(finalCode, languageId, finalTestCases as any);

        if (!response.success) {
            return NextResponse.json({
                success: false,
                message: response.result,
            }, { status: 400 });
        }

        return NextResponse.json({
            success: true,
            message: "Code executed successfully",
            results: response.result,
        }, { status: 200 });
    } catch (error) {
        console.error("Something went wrong while submitting code into api:", error);
        return NextResponse.json(
            {
                success: false,
                message: "Something went wrong while submitting code into api",
            }, { status: 500 });
    }
}