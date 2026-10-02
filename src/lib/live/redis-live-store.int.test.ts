import Redis from "ioredis";
import { afterAll, describe, expect, it } from "vitest";
import { RedisLiveVisitorStore } from "./redis-live-store";

const url = process.env.REDIS_URL;

describe.skipIf(!url)("RedisLiveVisitorStore (requires REDIS_URL)", () => {
  const client = new Redis(url!);
  const store = new RedisLiveVisitorStore(client);
  const site = `test-${Date.now()}`;

  afterAll(async () => {
    await client.del(`live:${site}`);
    await client.quit();
  });

  it("counts distinct recent visitors using a sorted set", async () => {
    const now = Date.now();
    // Recorded 20 minutes ago; pruned by the next activity on the site.
    await store.touch(site, "stale", now - 20 * 60_000);
    await store.touch(site, "a", now - 60_000);
    await store.touch(site, "b", now - 1_000);
    await store.touch(site, "a", now);

    expect(await store.count(site, 300, now)).toBe(2);
    expect(await store.count(site, 30, now)).toBe(2);
    expect(await client.zscore(`live:${site}`, "stale")).toBeNull();
  });
});
