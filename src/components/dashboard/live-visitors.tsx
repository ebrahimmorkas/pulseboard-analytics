"use client";

import { useEffect, useState } from "react";

const POLL_MS = 10_000;

/** Polls the live endpoint while the tab is visible and shows a pulsing indicator. */
export function LiveVisitors({ siteId, share }: { siteId: string; share?: string }) {
  const [visitors, setVisitors] = useState<number | null>(null);

  useEffect(() => {
    let cancelled = false;
    const url = `/api/sites/${siteId}/live${share ? `?share=${encodeURIComponent(share)}` : ""}`;

    async function load() {
      if (document.visibilityState !== "visible") return;
      try {
        const response = await fetch(url);
        if (!response.ok) return;
        const data: { visitors: number } = await response.json();
        if (!cancelled) setVisitors(data.visitors);
      } catch {
        // Network hiccup: keep the last known value and try again on the next tick.
      }
    }

    void load();
    const timer = setInterval(load, POLL_MS);
    document.addEventListener("visibilitychange", load);
    return () => {
      cancelled = true;
      clearInterval(timer);
      document.removeEventListener("visibilitychange", load);
    };
  }, [siteId, share]);

  return (
    <span
      className="inline-flex items-center gap-2 rounded-full bg-emerald-50 px-3 py-1 text-sm font-medium text-emerald-700"
      aria-live="polite"
    >
      <span className="relative flex size-2">
        <span className="absolute inline-flex size-full animate-ping rounded-full bg-emerald-400 opacity-75" />
        <span className="relative inline-flex size-2 rounded-full bg-emerald-500" />
      </span>
      {visitors === null ? "…" : visitors} current {visitors === 1 ? "visitor" : "visitors"}
    </span>
  );
}
