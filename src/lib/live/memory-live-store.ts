import { LIVE_WINDOW_SECONDS, type LiveVisitorStore } from "./types";

/** In-process live visitor tracking: one map of visitor → last seen per site. */
export class MemoryLiveVisitorStore implements LiveVisitorStore {
  readonly driver = "memory" as const;
  private readonly sites = new Map<string, Map<string, number>>();

  async touch(siteId: string, visitorId: string, at = Date.now()) {
    let visitors = this.sites.get(siteId);
    if (!visitors) {
      visitors = new Map();
      this.sites.set(siteId, visitors);
    }
    visitors.set(visitorId, at);
    this.prune(visitors, at - LIVE_WINDOW_SECONDS * 1000);
  }

  async count(siteId: string, windowSeconds: number, now = Date.now()) {
    const visitors = this.sites.get(siteId);
    if (!visitors) return 0;
    const since = now - windowSeconds * 1000;
    let total = 0;
    for (const lastSeen of visitors.values()) if (lastSeen >= since) total++;
    return total;
  }

  /** Drop stale entries so memory does not grow with every visitor ever seen. */
  private prune(visitors: Map<string, number>, before: number) {
    for (const [visitorId, lastSeen] of visitors) {
      if (lastSeen < before) visitors.delete(visitorId);
    }
  }
}
