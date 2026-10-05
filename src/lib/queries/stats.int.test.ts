import { randomUUID } from "node:crypto";
import { eq } from "drizzle-orm";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { db } from "@/db";
import { events, sites, users, type NewAnalyticsEvent } from "@/db/schema";
import { resolveRange } from "@/lib/stats/period";
import { getBreakdown, getGoals, getSummary, getTimeseries } from "./stats";

const run = randomUUID().slice(0, 8);
const now = new Date("2026-03-10T18:00:00Z");
const range = resolveRange("7d", now);
const at = (iso: string) => new Date(iso);
let userId: string;
let siteId: string;

beforeAll(async () => {
  const [user] = await db
    .insert(users)
    .values({ name: "Stats", email: `stats-${run}@test.dev`, passwordHash: "x" })
    .returning({ id: users.id });
  userId = user!.id;
  const [site] = await db
    .insert(sites)
    .values({ ownerId: userId, domain: `stats-${run}.test`, name: "Stats", shareSlug: `s${run}` })
    .returning({ id: sites.id });
  siteId = site!.id;

  const view = (
    visitorId: string,
    createdAt: string,
    pathname: string,
    extra: Partial<NewAnalyticsEvent> = {},
  ): NewAnalyticsEvent => ({
    siteId,
    visitorId,
    pathname,
    createdAt: at(createdAt),
    source: "Google",
    country: "DE",
    ...extra,
  });

  await db.insert(events).values([
    // Visitor A: one 5-minute session with two pageviews, then a second session two hours later.
    view("aaaaaaaaaaaaaaaa", "2026-03-09T10:00:00Z", "/"),
    view("aaaaaaaaaaaaaaaa", "2026-03-09T10:05:00Z", "/pricing"),
    view("aaaaaaaaaaaaaaaa", "2026-03-09T12:05:00Z", "/"),
    // Visitor B: a single pageview (a bounce) from another source and country.
    view("bbbbbbbbbbbbbbbb", "2026-03-10T09:00:00Z", "/", { source: "Direct", country: "US" }),
    // A goal conversion, which must not count as a pageview.
    view("aaaaaaaaaaaaaaaa", "2026-03-09T10:06:00Z", "/pricing", {
      type: "custom",
      name: "Signup",
    }),
    // Outside the 7-day range.
    view("cccccccccccccccc", "2026-02-20T10:00:00Z", "/"),
  ]);
});

afterAll(async () => {
  await db.delete(users).where(eq(users.id, userId));
});

describe("stats queries", () => {
  it("reconstructs sessions to compute bounce rate and visit duration", async () => {
    const summary = await getSummary(siteId, range.from, range.to);
    expect(summary.visitors).toBe(2);
    expect(summary.pageviews).toBe(4);
    expect(summary.sessions).toBe(3);
    expect(summary.bounceRate).toBeCloseTo((2 / 3) * 100, 5);
    // Durations: 300s, 0s, 0s.
    expect(summary.avgDuration).toBeCloseTo(100, 5);
  });

  it("applies filters", async () => {
    const summary = await getSummary(siteId, range.from, range.to, { country: "US" });
    expect(summary).toMatchObject({ visitors: 1, pageviews: 1, sessions: 1, bounceRate: 100 });
  });

  it("returns a continuous daily series with empty days filled in", async () => {
    const series = await getTimeseries(siteId, range);
    expect(series).toHaveLength(7);
    expect(series.at(-1)).toEqual({ bucket: "2026-03-10T00:00:00Z", visitors: 1, pageviews: 1 });
    expect(series.at(-2)).toMatchObject({ visitors: 1, pageviews: 3 });
    expect(series[0]).toMatchObject({ visitors: 0, pageviews: 0 });
  });

  it("ranks breakdowns by unique visitors", async () => {
    expect(await getBreakdown(siteId, "page", range.from, range.to)).toEqual([
      { value: "/", visitors: 2, pageviews: 3 },
      { value: "/pricing", visitors: 1, pageviews: 1 },
    ]);
    expect(
      (await getBreakdown(siteId, "source", range.from, range.to)).map((row) => row.value),
    ).toEqual([
      "Google", // tie on visitors, more pageviews
      "Direct",
    ]);
  });

  it("reports goal conversions", async () => {
    expect(await getGoals(siteId, range.from, range.to)).toEqual([
      { name: "Signup", conversions: 1, visitors: 1 },
    ]);
  });
});
