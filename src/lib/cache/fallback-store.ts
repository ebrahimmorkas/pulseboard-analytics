import type { CacheStore } from "./types";

/**
 * Wraps a primary store (Redis) and transparently falls back to a secondary
 * store (memory) when the primary throws. A Redis outage therefore degrades
 * caching/rate limiting to per-instance behaviour instead of taking the app down.
 */
export class FallbackStore implements CacheStore {
  private warned = false;

  constructor(
    private readonly primary: CacheStore,
    private readonly fallback: CacheStore,
  ) {}

  get driver() {
    return this.primary.driver;
  }

  get(key: string) {
    return this.run((store) => store.get(key));
  }

  set(key: string, value: string, ttlSeconds: number) {
    return this.run((store) => store.set(key, value, ttlSeconds));
  }

  del(key: string) {
    return this.run((store) => store.del(key));
  }

  incr(key: string, ttlSeconds: number) {
    return this.run((store) => store.incr(key, ttlSeconds));
  }

  async ping() {
    try {
      return await this.primary.ping();
    } catch {
      return false;
    }
  }

  private async run<T>(operation: (store: CacheStore) => Promise<T>): Promise<T> {
    try {
      const result = await operation(this.primary);
      this.warned = false;
      return result;
    } catch (error) {
      if (!this.warned) {
        console.warn(`[cache] ${this.primary.driver} unavailable, using fallback:`, error);
        this.warned = true;
      }
      return operation(this.fallback);
    }
  }
}
