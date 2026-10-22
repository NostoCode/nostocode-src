import { connectToDb } from "@/lib/dbConnect";
import problemModel from "@/models/Problem";
import { createProblemValidation } from "@/schemas/createProblemSchema";
import { revalidateTag } from "next/cache";
import { NextRequest, NextResponse } from "next/server";
import { getAuthToken, unauthorizedResponse, forbiddenResponse, isAdminToken } from "@/lib/apiAuth";

export async function POST(req: NextRequest) {
    const token = await getAuthToken(req);
    if (!token) {
        return unauthorizedResponse();
    }

    if (!isAdminToken(token)) {
        return forbiddenResponse("Only admin can access this route");
    }

    await connectToDb();

    try {
        const body = await req.json();
        const { title, level, description, examples, constraints, testCases, topics, companies } = body;

        // zod validation
        const parsedData = createProblemValidation.safeParse(body);

        if (!parsedData.success) {
            return NextResponse.json({
                success: false,
                message: parsedData.error.issues[0].message,
            }, { status: 400 });
        }

        // this will give us the problem index
        const problemIndex = await problemModel.countDocuments() + 1;
        // check existing problem
        const existingProblem = await problemModel.findOne({ title: (problemIndex - 1) + " " + title });
        if (existingProblem) {
            return NextResponse.json({
                success: false,
                message: "Problem is already exist with this name"
            }, { status: 400 });
        }

        const newProblem = await problemModel.create({
            title: problemIndex + ". " + title,
            level,
            description,
            examples,
            constraints,
            testCases,
            topics,
            companies,
            similarQuestions: [],
            solutions: []
        });

        revalidateTag("problems"); // bust the all-problems list cache

        return NextResponse.json({
            success: true,
            message: "Problem is added",
            problemId: newProblem._id
        }, { status: 201 });

    } catch {
        return NextResponse.json({
            success: false,
            message: "Something went wrong while adding problem"
        }, { status: 500 });
    }
}