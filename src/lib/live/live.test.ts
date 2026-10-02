import { describe, expect, it } from "vitest";
import { MemoryLiveVisitorStore } from "./memory-live-store";

describe("MemoryLiveVisitorStore", () => {
  const now = 1_700_000_000_000;

  it("counts distinct visitors within the window", async () => {
    const store = new MemoryLiveVisitorStore();
    await store.touch("site", "a", now - 60_000);
    await store.touch("site", "b", now - 10_000);
    await store.touch("site", "a", now - 5_000); // same visitor again
    await store.touch("other-site", "c", now);

    expect(await store.count("site", 300, now)).toBe(2);
    expect(await store.count("site", 30, now)).toBe(2);
    expect(await store.count("site", 8, now)).toBe(1);
  });

  it("forgets visitors outside the live window", async () => {
    const store = new MemoryLiveVisitorStore();
    await store.touch("site", "old", now - 10 * 60_000);
    await store.touch("site", "new", now);
    expect(await store.count("site", 300, now)).toBe(1);
  });

  it("returns zero for unknown sites", async () => {
    expect(await new MemoryLiveVisitorStore().count("nope", 300)).toBe(0);
  });
});
