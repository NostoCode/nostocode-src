import axios from "axios";

const PISTON_API_URL = process.env.PISTON_API_URL || 'http://localhost:2000';

// Map Piston status to a standardized result shape.
function mapStatus(stdout: string, pistonStatus: string | null, exitCode: number): { id: number; description: string } {
    if (pistonStatus === "TO") return { id: 5, description: "Time Limit Exceeded" };
    if (pistonStatus === "OL") return { id: 6, description: "Output Limit Exceeded" };
    if (pistonStatus === "RE" || (exitCode !== 0 && !pistonStatus)) return { id: 11, description: "Runtime Error" };
    if (pistonStatus === "SG") return { id: 12, description: "Runtime Error (Signal)" };
    if (pistonStatus === "XX") return { id: 14, description: "Internal Error" };
    // Exit code 0 — check stdout
    const out = stdout.trim();
    if (out === "PASS") return { id: 3, description: "Accepted" };
    if (out.startsWith("FAIL") || out.startsWith("ERR:")) return { id: 4, description: "Wrong Answer" };
    return { id: 4, description: "Wrong Answer" };
}

export const runCodeBatch = async (
    sourceCode: string,
    _languageId: string, // ignored — always Python
    testCases: { input: string; output: string }[]
) => {
    try {
        // Piston has no batch endpoint; run cases in parallel
        const execPromises = testCases.map((tc) =>
            axios.post(
                `${PISTON_API_URL}/api/v2/execute`,
                {
                    language: "python",
                    version: "3.x",
                    files: [{ content: sourceCode }],
                    stdin: tc.input,
                    run_timeout: 3000,
                    compile_timeout: 3000,
                },
                { headers: { "content-type": "application/json" } }
            )
        );

        const responses = await Promise.all(execPromises);

        const result = responses.map((res) => {
            const run = res.data.run;
            return {
                status: mapStatus(run.stdout ?? "", run.status ?? null, run.code ?? 0),
                time: ((run.wall_time ?? 0) / 1000).toFixed(3),   // ms → seconds string
                memory: Math.round((run.memory ?? 0) / 1024),      // bytes → KB
                stdout: run.stdout ?? "",
                stderr: run.stderr ?? "",
            };
        });

        return { success: true as const, result };
    } catch (error: unknown) {
        const err = error as { response?: { data?: { message?: string } }; message?: string };
        console.error("Piston API error:", err.response?.data ?? err.message);
        return {
            success: false as const,
            result: err.response?.data?.message ?? "Piston execution error",
        };
    }
};
