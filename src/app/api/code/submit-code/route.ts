import { connectToDb } from "@/lib/dbConnect";
import { runCodeBatch } from "@/lib/pistonApiFunction";
import problemModel from "@/models/Problem";
import submissionModel from "@/models/Submission";
import userModel from "@/models/User";
import { codeRunValidation } from "@/schemas/codeRunSchema";
import { codeSubmissionValidation } from "@/schemas/codeSubmissionSchema";
import { extractAssertLines, buildDetailedHarness } from "@/lib/buildDetailedHarness";
import { getToken } from "next-auth/jwt";
import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
    const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });

    if (!token) {
        return NextResponse.json({
            success: false,
            message: "Unauthorized"
        }, { status: 400 });
    }

    await connectToDb();

    try {
        const body = await req.json();
        const { userId, language, problemId, sourceCode, languageId, testCases, ancientCodeScore, ancientCodeLevel, scoreDetails } = body;

        const parsedData1 = codeSubmissionValidation.safeParse({ userId, language, sourceCode, problemId });

        if (!parsedData1.success) {
            return NextResponse.json({
                success: false,
                message: parsedData1.error.issues[0].message
            }, { status: 400 });
        }

        const parsedData2 = codeRunValidation.safeParse({ sourceCode, languageId, testCases, problemId });

        if (!parsedData2.success) {
            return NextResponse.json({
                success: false,
                message: parsedData2.error.issues[0].message
            }, { status: 400 });
        }

        // Build template code for Python if problem has promptCode/testCode
        let finalCode = sourceCode;
        let finalTestCases = testCases || [];
        let isTemplateMode = false;

        if (languageId === 10) {
            const problemForTemplate = await problemModel.findById(problemId).select('promptCode testCode');
            if (problemForTemplate?.promptCode && problemForTemplate?.testCode) {
                const allAsserts = extractAssertLines(problemForTemplate.testCode);
                let cleanPrompt = problemForTemplate.promptCode;
                if (!problemForTemplate.testCode.includes('SortedList') && !sourceCode.includes('SortedList')) {
                    cleanPrompt = cleanPrompt.replace(/^from sortedcontainers import SortedList\n?/m, '');
                }
                finalCode = buildDetailedHarness(cleanPrompt, sourceCode, allAsserts);
                finalTestCases = [{ input: "", output: "" }];
                isTemplateMode = true;
            }
        }

        if (!finalTestCases.length) {
            return NextResponse.json({
                success: false,
                message: "No test cases available for this problem"
            }, { status: 400 });
        }

        // run code using piston api
        const apiResponse = await runCodeBatch(finalCode, languageId, finalTestCases);

        if (!apiResponse.success) {
            console.log("Error in api response: ", apiResponse.result);
            return NextResponse.json({
                success: false,
                message: apiResponse.result,
            }, { status: 400 });
        }

        let currentStatus = "Accepted";
        let sumOfTime = 0;
        let sumOfMemory = 0;
        let failedCase: { index: number; input: string; expected: string; actual: string } | null = null;

        if (isTemplateMode) {
            // In template mode, determine pass/fail from the JSON output of the detailed harness
            sumOfTime = parseFloat(apiResponse.result[0]?.time || '0') || 0;
            sumOfMemory = apiResponse.result[0]?.memory || 0;
            const stdout = apiResponse.result[0]?.stdout?.trim();
            try {
                const parsed = JSON.parse(stdout || '');
                if (!parsed.ok) {
                    currentStatus = "Wrong Answer";
                    failedCase = { index: parsed.index, input: parsed.input, expected: parsed.expected, actual: parsed.actual };
                }
            } catch {
                // Not JSON: compile error or unhandled runtime error before any output
                const stderr = apiResponse.result[0]?.stderr?.trim();
                currentStatus = stderr ? "Runtime Error" : "Wrong Answer";
            }
        } else {
            for (let i = 0; i < apiResponse.result.length; i++) {
                sumOfTime += parseFloat(apiResponse.result[i].time) || 0;
                sumOfMemory += apiResponse.result[i].memory || 0;
                if (apiResponse.result[i].status.description !== "Accepted") {
                    currentStatus = apiResponse.result[i].status.description;
                    break;
                }
            }
        }

        // Ancient Coding Mode: Save score with submission
        const newSubmission = await submissionModel.create({
            userId,
            status: currentStatus,
            language,
            time: sumOfTime / apiResponse.result.length,
            memory: (sumOfMemory / apiResponse.result.length) / 1024,
            sourceCode,
            ancientCodeScore: ancientCodeScore ?? 100,
            ancientCodeLevel: ancientCodeLevel ?? "🟢 Ancient Master",
            scoreDetails: scoreDetails ?? undefined,
            problemId
        });

        if(!newSubmission){
            console.log("Code Submission Failed");
            return NextResponse.json({
                success: false,
                message: "Code Submission Failed",
            }, { status: 400 });
        }

        const problem = await problemModel.findById(problemId);
        if(!problem){
            await submissionModel.findByIdAndDelete(newSubmission._id);

            return NextResponse.json({
                success: false,
                message: "Problem not found",
            }, { status: 404 });
        }

        const user = await userModel.findById(userId);
        if(!user){
            await submissionModel.findByIdAndDelete(newSubmission._id);

            return NextResponse.json({
                success: false,
                message: "User not found",
            }, { status: 404 });
        }

        user.submissions.push(newSubmission._id);
        if (currentStatus === "Accepted") {
            const alreadySolved = user.solvedQuestions.some(
                (q: unknown) => q?.toString() === problemId.toString()
            );
            if (!alreadySolved) {
                user.solvedQuestions.push(problemId);
                user.solvedProblems = user.solvedProblems + 1;
            }
        }
        await user.save();

        return NextResponse.json({
            success: true,
            message: "Your code submitted successfully",
            submissionOutput: newSubmission,
            totalTestCases: problem.testCases?.length || 0,
            failedCase,
        }, { status: 201 });

    } catch (error) {
        console.error("Something went wrong during code submitting: ", error);
        return NextResponse.json({
            success: false,
            message: "Something went wrong during code submitting"
        }, { status: 500 });
    }
}
