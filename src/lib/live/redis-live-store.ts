import type Redis from "ioredis";
import { LIVE_WINDOW_SECONDS, type LiveVisitorStore } from "./types";

/**
 * Live visitors in a Redis sorted set per site: member = visitor id, score = last seen.
 * ZADD updates the score, ZREMRANGEBYSCORE trims old visitors, ZCOUNT counts a window.
 * Shared by every app instance, unlike the in-memory store.
 */
export class RedisLiveVisitorStore implements LiveVisitorStore {
  readonly driver = "redis" as const;

  constructor(private readonly client: Redis) {}

  private key(siteId: string) {
    return `live:${siteId}`;
  }

  async touch(siteId: string, visitorId: string, at = Date.now()) {
    const key = this.key(siteId);
    await this.client
      .multi()
      .zadd(key, at, visitorId)
      .zremrangebyscore(key, 0, at - LIVE_WINDOW_SECONDS * 1000)
      // The whole set expires if a site receives no traffic for a while.
      .expire(key, LIVE_WINDOW_SECONDS * 2)
      .exec();
  }

  async count(siteId: string, windowSeconds: number, now = Date.now()) {
    return this.client.zcount(this.key(siteId), now - windowSeconds * 1000, "+inf");
  }
}
