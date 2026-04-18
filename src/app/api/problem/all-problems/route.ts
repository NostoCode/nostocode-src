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

const PAGE_SIZE = 20;

export async function GET(req: NextRequest) {
    try {
        const { searchParams } = new URL(req.url);
        const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10));
        const limit = Math.min(100, Math.max(1, parseInt(searchParams.get("limit") || String(PAGE_SIZE), 10)));
        const paginate = searchParams.has("page");

        const allProblems = await getCachedProblems();

        if (allProblems.length === 0) {
            return NextResponse.json({
                success: false,
                message: "No problem to show, contact the admin"
            }, { status: 400 })
        }

        // When no page param, return all (for shuffle / backwards compat)
        if (!paginate) {
            return NextResponse.json(
                {
                    success: true,
                    message: "All the problems found successfully",
                    allProblems,
                    total: allProblems.length,
                },
                {
                    status: 200,
                    headers: { "Cache-Control": "public, s-maxage=30, stale-while-revalidate=60" }
                }
            );
        }

        const start = (page - 1) * limit;
        const paginatedProblems = allProblems.slice(start, start + limit);
        const totalPages = Math.ceil(allProblems.length / limit);

        return NextResponse.json(
            {
                success: true,
                message: "Problems found successfully",
                allProblems: paginatedProblems,
                total: allProblems.length,
                page,
                limit,
                totalPages,
            },
            {
                status: 200,
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
