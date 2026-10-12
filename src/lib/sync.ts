// Offline sync queue backed by localStorage (demo implementation).
// In production, this would use IndexedDB with a sync worker.

export type SyncStatus = "PENDING" | "RETRYING" | "SYNCED" | "FAILED";
export type SyncAction = "CREATE" | "UPDATE" | "DELETE";

export interface SyncQueueItem {
  id: string;
  entity: "observation" | "child" | "milestone_assessment" | "message";
  entityId: string;
  action: SyncAction;
  payload: any;
  status: SyncStatus;
  retries: number;
  error: string | null;
  createdAt: string;
  syncedAt: string | null;
}

const STORAGE_KEY = "balsathi_sync_queue";

export function getSyncQueue(): SyncQueueItem[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveQueue(items: SyncQueueItem[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
  window.dispatchEvent(new CustomEvent("sync-queue-updated"));
}

export function addToQueue(item: Omit<SyncQueueItem, "id" | "status" | "retries" | "error" | "createdAt" | "syncedAt">): SyncQueueItem {
  const queueItem: SyncQueueItem = {
    ...item,
    id: `sync_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    status: "PENDING",
    retries: 0,
    error: null,
    createdAt: new Date().toISOString(),
    syncedAt: null,
  };
  const items = getSyncQueue();
  items.unshift(queueItem);
  saveQueue(items);
  return queueItem;
}

export function updateSyncItem(id: string, patch: Partial<SyncQueueItem>) {
  const items = getSyncQueue();
  const idx = items.findIndex((i) => i.id === id);
  if (idx >= 0) {
    items[idx] = { ...items[idx], ...patch };
    saveQueue(items);
  }
}

export function clearSyncQueue() {
  saveQueue([]);
}

async function syncSingle(item: SyncQueueItem): Promise<boolean> {
  // Simulate network sync. In production, POST to the appropriate API endpoint.
  await new Promise((r) => setTimeout(r, 300));
  // Randomly fail some to demonstrate conflict handling (10% failure rate).
  if (Math.random() < 0.1) {
    throw new Error("Network error during sync");
  }
  return true;
}

export interface SyncResult {
  success: number;
  failed: number;
}

export async function syncPendingItems(): Promise<SyncResult> {
  const items = getSyncQueue();
  const pending = items.filter((i) => i.status === "PENDING" || i.status === "RETRYING");
  let success = 0;
  let failed = 0;

  for (const item of pending) {
    updateSyncItem(item.id, { status: "RETRYING" });
    try {
      await syncSingle(item);
      updateSyncItem(item.id, { status: "SYNCED", syncedAt: new Date().toISOString(), error: null });
      success++;
    } catch (e: any) {
      const retries = item.retries + 1;
      if (retries >= 3) {
        updateSyncItem(item.id, { status: "FAILED", retries, error: e.message });
      } else {
        updateSyncItem(item.id, { status: "RETRYING", retries, error: e.message });
      }
      failed++;
    }
  }

  return { success, failed };
}

export function getPendingCount(): number {
  return getSyncQueue().filter((i) => i.status === "PENDING" || i.status === "RETRYING").length;
}
