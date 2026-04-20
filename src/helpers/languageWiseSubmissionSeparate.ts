import { codeSubmissionResultType } from "@/types/ApiResponse";

export const languageWiseSubmissionSeperate = (submission: codeSubmissionResultType[]) => {
    // Count unique solved problems per language (Accepted only, deduped by problemId)
    const solvedByLanguage: Record<string, Set<string>> = {
        "C++": new Set(),
        "C": new Set(),
        "Javascript": new Set(),
        "Python": new Set(),
        "Java": new Set(),
    };

    for (const sub of submission) {
        if (sub.status !== "Accepted") continue;
        const problemId = typeof sub.problemId === "object" && sub.problemId !== null
            ? String((sub.problemId as { _id?: unknown })._id ?? sub.problemId)
            : String(sub.problemId);
        if (solvedByLanguage[sub.language]) {
            solvedByLanguage[sub.language].add(problemId);
        }
    }

    return {
        c: solvedByLanguage["C"].size,
        cpp: solvedByLanguage["C++"].size,
        py: solvedByLanguage["Python"].size,
        js: solvedByLanguage["Javascript"].size,
        java: solvedByLanguage["Java"].size,
    };
}