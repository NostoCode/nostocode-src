import { connectToDb } from "@/lib/dbConnect";
import { mongodbObjectId } from "@/schemas/similarQuestionSchema";
import { NextRequest, NextResponse } from "next/server";
import submissionModel from "@/models/Submission";
import "@/models/Problem";
import { getAuthToken, unauthorizedResponse, forbiddenResponse, isAdminToken } from "@/lib/apiAuth";

export async function POST(req: NextRequest) {
    const token = await getAuthToken(req);
    if (!token) {
        return unauthorizedResponse();
    }
    await connectToDb();

    try {
        const { userId } = await req.json();
        if (!userId) {
            return NextResponse.json({
                success: false,
                message: "User id is required"
            }, { status: 400 })
        }

        const parsedData = mongodbObjectId.safeParse(userId);
        if (!parsedData.success) {
            return NextResponse.json({
                success: false,
                message: parsedData.error.issues[0].message
            }, { status: 400 })
        }

        if (String(userId) !== String(token._id) && !isAdminToken(token)) {
            return forbiddenResponse("You can only view your own submissions");
        }

        const allSubmissions = await submissionModel.find({
            userId
        }).populate({ path: "problemId", select: "title" });

        return NextResponse.json({
            success: true,
            message: "All submission are fetched successfully",
            submissions: allSubmissions
        }, { status: 200 });
    } catch {
        return NextResponse.json({
            success: false,
            message: "Something went wrong while fetching all solutions"
        }, { status: 500 })
    }
}