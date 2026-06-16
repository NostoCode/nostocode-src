import { describe, it, expect, beforeEach } from "vitest";
import {
  calculateAncientCodeScore,
  logEditorEvent,
  resetEditorEvents,
} from "./ancientScoring";
import { ancientScoreLevel } from "@/helpers/ancientScoreLevel";

describe("ancientScoreLevel", () => {
  it("maps score ranges to labels", () => {
    expect(ancientScoreLevel(95)).toBe("🟢 Ancient Master");
    expect(ancientScoreLevel(75)).toBe("🟡 Skilled Human");
    expect(ancientScoreLevel(50)).toBe("🟠 Suspicious");
    expect(ancientScoreLevel(10)).toBe("🔴 Likely AI Generated");
  });
});

describe("calculateAncientCodeScore", () => {
  beforeEach(() => {
    resetEditorEvents();
  });

  it("returns zero score when no editor events exist", () => {
    const result = calculateAncientCodeScore();
    expect(result.score).toBe(0);
    expect(result.level).toBe("🔴 Likely AI Generated");
  });

  it("scores human-like typing patterns higher than empty input", () => {
    const base = Date.now();
    for (let i = 0; i < 20; i++) {
      logEditorEvent({
        type: "insert",
        length: 3,
        timestamp: base + i * (120 + (i % 5) * 40),
      });
    }
    logEditorEvent({ type: "delete", length: 2, timestamp: base + 5000 });

    const result = calculateAncientCodeScore();
    expect(result.score).toBeGreaterThan(0);
    expect(result.details.typingRatio).toBeGreaterThan(0);
  });

  it("penalizes unexplained large inserts", () => {
    const base = Date.now();
    logEditorEvent({ type: "insert", length: 200, timestamp: base });
    const result = calculateAncientCodeScore();
    expect(result.details.largeInserts).toBeGreaterThan(0);
    expect(result.score).toBeLessThan(60);
  });
});