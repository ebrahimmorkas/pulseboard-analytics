/** Tracks which visitors were active on a site recently ("current visitors"). */
export interface LiveVisitorStore {
  readonly driver: "redis" | "memory";
  /** Records activity for a visitor at the given time (ms since epoch). */
  touch(siteId: string, visitorId: string, at?: number): Promise<void>;
  /** Number of distinct visitors active within the last `windowSeconds`. */
  count(siteId: string, windowSeconds: number, now?: number): Promise<number>;
}

/** A visitor counts as "current" if they were active in the last five minutes. */
export const LIVE_WINDOW_SECONDS = 5 * 60;
