import "server-only";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { events, sites } from "@/db/schema";
import { cached } from "@/lib/cache";
import { env } from "@/lib/env";
import { getLiveVisitorStore } from "@/lib/live";
import { hostnameMatchesDomain } from "@/lib/sites/domain";
import { pathnameOf, type EventPayload } from "./payload";
import { resolveSource } from "./source";
import { isBot, parseUserAgent } from "./user-agent";
import { dailySalt, visitorId } from "./visitor";

export type IngestContext = { ip: string; userAgent: string | null; country: string | null };
export type IngestResult = "accepted" | "bot" | "unknown-site" | "domain-mismatch";

/** Site lookups are on the hot path of every event, so they are cached briefly. */
async function getSiteDomain(siteId: string) {
  return cached(`site-domain:${siteId}`, 60, async () => {
    const site = await db.query.sites.findFirst({
      where: eq(sites.id, siteId),
      columns: { domain: true },
    });
    return site?.domain ?? null;
  });
}

/**
 * Validates, anonymises and stores one event from the tracking script.
 * Returns why an event was dropped so the caller (and tests) can reason about it;
 * the HTTP endpoint always answers 202 so it leaks nothing to the sender.
 */
export async function ingestEvent(
  payload: EventPayload,
  context: IngestContext,
): Promise<IngestResult> {
  if (isBot(context.userAgent)) return "bot";
  const userAgent = context.userAgent!;

  const domain = await getSiteDomain(payload.site);
  if (!domain) return "unknown-site";

  // Only accept events from the registered domain, so nobody else can pollute a site's stats.
  const hostname = new URL(payload.url).hostname;
  const isLocal = hostname === "localhost" || hostname === "127.0.0.1";
  if (!hostnameMatchesDomain(hostname, domain) && !(isLocal && env.NODE_ENV !== "production")) {
    return "domain-mismatch";
  }

  const id = visitorId({
    salt: dailySalt(env.ANALYTICS_SALT_SECRET),
    siteId: payload.site,
    ip: context.ip,
    userAgent,
  });
  const isPageview = payload.name === "pageview";

  await db.insert(events).values({
    siteId: payload.site,
    visitorId: id,
    type: isPageview ? "pageview" : "custom",
    name: payload.name,
    pathname: pathnameOf(payload.url),
    ...resolveSource({ pageUrl: payload.url, referrer: payload.referrer, siteDomain: domain }),
    ...parseUserAgent(userAgent),
    country: context.country && /^[A-Z]{2}$/.test(context.country) ? context.country : null,
  });

  await getLiveVisitorStore().touch(payload.site, id);
  return "accepted";
}
