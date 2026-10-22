import { connectToDb } from "@/lib/dbConnect";
import { NextRequest, NextResponse } from "next/server";
import userModel from "@/models/User";
import "@/models/Problem";
import { getAuthToken, unauthorizedResponse } from "@/lib/apiAuth";

export async function GET(req: NextRequest) {
    const token = await getAuthToken(req);
        if (!token) {
            return unauthorizedResponse();
        }
    await connectToDb();

    try {
        const { searchParams } = new URL(req.url);
        const userId = searchParams.get("userId");

        const user = await userModel.findById(userId).select("-password")
            .populate({ path: "solvedQuestions", select: "level" });

        if (!user) {
            return NextResponse.json({
                success: false,
                message: "User not found"
            }, { status: 404 });
        }


        return NextResponse.json({
            success: true,
            message: "User found successfully",
            user
        }, { status: 200 });
    } catch {
        return NextResponse.json({
            success: false,
            message: "Something went wrong while fetching the user info"
        }, { status: 500 });
    }
}