import { connectToDb } from "@/lib/dbConnect";
import submissionModel from "@/models/Submission";
import { getAuthToken, unauthorizedResponse } from "@/lib/apiAuth";
import { NextRequest, NextResponse } from "next/server";

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

        const submission = await submissionModel.findOne({
            _id: submissionId,
            userId: token._id
        });

        if (!submission) {
            return NextResponse.json({
                success: false,
                message: "Submitted code not found",
            }, { status: 404 });
        }

        return NextResponse.json({
            success: true,
            message: "Submission details found successfully",
            submissionDetails: submission
        }, { status: 200 });

    } catch {
        return NextResponse.json({
            success: false,
            message: "Something went wrong while fetching submission details"
        }, { status: 500 });
    }
}