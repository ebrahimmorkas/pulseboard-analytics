import { sql } from "drizzle-orm";
import { db } from "@/db";
import { getCache } from "@/lib/cache";
import { getLiveVisitorStore } from "@/lib/live";

export const dynamic = "force-dynamic";

/** Liveness/readiness endpoint for load balancers and uptime monitors. */
export async function GET() {
  const cache = getCache();

  const [database, cacheOk] = await Promise.all([
    db
      .execute(sql`select 1`)
      .then(() => true)
      .catch(() => false),
    cache.ping().catch(() => false),
  ]);

  return Response.json(
    {
      status: database ? "ok" : "degraded",
      checks: {
        database: database ? "up" : "down",
        cache: { driver: cache.driver, status: cacheOk ? "up" : "down" },
        liveVisitors: { driver: getLiveVisitorStore().driver },
      },
      timestamp: new Date().toISOString(),
    },
    { status: database ? 200 : 503 },
  );
}
