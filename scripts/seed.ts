/**
 * Seeds Pulseboard with a demo account, a public demo site and ~6 weeks of synthetic traffic.
 * Usage: npm run db:seed   (WARNING: wipes existing data)
 */
import { sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "../src/db/schema";
import { hashPassword } from "../src/lib/auth/password";

try {
  process.loadEnvFile();
} catch {
  // No .env file; use the process environment.
}

const DEMO_PASSWORD = "Password123";
const DAYS = 45;
const MINUTE = 60 * 1000;
const DAY = 24 * 60 * MINUTE;

const client = postgres(
  process.env.DATABASE_URL ?? "postgres://pulseboard:pulseboard@localhost:5434/pulseboard",
  { max: 1 },
);
const db = drizzle(client, { schema });

function createRandom(seed: number) {
  return () => {
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const random = createRandom(2026);

/** Picks a value from [value, weight] pairs. */
function weighted<T>(options: readonly (readonly [T, number])[]): T {
  const total = options.reduce((sum, [, weight]) => sum + weight, 0);
  let roll = random() * total;
  for (const [value, weight] of options) {
    roll -= weight;
    if (roll <= 0) return value;
  }
  return options[0]![0];
}

const pages = [
  ["/", 30],
  ["/pricing", 14],
  ["/docs", 12],
  ["/docs/getting-started", 10],
  ["/docs/api-reference", 6],
  ["/blog", 8],
  ["/blog/cookieless-analytics", 7],
  ["/blog/nextjs-performance", 5],
  ["/features", 5],
  ["/changelog", 3],
] as const;

const sources = [
  ["Direct", 30],
  ["Google", 28],
  ["Twitter", 9],
  ["Hacker News", 7],
  ["GitHub", 8],
  ["LinkedIn", 5],
  ["newsletter", 5],
  ["DuckDuckGo", 4],
  ["Reddit", 3],
  ["dev.to", 1],
] as const;

const countries = [
  ["US", 28],
  ["DE", 12],
  ["GB", 10],
  ["IN", 10],
  ["FR", 6],
  ["CA", 6],
  ["NL", 5],
  ["BR", 5],
  ["AU", 4],
  ["JP", 3],
  ["ES", 3],
  [null, 3],
] as const;

type Client = { browser: string; os: string; device: "desktop" | "mobile" | "tablet" };

const clients: readonly (readonly [Client, number])[] = [
  [{ browser: "Chrome", os: "Windows", device: "desktop" }, 30],
  [{ browser: "Chrome", os: "macOS", device: "desktop" }, 14],
  [{ browser: "Safari", os: "macOS", device: "desktop" }, 9],
  [{ browser: "Firefox", os: "Linux", device: "desktop" }, 6],
  [{ browser: "Edge", os: "Windows", device: "desktop" }, 6],
  [{ browser: "Safari", os: "iOS", device: "mobile" }, 17],
  [{ browser: "Chrome", os: "Android", device: "mobile" }, 14],
  [{ browser: "Safari", os: "iOS", device: "tablet" }, 3],
  [{ browser: "Firefox", os: "Windows", device: "desktop" }, 1],
];

/** Share of daily traffic per UTC hour: quiet nights, busy afternoons. */
const hourWeights = [1, 1, 1, 1, 1, 2, 3, 5, 7, 8, 9, 9, 8, 9, 10, 10, 9, 8, 7, 6, 5, 4, 3, 2].map(
  (weight, hour) => [hour, weight] as const,
);

const visitorHex = () =>
  Array.from({ length: 16 }, () => Math.floor(random() * 16).toString(16)).join("");

async function main() {
  console.log("Clearing existing data…");
  await db.execute(sql`truncate table events, sites, sessions, users restart identity cascade`);

  const [user] = await db
    .insert(schema.users)
    .values({
      name: "Demo User",
      email: "demo@pulseboard.dev",
      passwordHash: await hashPassword(DEMO_PASSWORD),
    })
    .returning();

  const [site] = await db
    .insert(schema.sites)
    .values({
      ownerId: user!.id,
      domain: "acme-docs.dev",
      name: "Acme Docs",
      isPublic: true,
      shareSlug: "demo",
    })
    .returning();

  await db.insert(schema.sites).values({
    ownerId: user!.id,
    domain: "blog.acme-docs.dev",
    name: "Acme Blog",
    shareSlug: "acme-blog",
  });

  console.log("Generating traffic…");
  const now = Date.now();
  const startOfToday = Math.floor(now / DAY) * DAY;
  const rows: schema.NewAnalyticsEvent[] = [];

  for (let daysAgo = DAYS - 1; daysAgo >= 0; daysAgo--) {
    const dayStart = startOfToday - daysAgo * DAY;
    const weekday = new Date(dayStart).getUTCDay();
    const weekend = weekday === 0 || weekday === 6;
    // Steady growth, quieter weekends, some noise, and one launch-day spike.
    const growth = 1 + (DAYS - daysAgo) / DAYS;
    const spike = daysAgo === 12 ? 2.4 : 1;
    const visitors = Math.round(
      190 * growth * (weekend ? 0.6 : 1) * spike * (0.85 + random() * 0.3),
    );

    for (let v = 0; v < visitors; v++) {
      const visitorId = visitorHex();
      const source = weighted(sources);
      const country = weighted(countries);
      const device = weighted(clients);
      let at = dayStart + weighted(hourWeights) * 60 * MINUTE + Math.floor(random() * 60) * MINUTE;
      if (at > now) continue;

      // 45% of visits bounce; the rest read 2–6 pages.
      const pageviews = random() < 0.45 ? 1 : 2 + Math.floor(random() * 5);
      let pathname = source === "Hacker News" ? "/blog/cookieless-analytics" : weighted(pages);

      for (let p = 0; p < pageviews && at <= now; p++) {
        rows.push({
          siteId: site!.id,
          visitorId,
          pathname,
          source,
          utmMedium: source === "newsletter" ? "email" : null,
          country,
          ...device,
          createdAt: new Date(at),
        });
        at += (20 + Math.floor(random() * 240)) * 1000;
        pathname = weighted(pages);
      }

      const visitedPricing = pathname === "/pricing" || random() < 0.15;
      if (visitedPricing && random() < 0.22 && at <= now) {
        rows.push({
          siteId: site!.id,
          visitorId,
          type: "custom",
          name: random() < 0.6 ? "Signup" : "Start trial",
          pathname: "/pricing",
          source,
          country,
          ...device,
          createdAt: new Date(at),
        });
      }
      if (random() < 0.04 && at <= now) {
        rows.push({
          siteId: site!.id,
          visitorId,
          type: "custom",
          name: "Newsletter subscribe",
          pathname: "/blog",
          source,
          country,
          ...device,
          createdAt: new Date(at + 5000),
        });
      }
    }
  }

  console.log("Inserting %d events…", rows.length);
  for (let index = 0; index < rows.length; index += 2000) {
    await db.insert(schema.events).values(rows.slice(index, index + 2000));
  }
  await db.execute(sql`analyze events`);

  console.log("\nSeed complete.");
  console.log("  Login:        demo@pulseboard.dev / %s", DEMO_PASSWORD);
  console.log("  Public demo:  /share/demo");
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => client.end());
