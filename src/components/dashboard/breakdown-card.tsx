import Link from "next/link";
import type { BreakdownRow } from "@/lib/queries/stats";
import { compactNumber } from "@/lib/utils";

/**
 * Ranked list with proportional bars. When `hrefFor` is given, each row is a link
 * that filters the whole dashboard by that value.
 */
export function BreakdownCard({
  title,
  metricLabel = "Visitors",
  rows,
  label = (value) => value,
  hrefFor,
}: {
  title: string;
  metricLabel?: string;
  rows: BreakdownRow[];
  label?: (value: string) => React.ReactNode;
  hrefFor?: (value: string) => string;
}) {
  const max = Math.max(1, ...rows.map((row) => row.visitors));

  return (
    <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="font-semibold text-slate-900">{title}</h2>
        <span className="text-xs font-medium tracking-wide text-slate-500 uppercase">
          {metricLabel}
        </span>
      </div>

      {rows.length === 0 ? (
        <p className="py-8 text-center text-sm text-slate-400">No data for this period</p>
      ) : (
        <ul className="space-y-1.5">
          {rows.map((row) => {
            const content = (
              <>
                <span
                  className="absolute inset-y-0 left-0 rounded-md bg-brand-50"
                  style={{ width: `${(row.visitors / max) * 100}%` }}
                  aria-hidden
                />
                <span className="relative truncate text-slate-800">{label(row.value)}</span>
                <span className="relative font-medium text-slate-900 tabular-nums">
                  {compactNumber(row.visitors)}
                </span>
              </>
            );
            const className =
              "relative flex items-center justify-between gap-3 overflow-hidden rounded-md px-2.5 py-1.5 text-sm";
            return (
              <li key={row.value}>
                {hrefFor ? (
                  <Link
                    href={hrefFor(row.value)}
                    scroll={false}
                    className={`${className} hover:ring-1 hover:ring-brand-500`}
                    title={`Filter by ${row.value}`}
                  >
                    {content}
                  </Link>
                ) : (
                  <div className={className}>{content}</div>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
