import { connectToDb } from "@/lib/dbConnect";
import problemModel from "@/models/Problem";
import { unstable_cache } from "next/cache";
import { NextRequest, NextResponse } from "next/server";

// Only return fields needed for the problems list — skip heavy fields like
// testCases, testCode, promptCode, description, solutions, similarQuestions
const LIST_FIELDS = "_id title level topics companies like dislike";

const getCachedProblems = unstable_cache(
    async () => {
        await connectToDb();
        return problemModel.find().select(LIST_FIELDS).lean();
    },
    ["all-problems-list"],
    {
        revalidate: 30,      // re-fetch from DB at most every 30 s
        tags: ["problems"],  // allows on-demand invalidation via revalidateTag("problems")
    }
);

export async function GET(req: NextRequest) {
    try {
        const allProblems = await getCachedProblems();

        if (allProblems.length === 0) {
            return NextResponse.json({
                success: false,
                message: "No problem to show, contact the admin"
            }, { status: 400 })
        }

        return NextResponse.json(
            {
                success: true,
                message: "All the problems found successfully",
                allProblems
            },
            {
                status: 200,
                // Browser/CDN: serve stale up to 30 s, then revalidate in background
                headers: { "Cache-Control": "public, s-maxage=30, stale-while-revalidate=60" }
            }
        );
    } catch (error) {
        console.log("Something went wrong while fetching all problems: ", error);
        return NextResponse.json({
            success: false,
            message: "Something went wrong while fetching all problems"
        }, { status: 500 });
    }
}
