import { describe, expect, it } from "vitest";
import {
  normalizeExecutionResult,
  resolveSubmitStatus,
  type PistonRunResult,
} from "@/lib/execution";
import { extractAssertLines } from "@/lib/buildDetailedHarness";

function pistonResult(overrides: Partial<PistonRunResult> = {}): PistonRunResult {
  return {
    status: { id: 3, description: "Accepted" },
    time: "0.1",
    memory: 1024,
    stdout: "",
    stderr: "",
    token: "t1",
    ...overrides,
  };
}

describe("extractAssertLines", () => {
  it("keeps only assert lines, allowing leading whitespace", () => {
    const testCode = [
      "result = candidate(1, 2)",
      "assert candidate(1, 2) == 3",
      "  assert candidate(0, 0) == 0",
      "# assert commented out",
    ].join("\n");
    expect(extractAssertLines(testCode)).toEqual([
      "assert candidate(1, 2) == 3",
      "  assert candidate(0, 0) == 0",
    ]);
  });
});

describe("normalizeExecutionResult (non-template mode)", () => {
  it("passes piston results through untouched", () => {
    const results = [pistonResult({ stdout: "3\n" })];
    const { normalizedResults, failedCase } = normalizeExecutionResult(results, false);
    expect(normalizedResults).toHaveLength(1);
    expect(normalizedResults[0].stdout).toBe("3\n");
    expect(failedCase).toBeNull();
  });
});

describe("normalizeExecutionResult (template mode)", () => {
  it("maps harness ok:true to an Accepted result", () => {
    const results = [pistonResult({ stdout: '{"ok": true}' })];
    const { normalizedResults, failedCase } = normalizeExecutionResult(results, true);
    expect(normalizedResults[0].status).toEqual({ description: "Accepted", id: 3 });
    expect(normalizedResults[0].stdout).toBe("PASS");
    expect(failedCase).toBeNull();
  });

  it("maps harness ok:false to Wrong Answer with the failed case", () => {
    const payload = {
      ok: false,
      index: 2,
      input: "nums = [1, 2]",
      expected: "[3]",
      actual: "[4]",
    };
    const results = [pistonResult({ stdout: JSON.stringify(payload) })];
    const { normalizedResults, failedCase } = normalizeExecutionResult(results, true);
    expect(normalizedResults[0].status.description).toBe("Wrong Answer");
    expect(failedCase).toEqual({
      index: 2,
      input: "nums = [1, 2]",
      expected: "[3]",
      actual: "[4]",
    });
  });

  it("falls back to raw piston results when stdout is not harness JSON", () => {
    const results = [pistonResult({ stdout: "SyntaxError: invalid syntax" })];
    const { normalizedResults, failedCase } = normalizeExecutionResult(results, true);
    expect(normalizedResults[0].stdout).toBe("SyntaxError: invalid syntax");
    expect(failedCase).toBeNull();
  });
});

describe("resolveSubmitStatus (non-template mode)", () => {
  it("returns Accepted only when every case is accepted", () => {
    const allPass = [pistonResult(), pistonResult()];
    expect(resolveSubmitStatus(allPass, false).status).toBe("Accepted");

    const oneFail = [pistonResult(), pistonResult({ status: { id: 5, description: "Time Limit Exceeded" } })];
    expect(resolveSubmitStatus(oneFail, false)).toEqual({ status: "Time Limit Exceeded", failedCase: null });
  });
});

describe("resolveSubmitStatus (template mode)", () => {
  it("returns Accepted for harness ok:true", () => {
    const results = [pistonResult({ stdout: '{"ok": true}' })];
    expect(resolveSubmitStatus(results, true)).toEqual({ status: "Accepted", failedCase: null });
  });

  it("returns Wrong Answer with the failed case details", () => {
    const payload = { ok: false, index: 0, input: "a = 1", expected: "2", actual: "1" };
    const results = [pistonResult({ stdout: JSON.stringify(payload) })];
    const { status, failedCase } = resolveSubmitStatus(results, true);
    expect(status).toBe("Wrong Answer");
    expect(failedCase).toEqual({ index: 0, input: "a = 1", expected: "2", actual: "1" });
  });

  it("prefers the piston status (e.g. TLE/RE) when stdout is not harness JSON", () => {
    const results = [pistonResult({ status: { id: 5, description: "Time Limit Exceeded" }, stdout: "" })];
    expect(resolveSubmitStatus(results, true).status).toBe("Time Limit Exceeded");
  });

  it("classifies as Runtime Error when the process succeeded but printed to stderr", () => {
    const results = [pistonResult({ stdout: "", stderr: "Traceback..." })];
    expect(resolveSubmitStatus(results, true).status).toBe("Runtime Error");
  });

  it("classifies as Wrong Answer when nothing usable was printed", () => {
    const results = [pistonResult({ stdout: "", stderr: "" })];
    expect(resolveSubmitStatus(results, true).status).toBe("Wrong Answer");
  });
});
