"use client";

import { useState, useEffect } from "react";
import { Wifi, WifiOff, RefreshCw, CheckCircle2, AlertCircle, Database, Clock } from "lucide-react";
import type { SyncQueueItem } from "@/lib/sync";
import { getSyncQueue, syncPendingItems, clearSyncQueue } from "@/lib/sync";
import { cn } from "@/lib/utils";

export default function OfflinePage() {
  const [online, setOnline] = useState(typeof navigator !== "undefined" ? navigator.onLine : true);
  const [queue, setQueue] = useState<SyncQueueItem[]>([]);
  const [syncing, setSyncing] = useState(false);
  const [lastSync, setLastSync] = useState<string | null>(null);

  useEffect(() => {
    const handleOnline = () => setOnline(true);
    const handleOffline = () => setOnline(false);
    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);
    setQueue(getSyncQueue());
    const saved = localStorage.getItem("balsathi_last_sync");
    if (saved) queueMicrotask(() => setLastSync(saved));
    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  function refreshQueue() {
    setQueue(getSyncQueue());
  }

  async function runSync() {
    if (!online) return;
    setSyncing(true);
    try {
      const result = await syncPendingItems();
      refreshQueue();
      if (result.success) {
        const now = new Date().toLocaleString();
        setLastSync(now);
        localStorage.setItem("balsathi_last_sync", now);
      }
    } finally {
      setSyncing(false);
    }
  }

  const pendingCount = queue.filter((q) => q.status === "PENDING" || q.status === "RETRYING").length;
  const failedCount = queue.filter((q) => q.status === "FAILED").length;
  const syncedCount = queue.filter((q) => q.status === "SYNCED").length;

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-stone-800">Offline Data & Sync</h1>

      {/* Status banner */}
      <div className={cn(
        "card p-5 flex items-center gap-4",
        online ? "bg-forest/5 border-forest/20" : "bg-amber-50 border-amber-200",
      )}>
        <div className={cn(
          "w-12 h-12 rounded-full flex items-center justify-center",
          online ? "bg-forest/15 text-forest" : "bg-amber-100 text-amber-600",
        )}>
          {online ? <Wifi className="w-6 h-6" /> : <WifiOff className="w-6 h-6" />}
        </div>
        <div className="flex-1">
          <h3 className="font-semibold text-stone-800">{online ? "Online" : "Offline Mode"}</h3>
          <p className="text-sm text-stone-500">
            {online
              ? "You are connected. Data will sync automatically."
              : "No internet. Observations will be saved locally and synced when reconnected."}
          </p>
        </div>
        <button onClick={runSync} disabled={!online || syncing || pendingCount === 0} className="btn-primary">
          {syncing ? <RefreshCw className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
          Sync Now ({pendingCount})
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        <StatCard icon={Clock} label="Pending" value={pendingCount} color="bg-amber-100 text-amber-600" />
        <StatCard icon={CheckCircle2} label="Synced" value={syncedCount} color="bg-forest/10 text-forest" />
        <StatCard icon={AlertCircle} label="Failed" value={failedCount} color="bg-risk-red-light text-risk-red" />
      </div>

      {lastSync && (
        <p className="text-sm text-stone-500">Last successful sync: {lastSync}</p>
      )}

      {/* Queue */}
      <div className="card p-5">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold text-stone-800">Sync Queue</h3>
          {failedCount > 0 && (
            <button onClick={clearSyncQueue} className="text-sm text-stone-400 hover:text-risk-red">Clear all</button>
          )}
        </div>
        <div className="space-y-2">
          {queue.length === 0 && (
            <p className="text-sm text-stone-400 text-center py-6">
              <Database className="w-8 h-8 mx-auto mb-2 text-stone-300" />
              No pending sync items. All data is up to date.
            </p>
          )}
          {queue.map((item) => (
            <div key={item.id} className="flex items-center gap-3 p-3 rounded-xl bg-stone-50">
              <StatusIcon status={item.status} />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-stone-700 capitalize">{item.entity} — {item.action}</p>
                <p className="text-xs text-stone-400">{new Date(item.createdAt).toLocaleString()}</p>
                {item.error && <p className="text-xs text-risk-red mt-0.5">{item.error}</p>}
              </div>
              <span className={cn("badge", statusBadge(item.status))}>{item.status}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function StatCard({ icon: Icon, label, value, color }: { icon: any; label: string; value: number; color: string }) {
  return (
    <div className="card p-4">
      <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center mb-2", color)}>
        <Icon className="w-5 h-5" />
      </div>
      <div className="text-2xl font-bold text-stone-800">{value}</div>
      <div className="text-xs text-stone-500">{label}</div>
    </div>
  );
}

function StatusIcon({ status }: { status: string }) {
  if (status === "SYNCED") return <CheckCircle2 className="w-5 h-5 text-forest" />;
  if (status === "FAILED") return <AlertCircle className="w-5 h-5 text-risk-red" />;
  return <Clock className="w-5 h-5 text-amber-500" />;
}

function statusBadge(status: string) {
  switch (status) {
    case "SYNCED": return "bg-forest/10 text-forest";
    case "FAILED": return "bg-risk-red-light text-risk-red";
    case "RETRYING": return "bg-blue-100 text-blue-600";
    default: return "bg-amber-light text-amber-700";
  }
}
