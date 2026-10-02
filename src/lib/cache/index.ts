import "server-only";
import { env } from "@/lib/env";
import { FallbackStore } from "./fallback-store";
import { MemoryStore } from "./memory-store";
import { RedisStore } from "./redis-store";
import type { CacheStore } from "./types";

export type { CacheDriver, CacheStore } from "./types";

const globalForCache = globalThis as unknown as {
  cacheStore?: CacheStore;
  redisStore?: RedisStore | null;
};

function getRedisStore(): RedisStore | null {
  if (globalForCache.redisStore === undefined) {
    globalForCache.redisStore = env.REDIS_URL ? new RedisStore(env.REDIS_URL) : null;
    globalForCache.redisStore
      ?.connect()
      .catch((error) => console.warn("[cache] could not connect to Redis:", error));
  }
  return globalForCache.redisStore;
}

/** Shared ioredis connection for other Redis-backed features, or null without Redis. */
export function getRedisClient() {
  return getRedisStore()?.client ?? null;
}

function createStore(): CacheStore {
  const memory = new MemoryStore();
  const redis = getRedisStore();
  return redis ? new FallbackStore(redis, memory) : memory;
}

/** Returns the process-wide cache store: Redis when `REDIS_URL` is set, otherwise memory. */
export function getCache(): CacheStore {
  globalForCache.cacheStore ??= createStore();
  return globalForCache.cacheStore;
}

/**
 * Read-through cache helper. Loads the value with `loader` on a miss and stores it
 * as JSON for `ttlSeconds`. Cache failures never break the request.
 */
export async function cached<T>(
  key: string,
  ttlSeconds: number,
  loader: () => Promise<T>,
): Promise<T> {
  const cache = getCache();
  try {
    const hit = await cache.get(key);
    if (hit !== null) return JSON.parse(hit) as T;
  } catch {
    // fall through to the loader
  }

  const value = await loader();
  cache.set(key, JSON.stringify(value), ttlSeconds).catch(() => {});
  return value;
}

/**
 * Namespaced cache versions allow invalidating a whole group of keys (e.g. every
 * catalog search result) with a single increment, without scanning keys.
 */
export async function getCacheVersion(namespace: string): Promise<string> {
  return (await getCache().get(`version:${namespace}`)) ?? "0";
}

export async function bumpCacheVersion(namespace: string): Promise<void> {
  await getCache().incr(`version:${namespace}`, 60 * 60 * 24 * 30);
}
