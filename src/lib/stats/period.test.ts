import { describe, expect, it } from "vitest";
import { dashboardHref, parseFilters, parsePeriod, resolveRange } from "./period";

const now = new Date("2026-06-15T14:30:00Z");

describe("parsePeriod", () => {
  it("defaults to 7 days for missing or unknown values", () => {
    expect(parsePeriod(undefined)).toBe("7d");
    expect(parsePeriod("forever")).toBe("7d");
    expect(parsePeriod(["30d", "7d"])).toBe("30d");
  });
});

describe("resolveRange", () => {
  it("uses hourly buckets for today and compares with yesterday", () => {
    const range = resolveRange("today", now);
    expect(range.from.toISOString()).toBe("2026-06-15T00:00:00.000Z");
    expect(range.to.toISOString()).toBe("2026-06-16T00:00:00.000Z");
    expect(range.previousFrom.toISOString()).toBe("2026-06-14T00:00:00.000Z");
    expect(range.bucket).toBe("hour");
  });

  it("covers full days including today and an equally long previous period", () => {
    const range = resolveRange("7d", now);
    expect(range.from.toISOString()).toBe("2026-06-09T00:00:00.000Z");
    expect(range.to.toISOString()).toBe("2026-06-16T00:00:00.000Z");
    expect(range.previousFrom.toISOString()).toBe("2026-06-02T00:00:00.000Z");
    expect(range.bucket).toBe("day");
  });
});

describe("parseFilters", () => {
  it("keeps valid filters and drops invalid ones", () => {
    expect(parseFilters({ page: "/pricing", source: "Google", country: "de" })).toEqual({
      page: "/pricing",
      source: "Google",
      country: "DE",
    });
    expect(parseFilters({ page: "pricing", country: "Germany" })).toEqual({});
  });
});

describe("dashboardHref", () => {
  const current = { period: "30d" as const, filters: { source: "Google" } };

  it("keeps state while adding or clearing filters", () => {
    expect(dashboardHref("/sites/1", current, { page: "/docs" })).toBe(
      "/sites/1?period=30d&source=Google&page=%2Fdocs",
    );
    expect(dashboardHref("/sites/1", current, { source: undefined })).toBe("/sites/1?period=30d");
  });

  it("omits the default period", () => {
    expect(dashboardHref("/sites/1", { period: "7d", filters: {} })).toBe("/sites/1");
  });
});
