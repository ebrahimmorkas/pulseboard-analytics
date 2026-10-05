import { type NextRequest } from "next/server";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db";
import { sites } from "@/db/schema";
import { getCurrentUser } from "@/lib/auth/session";
import { LIVE_WINDOW_SECONDS, getLiveVisitorStore } from "@/lib/live";

/**
 * Number of visitors active in the last five minutes.
 * Readable by the site's owner, or by anyone holding the share slug of a public site.
 */
export async function GET(request: NextRequest, context: RouteContext<"/api/sites/[siteId]/live">) {
  const { siteId } = await context.params;
  if (!z.uuid().safeParse(siteId).success)
    return Response.json({ error: "Not found" }, { status: 404 });

  const site = await db.query.sites.findFirst({
    where: eq(sites.id, siteId),
    columns: { ownerId: true, isPublic: true, shareSlug: true },
  });
  if (!site) return Response.json({ error: "Not found" }, { status: 404 });

  const share = request.nextUrl.searchParams.get("share");
  const viaShareLink = site.isPublic && share === site.shareSlug;
  if (!viaShareLink) {
    const user = await getCurrentUser();
    // 404 rather than 403, so the endpoint does not reveal which site ids exist.
    if (user?.id !== site.ownerId) return Response.json({ error: "Not found" }, { status: 404 });
  }

  const visitors = await getLiveVisitorStore().count(siteId, LIVE_WINDOW_SECONDS);
  return Response.json({ visitors }, { headers: { "Cache-Control": "private, no-store" } });
}
