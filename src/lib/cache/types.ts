export type CacheDriver = "redis" | "memory";

/**
 * Minimal key/value contract shared by the Redis and in-memory implementations.
 * Values are strings; JSON (de)serialisation happens in the helpers on top.
 */
export interface CacheStore {
  readonly driver: CacheDriver;
  get(key: string): Promise<string | null>;
  set(key: string, value: string, ttlSeconds: number): Promise<void>;
  del(key: string): Promise<void>;
  /** Atomically increments a counter, starting a TTL when the key is first created. */
  incr(key: string, ttlSeconds: number): Promise<number>;
  ping(): Promise<boolean>;
}
