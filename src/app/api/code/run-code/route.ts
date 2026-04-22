import { NextResponse, NextRequest } from "next/server";
import { codeRunValidation } from "@/schemas/codeRunSchema";
import { runCodeBatch } from "@/lib/pistonApiFunction";
import { getToken } from "next-auth/jwt";
import { connectToDb } from "@/lib/dbConnect";
import problemModel from "@/models/Problem";
import { extractAssertLines, buildDetailedHarness } from "@/lib/buildDetailedHarness";

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
        let isTemplateMode = false;

        // Use template approach when problemId is provided and language is Python (10)
        if (problemId && languageId === 10) {
            await connectToDb();
            const problem = await problemModel.findById(problemId).select('promptCode testCode examples');
            if (problem?.promptCode && problem?.testCode) {
                // Run only the first N example assertions (not the full suite used by Submit)
                const numExamples = (problem.examples?.match(/Example\s+\d+/gi) || []).length || 3;
                const allAsserts = extractAssertLines(problem.testCode);
                const exampleAsserts = allAsserts.slice(0, numExamples);

                let cleanPrompt = problem.promptCode;
                if (!problem.testCode.includes('SortedList') && !sourceCode.includes('SortedList')) {
                    cleanPrompt = cleanPrompt.replace(/^from sortedcontainers import SortedList\n?/m, '');
                }

                const allowAnyOrder = problem.testCode.includes('# ALLOW_ANY_ORDER');
                finalCode = buildDetailedHarness(cleanPrompt, sourceCode, exampleAsserts, allowAnyOrder);
                finalTestCases = [{ input: "", output: "" }];
                isTemplateMode = true;
            }
        }

        if (!finalTestCases.length) {
            return NextResponse.json({
                success: false,
                message: "No test cases available for this problem",
            }, { status: 400 });
        }

        const response = await runCodeBatch(finalCode, languageId, finalTestCases);

        if (!response.success) {
            return NextResponse.json({
                success: false,
                message: response.result,
            }, { status: 400 });
        }

        // In template mode, parse the JSON output from the detailed harness
        let failedCase: { index: number; input: string; expected: string; actual: string } | null = null;
        let normalizedResults = response.result;

        if (isTemplateMode) {
            const stdout = response.result[0]?.stdout?.trim();
            try {
                const parsed = JSON.parse(stdout || '');
                if (parsed.ok) {
                    normalizedResults = [{ ...response.result[0], stdout: "PASS", status: { description: "Accepted", id: 3 } }];
                } else {
                    failedCase = { index: parsed.index, input: parsed.input, expected: parsed.expected, actual: parsed.actual };
                    normalizedResults = [{ ...response.result[0], stdout: "FAIL", status: { description: "Wrong Answer", id: 4 } }];
                }
            } catch {
                // Not JSON — compile error or unhandled runtime error; keep raw result
            }
        }

        return NextResponse.json({
            success: true,
            message: "Code executed successfully",
            results: normalizedResults,
            failedCase,
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