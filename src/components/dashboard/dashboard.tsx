import Link from "next/link";
import { ArrowDownRight, ArrowUpRight, Minus, X } from "lucide-react";
import {
  getBreakdown,
  getGoals,
  getSummary,
  getTimeseries,
  type Summary,
} from "@/lib/queries/stats";
import {
  PERIODS,
  dashboardHref,
  resolveRange,
  type Period,
  type StatsFilters,
} from "@/lib/stats/period";
import { cn, compactNumber, formatDuration, formatPercent, percentChange } from "@/lib/utils";
import { BreakdownCard } from "./breakdown-card";
import { TrafficChart } from "./traffic-chart";

const regionNames = new Intl.DisplayNames(["en"], { type: "region" });

function countryLabel(code: string) {
  if (code === "??") return "Unknown";
  const flag = String.fromCodePoint(...[...code].map((char) => 0x1f1a5 + char.charCodeAt(0)));
  let name = code;
  try {
    name = regionNames.of(code) ?? code;
  } catch {
    // Unknown region code; show it as-is.
  }
  return `${flag} ${name}`;
}

function Change({ value, invert = false }: { value: number | null; invert?: boolean }) {
  if (value === null) return <span className="text-xs text-slate-400">new</span>;
  if (value === 0) {
    return (
      <span className="inline-flex items-center text-xs text-slate-500">
        <Minus className="size-3" aria-hidden /> 0%
      </span>
    );
  }
  // For bounce rate a decrease is good news.
  const good = invert ? value < 0 : value > 0;
  const Icon = value > 0 ? ArrowUpRight : ArrowDownRight;
  return (
    <span
      className={cn(
        "inline-flex items-center text-xs font-medium",
        good ? "text-emerald-600" : "text-red-600",
      )}
    >
      <Icon className="size-3.5" aria-hidden /> {Math.abs(value)}%
    </span>
  );
}

function kpis(current: Summary, previous: Summary) {
  return [
    {
      label: "Unique visitors",
      value: compactNumber(current.visitors),
      change: percentChange(current.visitors, previous.visitors),
    },
    {
      label: "Total pageviews",
      value: compactNumber(current.pageviews),
      change: percentChange(current.pageviews, previous.pageviews),
    },
    {
      label: "Bounce rate",
      value: formatPercent(current.bounceRate),
      change: percentChange(Math.round(current.bounceRate), Math.round(previous.bounceRate)),
      invert: true,
    },
    {
      label: "Visit duration",
      value: formatDuration(current.avgDuration),
      change: percentChange(Math.round(current.avgDuration), Math.round(previous.avgDuration)),
    },
  ];
}

/**
 * The analytics dashboard. Rendered on the server for both the owner's view and
 * public share links; `basePath` decides where period and filter links point.
 */
export async function Dashboard({
  siteId,
  basePath,
  period,
  filters,
  headerSlot,
}: {
  siteId: string;
  basePath: string;
  period: Period;
  filters: StatsFilters;
  headerSlot?: React.ReactNode;
}) {
  const range = resolveRange(period);
  const state = { period, filters };
  const href = (changes: Parameters<typeof dashboardHref>[2]) =>
    dashboardHref(basePath, state, changes);

  // All queries run in parallel; each is cached for a few seconds in Redis or memory.
  const [current, previous, series, pages, sources, countries, browsers, systems, devices, goals] =
    await Promise.all([
      getSummary(siteId, range.from, range.to, filters),
      getSummary(siteId, range.previousFrom, range.from, filters),
      getTimeseries(siteId, range, filters),
      getBreakdown(siteId, "page", range.from, range.to, filters),
      getBreakdown(siteId, "source", range.from, range.to, filters),
      getBreakdown(siteId, "country", range.from, range.to, filters),
      getBreakdown(siteId, "browser", range.from, range.to, filters, 5),
      getBreakdown(siteId, "os", range.from, range.to, filters, 5),
      getBreakdown(siteId, "device", range.from, range.to, filters, 3),
      getGoals(siteId, range.from, range.to, filters),
    ]);

  const activeFilters = Object.entries(filters) as [keyof StatsFilters, string][];

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        {headerSlot}
        <nav
          className="flex rounded-lg border border-slate-200 bg-white p-1 text-sm"
          aria-label="Period"
        >
          {(Object.keys(PERIODS) as Period[]).map((key) => (
            <Link
              key={key}
              href={href({ period: key })}
              scroll={false}
              className={cn(
                "rounded-md px-3 py-1.5 font-medium text-slate-600 hover:text-slate-900",
                key === period && "bg-brand-600 text-white hover:text-white",
              )}
            >
              {PERIODS[key]}
            </Link>
          ))}
        </nav>
      </div>

      {activeFilters.length > 0 && (
        <div className="flex flex-wrap items-center gap-2 text-sm">
          <span className="text-slate-500">Filtered by</span>
          {activeFilters.map(([key, value]) => (
            <Link
              key={key}
              href={href({ [key]: undefined })}
              scroll={false}
              className="inline-flex items-center gap-1.5 rounded-full bg-brand-100 px-3 py-1 font-medium text-brand-700 hover:bg-brand-50"
            >
              {key}: {key === "country" ? countryLabel(value) : value}
              <X className="size-3.5" aria-label="Remove filter" />
            </Link>
          ))}
        </div>
      )}

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {kpis(current, previous).map((kpi) => (
          <div
            key={kpi.label}
            className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm"
          >
            <p className="text-xs font-medium tracking-wide text-slate-500 uppercase">
              {kpi.label}
            </p>
            <div className="mt-2 flex items-baseline justify-between gap-2">
              <p className="text-3xl font-bold text-slate-900 tabular-nums">{kpi.value}</p>
              <Change value={kpi.change} invert={kpi.invert} />
            </div>
            <p className="mt-1 text-xs text-slate-400">vs. previous period</p>
          </div>
        ))}
      </div>

      <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <TrafficChart data={series} bucket={range.bucket} />
      </section>

      <div className="grid gap-4 lg:grid-cols-2">
        <BreakdownCard title="Top pages" rows={pages} hrefFor={(value) => href({ page: value })} />
        <BreakdownCard
          title="Top sources"
          rows={sources}
          hrefFor={(value) => href({ source: value })}
        />
        <BreakdownCard
          title="Countries"
          rows={countries}
          label={countryLabel}
          hrefFor={(value) => (value === "??" ? href({}) : href({ country: value }))}
        />
        <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="mb-3 font-semibold text-slate-900">Goal conversions</h2>
          {goals.length === 0 ? (
            <p className="py-8 text-center text-sm text-slate-400">
              No custom events yet. Call <code>window.pulseboard(&quot;Signup&quot;)</code> to track
              one.
            </p>
          ) : (
            <table className="w-full text-sm">
              <thead className="text-xs text-slate-500 uppercase">
                <tr>
                  <th className="pb-2 text-left font-medium">Goal</th>
                  <th className="pb-2 text-right font-medium">Uniques</th>
                  <th className="pb-2 text-right font-medium">Total</th>
                  <th className="pb-2 text-right font-medium">CR</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {goals.map((goal) => (
                  <tr key={goal.name}>
                    <td className="py-2 text-slate-800">{goal.name}</td>
                    <td className="py-2 text-right tabular-nums">{compactNumber(goal.visitors)}</td>
                    <td className="py-2 text-right tabular-nums">
                      {compactNumber(goal.conversions)}
                    </td>
                    <td className="py-2 text-right font-medium text-brand-700 tabular-nums">
                      {current.visitors === 0
                        ? "–"
                        : `${((goal.visitors / current.visitors) * 100).toFixed(1)}%`}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </section>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <BreakdownCard title="Browsers" rows={browsers} />
        <BreakdownCard title="Operating systems" rows={systems} />
        <BreakdownCard
          title="Devices"
          rows={devices}
          label={(value) => value.charAt(0).toUpperCase() + value.slice(1)}
        />
      </div>
    </div>
  );
}
