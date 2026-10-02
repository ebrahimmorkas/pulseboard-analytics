import Redis from "ioredis";
import type { CacheStore } from "./types";

export class RedisStore implements CacheStore {
  readonly driver = "redis" as const;
  readonly client: Redis;
  private connecting: Promise<void> | null = null;

  constructor(url: string) {
    this.client = new Redis(url, {
      lazyConnect: true,
      maxRetriesPerRequest: 1,
      enableOfflineQueue: false,
      connectTimeout: 2_000,
    });
    // Without a listener ioredis logs unhandled error events on every reconnect attempt.
    this.client.on("error", () => {});
  }

  connect() {
    if (this.client.status === "wait") {
      this.connecting = this.client.connect().finally(() => {
        this.connecting = null;
      });
    }
    return this.connecting ?? Promise.resolve();
  }

  /** Waits for the initial connection so early requests are not rejected by the offline queue. */
  private async ready() {
    if (this.connecting) await this.connecting.catch(() => {});
  }

  async get(key: string) {
    await this.ready();
    return this.client.get(key);
  }

  async set(key: string, value: string, ttlSeconds: number) {
    await this.ready();
    await this.client.set(key, value, "EX", ttlSeconds);
  }

  async del(key: string) {
    await this.ready();
    await this.client.del(key);
  }

  async incr(key: string, ttlSeconds: number) {
    await this.ready();
    const results = await this.client.multi().incr(key).expire(key, ttlSeconds, "NX").exec();
    const [error, value] = results?.[0] ?? [];
    if (error) throw error;
    return Number(value);
  }

  async ping() {
    await this.ready();
    return (await this.client.ping()) === "PONG";
  }
}
