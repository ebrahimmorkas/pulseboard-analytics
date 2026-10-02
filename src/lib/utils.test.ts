import { describe, expect, it } from "vitest";
import { compactNumber, formatDuration, formatPercent, percentChange } from "./utils";

describe("compactNumber", () => {
  it("abbreviates large numbers", () => {
    expect(compactNumber(950)).toBe("950");
    expect(compactNumber(12_345)).toBe("12.3K");
  });
});

describe("formatDuration", () => {
  it.each([
    [0, "0s"],
    [45.4, "45s"],
    [185, "3m 05s"],
    [3720, "1h 02m"],
    [-5, "0s"],
  ])("formats %s seconds as %s", (input, expected) => {
    expect(formatDuration(input)).toBe(expected);
  });
});

describe("percentChange", () => {
  it("computes growth and decline", () => {
    expect(percentChange(150, 100)).toBe(50);
    expect(percentChange(50, 100)).toBe(-50);
  });

  it("handles empty previous periods", () => {
    expect(percentChange(0, 0)).toBe(0);
    expect(percentChange(10, 0)).toBeNull();
  });
});

describe("formatPercent", () => {
  it("rounds to whole percentages", () => {
    expect(formatPercent(42.6)).toBe("43%");
  });
});
