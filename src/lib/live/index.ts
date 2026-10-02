import "server-only";
import { getRedisClient } from "@/lib/cache";
import { MemoryLiveVisitorStore } from "./memory-live-store";
import { RedisLiveVisitorStore } from "./redis-live-store";
import { LIVE_WINDOW_SECONDS, type LiveVisitorStore } from "./types";

export { LIVE_WINDOW_SECONDS };

const globalForLive = globalThis as unknown as { liveVisitors?: LiveVisitorStore };

/**
 * Redis sorted sets when Redis is configured (accurate across instances),
 * otherwise an in-memory map. Redis errors fall back to the memory store.
 */
export function getLiveVisitorStore(): LiveVisitorStore {
  if (globalForLive.liveVisitors) return globalForLive.liveVisitors;

  const memory = new MemoryLiveVisitorStore();
  const client = getRedisClient();
  if (!client) {
    globalForLive.liveVisitors = memory;
    return memory;
  }

  const redis = new RedisLiveVisitorStore(client);
  globalForLive.liveVisitors = {
    driver: "redis",
    touch: (siteId, visitorId, at) =>
      redis.touch(siteId, visitorId, at).catch(() => memory.touch(siteId, visitorId, at)),
    count: (siteId, windowSeconds, now) =>
      redis.count(siteId, windowSeconds, now).catch(() => memory.count(siteId, windowSeconds, now)),
  };
  return globalForLive.liveVisitors;
}
