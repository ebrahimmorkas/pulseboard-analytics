import type { CacheStore } from "./types";

type Entry = { value: string; expiresAt: number };

/**
 * In-process cache used when Redis is not configured (or unavailable).
 * Entries expire lazily on read and the oldest entries are evicted once
 * `maxEntries` is reached, so memory usage stays bounded.
 */
export class MemoryStore implements CacheStore {
  readonly driver = "memory" as const;
  private readonly entries = new Map<string, Entry>();

  constructor(private readonly maxEntries = 5_000) {}

  async get(key: string) {
    return this.read(key)?.value ?? null;
  }

  async set(key: string, value: string, ttlSeconds: number) {
    this.write(key, { value, expiresAt: Date.now() + ttlSeconds * 1000 });
  }

  async del(key: string) {
    this.entries.delete(key);
  }

  async incr(key: string, ttlSeconds: number) {
    const current = this.read(key);
    const next = (current ? Number(current.value) : 0) + 1;
    this.write(key, {
      value: String(next),
      expiresAt: current?.expiresAt ?? Date.now() + ttlSeconds * 1000,
    });
    return next;
  }

  async ping() {
    return true;
  }

  get size() {
    return this.entries.size;
  }

  private read(key: string) {
    const entry = this.entries.get(key);
    if (!entry) return undefined;
    if (entry.expiresAt <= Date.now()) {
      this.entries.delete(key);
      return undefined;
    }
    return entry;
  }

  private write(key: string, entry: Entry) {
    // Re-inserting moves the key to the end, keeping Map order roughly LRU.
    this.entries.delete(key);
    this.entries.set(key, entry);
    if (this.entries.size > this.maxEntries) {
      const oldest = this.entries.keys().next().value;
      if (oldest !== undefined) this.entries.delete(oldest);
    }
  }
}
