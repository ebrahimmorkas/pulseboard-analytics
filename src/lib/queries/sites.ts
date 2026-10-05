import "server-only";
import { and, desc, eq, sql } from "drizzle-orm";
import { db } from "@/db";
import { events, sites } from "@/db/schema";

/** The owner's sites with unique visitors over the last 24 hours. */
export async function listSites(ownerId: string) {
  return db
    .select({
      id: sites.id,
      domain: sites.domain,
      name: sites.name,
      isPublic: sites.isPublic,
      visitors24h: sql<number>`(
        select count(distinct ${events.visitorId}) from ${events}
        where ${events.siteId} = "sites"."id" and ${events.createdAt} > now() - interval '24 hours'
      )`.mapWith(Number),
    })
    .from(sites)
    .where(eq(sites.ownerId, ownerId))
    .orderBy(desc(sites.createdAt));
}

/** Loads a site only if it belongs to the given user. */
export async function getOwnedSite(siteId: string, ownerId: string) {
  const site = await db.query.sites.findFirst({
    where: and(eq(sites.id, siteId), eq(sites.ownerId, ownerId)),
  });
  return site ?? null;
}

export async function getPublicSite(shareSlug: string) {
  const site = await db.query.sites.findFirst({
    where: and(eq(sites.shareSlug, shareSlug), eq(sites.isPublic, true)),
  });
  return site ?? null;
}
