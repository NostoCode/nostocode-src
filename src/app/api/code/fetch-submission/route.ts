import { connectToDb } from "@/lib/dbConnect";
import submissionModel from "@/models/Submission";
import { getAuthToken, unauthorizedResponse, forbiddenResponse, isAdminToken } from "@/lib/apiAuth";
import { NextRequest, NextResponse } from "next/server";
import "@/models/Problem";

export async function GET(req: NextRequest) {
    const token = await getAuthToken(req);
    if (!token) {
        return unauthorizedResponse();
    }

    await connectToDb();

    try {
        const { searchParams } = new URL(req.url);
        const submissionId = searchParams.get("submissionId");

        if (!submissionId) {
            return NextResponse.json({
                success: false,
                message: "Submission ID is required",
            }, { status: 400 });
        }

        const submission = await submissionModel.findById(submissionId).populate({path: "problemId", select: "title"});

        if (!submission) {
            return NextResponse.json({
                success: false,
                message: "Submitted code not found",
            }, { status: 404 });
        }

        if (String(submission.userId) !== String(token._id) && !isAdminToken(token)) {
            return forbiddenResponse("You can only view your own submissions");
        }

        return NextResponse.json({
            success: true,
            message: "Submission details found successfully",
            submissionOutput: submission
        }, { status: 200 });

    } catch {
        return NextResponse.json({
            success: false,
            message: "Something went wrong while fetching submission details"
        }, { status: 500 });
    }
}