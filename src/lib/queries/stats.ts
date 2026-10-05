import "server-only";
import { sql, type SQL } from "drizzle-orm";
import { db } from "@/db";
import { cached } from "@/lib/cache";
import type { DateRange, StatsFilters } from "@/lib/stats/period";

/** A gap longer than this between two pageviews starts a new session (industry convention). */
const SESSION_TIMEOUT = sql`interval '30 minutes'`;
const CACHE_SECONDS = 30;

export type Summary = {
  visitors: number;
  pageviews: number;
  sessions: number;
  bounceRate: number;
  avgDuration: number;
};

export type TimeseriesPoint = { bucket: string; visitors: number; pageviews: number };
export type BreakdownRow = { value: string; visitors: number; pageviews: number };
export type GoalRow = { name: string; conversions: number; visitors: number };

/** Dimensions are mapped to column names here, never taken from user input. */
const DIMENSIONS = {
  page: sql`pathname`,
  source: sql`source`,
  country: sql`coalesce(country, '??')`,
  browser: sql`browser`,
  os: sql`os`,
  device: sql`device::text`,
} as const;

export type Dimension = keyof typeof DIMENSIONS;

function filterSql(filters: StatsFilters): SQL {
  const parts: SQL[] = [];
  if (filters.page) parts.push(sql`and pathname = ${filters.page}`);
  if (filters.source) parts.push(sql`and source = ${filters.source}`);
  if (filters.country) parts.push(sql`and country = ${filters.country}`);
  return sql.join(parts, sql` `);
}

const iso = (date: Date) => date.toISOString();
const cacheKey = (
  name: string,
  siteId: string,
  from: Date,
  to: Date,
  filters: StatsFilters,
  extra = "",
) => `stats:${name}:${siteId}:${iso(from)}:${iso(to)}:${JSON.stringify(filters)}:${extra}`;

/**
 * Headline metrics for a time range.
 *
 * Sessions are reconstructed in SQL with window functions: LAG() finds the gap to a
 * visitor's previous pageview, a gap above 30 minutes marks a new session, and a running
 * SUM() of those markers numbers the sessions. From there:
 *   bounce rate    = sessions with exactly one pageview / sessions
 *   visit duration = time between a session's first and last pageview
 */
export async function getSummary(
  siteId: string,
  from: Date,
  to: Date,
  filters: StatsFilters = {},
): Promise<Summary> {
  return cached(cacheKey("summary", siteId, from, to, filters), CACHE_SECONDS, async () => {
    const [row] = await db.execute<{
      visitors: string;
      pageviews: string;
      sessions: string;
      bounces: string;
      avg_duration: string;
    }>(sql`
      with views as (
        select visitor_id, created_at,
               lag(created_at) over (partition by visitor_id order by created_at) as previous_at
        from events
        where site_id = ${siteId} and type = 'pageview'
          and created_at >= ${iso(from)}::timestamptz and created_at < ${iso(to)}::timestamptz
          ${filterSql(filters)}
      ),
      numbered as (
        select visitor_id, created_at,
               sum(case when previous_at is null or created_at - previous_at > ${SESSION_TIMEOUT}
                        then 1 else 0 end)
                 over (partition by visitor_id order by created_at) as session_number
        from views
      ),
      sessions as (
        select visitor_id, session_number, count(*) as pageviews,
               extract(epoch from max(created_at) - min(created_at)) as duration
        from numbered
        group by visitor_id, session_number
      )
      select
        (select count(distinct visitor_id) from views)      as visitors,
        (select count(*) from views)                        as pageviews,
        count(*)                                            as sessions,
        count(*) filter (where pageviews = 1)               as bounces,
        coalesce(avg(duration), 0)                          as avg_duration
      from sessions
    `);

    const sessions = Number(row?.sessions ?? 0);
    return {
      visitors: Number(row?.visitors ?? 0),
      pageviews: Number(row?.pageviews ?? 0),
      sessions,
      bounceRate: sessions === 0 ? 0 : (Number(row?.bounces ?? 0) / sessions) * 100,
      avgDuration: Number(row?.avg_duration ?? 0),
    };
  });
}

/** Visitors and pageviews per hour or day. generate_series fills buckets without traffic. */
export async function getTimeseries(
  siteId: string,
  range: DateRange,
  filters: StatsFilters = {},
): Promise<TimeseriesPoint[]> {
  const { from, to, bucket } = range;
  return cached(cacheKey("series", siteId, from, to, filters, bucket), CACHE_SECONDS, async () => {
    const step = bucket === "hour" ? sql`interval '1 hour'` : sql`interval '1 day'`;
    const unit = bucket === "hour" ? sql`'hour'` : sql`'day'`;

    const rows = await db.execute<{ bucket: string; visitors: string; pageviews: string }>(sql`
      with buckets as (
        select generate_series(
          ${iso(from)}::timestamptz, ${iso(to)}::timestamptz - ${step}, ${step}
        ) as bucket
      ),
      stats as (
        select date_trunc(${unit}, created_at, 'UTC') as bucket,
               count(distinct visitor_id) as visitors, count(*) as pageviews
        from events
        where site_id = ${siteId} and type = 'pageview'
          and created_at >= ${iso(from)}::timestamptz and created_at < ${iso(to)}::timestamptz
          ${filterSql(filters)}
        group by 1
      )
      select to_char(b.bucket at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS"Z"') as bucket,
             coalesce(s.visitors, 0) as visitors, coalesce(s.pageviews, 0) as pageviews
      from buckets b left join stats s using (bucket)
      order by b.bucket
    `);

    return rows.map((row) => ({
      bucket: row.bucket,
      visitors: Number(row.visitors),
      pageviews: Number(row.pageviews),
    }));
  });
}

/** Top values of one dimension (pages, sources, countries, …) ranked by unique visitors. */
export async function getBreakdown(
  siteId: string,
  dimension: Dimension,
  from: Date,
  to: Date,
  filters: StatsFilters = {},
  limit = 8,
): Promise<BreakdownRow[]> {
  return cached(
    cacheKey("breakdown", siteId, from, to, filters, `${dimension}:${limit}`),
    CACHE_SECONDS,
    async () => {
      const rows = await db.execute<{ value: string; visitors: string; pageviews: string }>(sql`
      select ${DIMENSIONS[dimension]} as value,
             count(distinct visitor_id) as visitors, count(*) as pageviews
      from events
      where site_id = ${siteId} and type = 'pageview'
        and created_at >= ${iso(from)}::timestamptz and created_at < ${iso(to)}::timestamptz
        ${filterSql(filters)}
      group by 1
      order by visitors desc, pageviews desc
      limit ${limit}
    `);
      return rows.map((row) => ({
        value: row.value,
        visitors: Number(row.visitors),
        pageviews: Number(row.pageviews),
      }));
    },
  );
}

/** Custom events (goals) with total conversions and unique converting visitors. */
export async function getGoals(
  siteId: string,
  from: Date,
  to: Date,
  filters: StatsFilters = {},
): Promise<GoalRow[]> {
  return cached(cacheKey("goals", siteId, from, to, filters), CACHE_SECONDS, async () => {
    const rows = await db.execute<{ name: string; conversions: string; visitors: string }>(sql`
      select name, count(*) as conversions, count(distinct visitor_id) as visitors
      from events
      where site_id = ${siteId} and type = 'custom'
        and created_at >= ${iso(from)}::timestamptz and created_at < ${iso(to)}::timestamptz
        ${filterSql(filters)}
      group by name
      order by conversions desc
      limit 10
    `);
    return rows.map((row) => ({
      name: row.name,
      conversions: Number(row.conversions),
      visitors: Number(row.visitors),
    }));
  });
}
