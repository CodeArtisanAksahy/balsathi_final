// Offline sync queue backed by localStorage. Dispatch is disabled until each
// entity has a durable, idempotent server synchronization contract.

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

export interface SyncResult {
  success: number;
  failed: number;
}

export async function syncPendingItems(): Promise<SyncResult> {
  const pending = getSyncQueue().filter((item) => item.status === "PENDING" || item.status === "RETRYING");
  for (const item of pending) {
    updateSyncItem(item.id, {
      status: "FAILED",
      error: "Automatic sync is unavailable. Export or copy this item before clearing the queue.",
    });
  }
  return { success: 0, failed: pending.length };
}

export function getPendingCount(): number {
  return getSyncQueue().filter((i) => i.status === "PENDING" || i.status === "RETRYING").length;
}
