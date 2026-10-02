import { describe, expect, it } from "vitest";
import { pgErrorCode } from "./errors";

describe("pgErrorCode", () => {
  it("reads the code from driver errors", () => {
    expect(pgErrorCode({ code: "23505" })).toBe("23505");
  });

  it("reads the code from wrapped errors", () => {
    expect(pgErrorCode(new Error("Failed query", { cause: { code: "23503" } }))).toBe("23503");
  });

  it("returns undefined for unrelated values", () => {
    expect(pgErrorCode(new Error("boom"))).toBeUndefined();
    expect(pgErrorCode(null)).toBeUndefined();
  });
});
