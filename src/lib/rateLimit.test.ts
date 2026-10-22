import { describe, expect, it, beforeEach } from "vitest";
import { checkRateLimit, resetRateLimits } from "@/lib/rateLimit";

beforeEach(() => {
  resetRateLimits();
});

describe("checkRateLimit", () => {
  it("allows requests up to the limit and blocks the next one", () => {
    for (let i = 0; i < 3; i++) {
      expect(checkRateLimit("user:1", 3, 60_000).allowed).toBe(true);
    }
    const blocked = checkRateLimit("user:1", 3, 60_000);
    expect(blocked.allowed).toBe(false);
    expect(blocked.remaining).toBe(0);
    expect(blocked.retryAfterSec).toBeGreaterThan(0);
  });

  it("counts keys independently", () => {
    expect(checkRateLimit("user:1", 1, 60_000).allowed).toBe(true);
    expect(checkRateLimit("user:2", 1, 60_000).allowed).toBe(true);
    expect(checkRateLimit("user:1", 1, 60_000).allowed).toBe(false);
  });

  it("resets the window after it expires", () => {
    const t0 = 1_000_000;
    expect(checkRateLimit("user:1", 1, 1_000, t0).allowed).toBe(true);
    expect(checkRateLimit("user:1", 1, 1_000, t0 + 500).allowed).toBe(false);
    expect(checkRateLimit("user:1", 1, 1_000, t0 + 1_000).allowed).toBe(true);
  });

  it("reports decreasing remaining quota within a window", () => {
    expect(checkRateLimit("user:1", 2, 60_000).remaining).toBe(1);
    expect(checkRateLimit("user:1", 2, 60_000).remaining).toBe(0);
  });
});
