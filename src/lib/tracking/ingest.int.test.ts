import { randomUUID } from "node:crypto";
import { eq } from "drizzle-orm";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { db } from "@/db";
import { events, sites, users } from "@/db/schema";
import { getLiveVisitorStore } from "@/lib/live";
import { ingestEvent } from "./ingest";

const run = randomUUID().slice(0, 8);
const domain = `ingest-${run}.test`;
const userAgent =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36";
const context = { ip: "203.0.113.7", userAgent, country: "DE" };
let userId: string;
let siteId: string;

beforeAll(async () => {
  const [user] = await db
    .insert(users)
    .values({ name: "Ingest", email: `ingest-${run}@test.dev`, passwordHash: "x" })
    .returning({ id: users.id });
  userId = user!.id;
  const [site] = await db
    .insert(sites)
    .values({ ownerId: userId, domain, name: domain, shareSlug: `slug${run}` })
    .returning({ id: sites.id });
  siteId = site!.id;
});

afterAll(async () => {
  await db.delete(users).where(eq(users.id, userId));
});

describe("ingestEvent", () => {
  it("stores an anonymised, enriched pageview and marks the visitor as live", async () => {
    const result = await ingestEvent(
      {
        site: siteId,
        name: "pageview",
        url: `https://www.${domain}/pricing/?utm_source=newsletter&email=a@b.c`,
        referrer: "https://www.google.com/",
      },
      context,
    );
    expect(result).toBe("accepted");

    const [event] = await db.select().from(events).where(eq(events.siteId, siteId));
    expect(event).toMatchObject({
      type: "pageview",
      pathname: "/pricing",
      source: "newsletter",
      browser: "Chrome",
      os: "Windows",
      device: "desktop",
      country: "DE",
    });
    expect(event!.visitorId).toMatch(/^[0-9a-f]{16}$/);
    expect(JSON.stringify(event)).not.toContain(context.ip);
    expect(await getLiveVisitorStore().count(siteId, 300)).toBe(1);
  });

  it("gives the same visitor the same id and records custom events", async () => {
    await ingestEvent({ site: siteId, name: "Signup", url: `https://${domain}/welcome` }, context);
    const rows = await db.select().from(events).where(eq(events.siteId, siteId));
    expect(new Set(rows.map((row) => row.visitorId)).size).toBe(1);
    expect(rows.find((row) => row.name === "Signup")?.type).toBe("custom");
  });

  it("drops bots, unknown sites and events from other domains", async () => {
    const url = `https://${domain}/`;
    expect(
      await ingestEvent(
        { site: siteId, name: "pageview", url },
        { ...context, userAgent: "curl/8.4.0" },
      ),
    ).toBe("bot");
    expect(await ingestEvent({ site: randomUUID(), name: "pageview", url }, context)).toBe(
      "unknown-site",
    );
    expect(
      await ingestEvent({ site: siteId, name: "pageview", url: "https://evil.example/" }, context),
    ).toBe("domain-mismatch");

    const rows = await db.select().from(events).where(eq(events.siteId, siteId));
    expect(rows).toHaveLength(2);
  });
});
