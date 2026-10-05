"use client";

import {
  Area,
  AreaChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { TimeseriesPoint } from "@/lib/queries/stats";
import { compactNumber } from "@/lib/utils";

const dayLabel = new Intl.DateTimeFormat("en-US", {
  month: "short",
  day: "numeric",
  timeZone: "UTC",
});
const hourLabel = new Intl.DateTimeFormat("en-US", { hour: "numeric", timeZone: "UTC" });
const fullLabel = new Intl.DateTimeFormat("en-US", {
  weekday: "short",
  month: "short",
  day: "numeric",
  timeZone: "UTC",
});

export function TrafficChart({
  data,
  bucket,
}: {
  data: TimeseriesPoint[];
  bucket: "hour" | "day";
}) {
  const tick = (value: string) =>
    (bucket === "hour" ? hourLabel : dayLabel).format(new Date(value));
  const tooltipLabel = (value: string) =>
    bucket === "hour"
      ? `${fullLabel.format(new Date(value))}, ${hourLabel.format(new Date(value))} UTC`
      : fullLabel.format(new Date(value));

  return (
    <div className="h-80">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
          <defs>
            <linearGradient id="visitorsFill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#7c3aed" stopOpacity={0.3} />
              <stop offset="100%" stopColor="#7c3aed" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
          <XAxis
            dataKey="bucket"
            tickFormatter={tick}
            tick={{ fontSize: 12, fill: "#64748b" }}
            tickLine={false}
            axisLine={false}
            minTickGap={28}
          />
          <YAxis
            tickFormatter={(value: number) => compactNumber(value)}
            tick={{ fontSize: 12, fill: "#64748b" }}
            tickLine={false}
            axisLine={false}
            width={44}
            allowDecimals={false}
          />
          <Tooltip
            labelFormatter={(value) => tooltipLabel(String(value))}
            formatter={(value, name) => [Number(value).toLocaleString(), name]}
          />
          <Legend verticalAlign="top" align="right" height={32} iconType="plainline" />
          <Area
            type="monotone"
            dataKey="pageviews"
            name="Pageviews"
            stroke="#94a3b8"
            strokeWidth={2}
            strokeDasharray="4 4"
            fill="none"
          />
          <Area
            type="monotone"
            dataKey="visitors"
            name="Unique visitors"
            stroke="#7c3aed"
            strokeWidth={2}
            fill="url(#visitorsFill)"
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
