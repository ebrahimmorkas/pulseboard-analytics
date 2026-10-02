import type { CacheStore } from "@/lib/cache/types";

export type RateLimitResult = {
  success: boolean;
  limit: number;
  remaining: number;
  /** Seconds until the current window resets. */
  retryAfter: number;
};

/**
 * Fixed-window rate limiter backed by the cache store, so limits are shared
 * across instances when Redis is configured and per-instance otherwise.
 */
export async function rateLimit(
  store: CacheStore,
  { key, limit, windowSeconds }: { key: string; limit: number; windowSeconds: number },
): Promise<RateLimitResult> {
  const now = Date.now();
  const windowMs = windowSeconds * 1000;
  const windowStart = Math.floor(now / windowMs) * windowMs;
  const retryAfter = Math.ceil((windowStart + windowMs - now) / 1000);

  const count = await store.incr(`ratelimit:${key}:${windowStart}`, windowSeconds);

  return {
    success: count <= limit,
    limit,
    remaining: Math.max(0, limit - count),
    retryAfter,
  };
}
