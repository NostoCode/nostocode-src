import { connectToDb } from "@/lib/dbConnect";
import userModel from "@/models/User";
import { updateUserValidation } from "@/schemas/updateUserSchema";
import { getAuthToken, unauthorizedResponse } from "@/lib/apiAuth";
import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
    await connectToDb()
    const token = await getAuthToken(req);
    if (!token) {
        return unauthorizedResponse();
    }

    try {
        const body = await req.json();

        const parsedData = updateUserValidation.safeParse(body);
        if (!parsedData.success) {
            return NextResponse.json({
                success: false,
                message: parsedData.error.issues[0].message,
            }, { status: 400 });
        }

        const updatedUser = await userModel.findByIdAndUpdate(
            token._id,
            body,
            { new: true, select: '-password' }
        );

        return NextResponse.json({
            success: true,
            message: "User updated successfully",
            user: updatedUser
        }, { status: 200 })
    } catch {
        return NextResponse.json({
            success: false,
            message: "Something went wrong while updating user"
        }, { status: 500 })
    }
}