import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { addToQueue, clearSyncQueue, getSyncQueue, syncPendingItems } from "./sync";

const storage = new Map<string, string>();
const localStorageMock = {
  getItem: (key: string) => storage.get(key) ?? null,
  setItem: (key: string, value: string) => { storage.set(key, value); },
  removeItem: (key: string) => { storage.delete(key); },
  clear: () => storage.clear(),
};

beforeEach(() => {
  vi.stubGlobal("localStorage", localStorageMock);
  storage.clear();
});

afterEach(() => {
  clearSyncQueue();
  vi.unstubAllGlobals();
});

describe("offline queue behavior", () => {
  it("never reports an item as synced without a server synchronization implementation", async () => {
    const queued = addToQueue({
      entity: "observation",
      entityId: "observation-1",
      action: "CREATE",
      payload: { observationText: "Queued locally" },
    });

    const result = await syncPendingItems();

    expect(result).toEqual({ success: 0, failed: 1 });
    expect(getSyncQueue().find((item) => item.id === queued.id)).toMatchObject({
      status: "FAILED",
      syncedAt: null,
      error: expect.stringContaining("Automatic sync is unavailable"),
    });
  });
});
