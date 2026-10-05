export const PERIODS = {
  today: "Today",
  "7d": "Last 7 days",
  "30d": "Last 30 days",
  "90d": "Last 90 days",
} as const;

export type Period = keyof typeof PERIODS;

export type DateRange = {
  period: Period;
  from: Date;
  to: Date;
  /** Start of the equally long period immediately before `from`, for comparisons. */
  previousFrom: Date;
  bucket: "hour" | "day";
};

const DAY = 24 * 60 * 60 * 1000;

export function parsePeriod(value: string | string[] | undefined): Period {
  const candidate = Array.isArray(value) ? value[0] : value;
  return candidate && candidate in PERIODS ? (candidate as Period) : "7d";
}

function startOfUtcDay(date: Date) {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
}

/**
 * Resolves a period into concrete UTC boundaries. Multi-day periods end at the end of
 * the current day and are bucketed by day; "today" is bucketed by hour.
 */
export function resolveRange(period: Period, now: Date = new Date()): DateRange {
  const today = startOfUtcDay(now);
  const to = new Date(today.getTime() + DAY);

  if (period === "today") {
    return {
      period,
      from: today,
      to,
      previousFrom: new Date(today.getTime() - DAY),
      bucket: "hour",
    };
  }

  const days = Number(period.replace("d", ""));
  const from = new Date(to.getTime() - days * DAY);
  return { period, from, to, previousFrom: new Date(from.getTime() - days * DAY), bucket: "day" };
}

export type StatsFilters = { page?: string; source?: string; country?: string };

const first = (value: string | string[] | undefined) => (Array.isArray(value) ? value[0] : value);

export function parseFilters(params: Record<string, string | string[] | undefined>): StatsFilters {
  const page = first(params.page)?.slice(0, 512);
  const source = first(params.source)?.slice(0, 255);
  const country = first(params.country)?.toUpperCase();
  return {
    ...(page?.startsWith("/") && { page }),
    ...(source && { source }),
    ...(country && /^[A-Z]{2}$/.test(country) && { country }),
  };
}

/** Builds a dashboard URL, keeping the current period and filters and applying `changes`. */
export function dashboardHref(
  basePath: string,
  current: { period: Period; filters: StatsFilters },
  changes: Partial<StatsFilters> & { period?: Period } = {},
) {
  const { period = current.period, ...filterChanges } = changes;
  const filters = { ...current.filters, ...filterChanges };
  const params = new URLSearchParams();
  if (period !== "7d") params.set("period", period);
  for (const [key, value] of Object.entries(filters)) if (value) params.set(key, value);
  const query = params.toString();
  return query ? `${basePath}?${query}` : basePath;
}
