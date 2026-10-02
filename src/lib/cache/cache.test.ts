import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { rateLimit } from "@/lib/rate-limit";
import { FallbackStore } from "./fallback-store";
import { MemoryStore } from "./memory-store";
import type { CacheStore } from "./types";

describe("MemoryStore", () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it("stores and expires values", async () => {
    const store = new MemoryStore();
    await store.set("greeting", "hello", 10);
    expect(await store.get("greeting")).toBe("hello");

    vi.advanceTimersByTime(10_001);
    expect(await store.get("greeting")).toBeNull();
  });

  it("increments counters and keeps the original expiry", async () => {
    const store = new MemoryStore();
    expect(await store.incr("hits", 5)).toBe(1);
    vi.advanceTimersByTime(3_000);
    expect(await store.incr("hits", 5)).toBe(2);
    vi.advanceTimersByTime(2_001);
    expect(await store.incr("hits", 5)).toBe(1);
  });

  it("evicts the oldest entries beyond the size limit", async () => {
    const store = new MemoryStore(2);
    await store.set("a", "1", 60);
    await store.set("b", "2", 60);
    await store.set("c", "3", 60);
    expect(store.size).toBe(2);
    expect(await store.get("a")).toBeNull();
    expect(await store.get("c")).toBe("3");
  });
});

describe("FallbackStore", () => {
  it("uses the fallback store when the primary fails", async () => {
    const failing: CacheStore = {
      driver: "redis",
      get: () => Promise.reject(new Error("down")),
      set: () => Promise.reject(new Error("down")),
      del: () => Promise.reject(new Error("down")),
      incr: () => Promise.reject(new Error("down")),
      ping: () => Promise.reject(new Error("down")),
    };
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    const store = new FallbackStore(failing, new MemoryStore());

    await store.set("key", "value", 60);
    expect(await store.get("key")).toBe("value");
    expect(await store.ping()).toBe(false);
    expect(warn).toHaveBeenCalledOnce();
    warn.mockRestore();
  });
});

describe("rateLimit", () => {
  it("blocks requests over the limit within a window", async () => {
    const store = new MemoryStore();
    const options = { key: "login:127.0.0.1", limit: 3, windowSeconds: 60 };

    const results = [];
    for (let i = 0; i < 4; i++) results.push(await rateLimit(store, options));

    expect(results.map((r) => r.success)).toEqual([true, true, true, false]);
    expect(results[2].remaining).toBe(0);
    expect(results[3].retryAfter).toBeGreaterThan(0);
  });
});
