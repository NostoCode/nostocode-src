import { describe, it, expect } from "vitest";
import { formatMathNotation } from "./formatMath";

describe("formatMathNotation", () => {
  it("converts numeric exponents to superscript", () => {
    expect(formatMathNotation("2^31")).toBe("2<sup>31</sup>");
    expect(formatMathNotation("range [-2^31, 2^31 - 1]")).toBe(
      "range [-2<sup>31</sup>, 2<sup>31</sup> - 1]"
    );
  });
});