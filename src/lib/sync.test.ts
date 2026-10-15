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

  it("downgrades legacy simulated synced statuses that have no verifiable server receipt", () => {
    storage.set("balsathi_sync_queue", JSON.stringify([{ id: "legacy", entity: "observation", entityId: "o1", action: "CREATE", payload: {}, status: "SYNCED", retries: 0, error: null, createdAt: new Date().toISOString(), syncedAt: new Date().toISOString() }]));
    expect(getSyncQueue()[0]).toMatchObject({ status: "FAILED", syncedAt: null, error: expect.stringContaining("cannot be verified") });
    expect(JSON.parse(storage.get("balsathi_sync_queue")!)[0].status).toBe("FAILED");
  });
});
