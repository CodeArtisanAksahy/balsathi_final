"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { Bell, CheckCheck, Loader2 } from "lucide-react";
import type { SessionUser } from "@/lib/domain";
import { apiFetch, getConfiguredDataMode } from "@/lib/fetch";

type NotificationItem = {
  id: string;
  childId: string | null;
  type: string;
  title: string;
  body: string;
  readAt: string | null;
  createdAt: string;
  child: { fullName: string } | null;
};
type NotificationPayload = { items: NotificationItem[]; unreadCount: number };

export function NotificationsView({ session }: { session: SessionUser }) {
  const [items, setItems] = useState<NotificationItem[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [available, setAvailable] = useState(true);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  const refresh = useCallback(async () => {
    try {
      const mode = await getConfiguredDataMode();
      if (mode !== "sqlite") { setAvailable(false); setLoading(false); return; }
      const result = await apiFetch<NotificationPayload>("/api/notifications");
      setItems(result.items);
      setUnreadCount(result.unreadCount);
      setAvailable(true);
      setError("");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Notifications could not be loaded.");
    } finally { setLoading(false); }
  }, []);

  useEffect(() => {
    void refresh();
    const timer = window.setInterval(() => { if (document.visibilityState === "visible") void refresh(); }, 10_000);
    const focus = () => void refresh();
    window.addEventListener("focus", focus);
    return () => { window.clearInterval(timer); window.removeEventListener("focus", focus); };
  }, [refresh]);

  async function markRead(id: string) {
    setSaving(true);
    try {
      await apiFetch("/api/notifications", { method: "PATCH", body: JSON.stringify({ id }) });
      setItems((current) => current.map((item) => item.id === id ? { ...item, readAt: new Date().toISOString() } : item));
      setUnreadCount((count) => Math.max(0, count - 1));
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Could not update notification."); }
    finally { setSaving(false); }
  }

  async function markAllRead() {
    setSaving(true);
    try {
      await apiFetch("/api/notifications", { method: "PATCH", body: JSON.stringify({ markAllRead: true }) });
      const readAt = new Date().toISOString();
      setItems((current) => current.map((item) => item.readAt ? item : { ...item, readAt }));
      setUnreadCount(0);
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Could not update notifications."); }
    finally { setSaving(false); }
  }

  return (
    <div className="mx-auto max-w-3xl space-y-5">
      <div className="flex items-center justify-between gap-3">
        <div><h1 className="text-2xl font-bold text-stone-800">Notifications</h1><p className="text-sm text-stone-500">{unreadCount} unread</p></div>
        {unreadCount > 0 && <button className="btn-secondary" onClick={markAllRead} disabled={saving}><CheckCheck className="h-4 w-4" />Mark all read</button>}
      </div>
      {!available && <div role="status" className="card p-5 text-sm text-stone-600">Persistent notifications are available in SQLite mode. Demo mode does not save or send alerts.</div>}
      {error && <div role="alert" className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800">{error}</div>}
      {loading ? <div className="card flex items-center justify-center gap-2 p-10 text-stone-500"><Loader2 className="h-4 w-4 animate-spin" />Loading notifications…</div>
        : items.length === 0 ? <div className="card p-12 text-center"><Bell className="mx-auto mb-3 h-10 w-10 text-stone-300" /><p className="text-stone-600">You’re all caught up.</p><p className="mt-1 text-sm text-stone-400">New observations, measurements, messages, and reports will appear here.</p></div>
          : <div className="space-y-3">{items.map((item) => <article key={item.id} className={`card flex items-start justify-between gap-4 p-4 ${item.readAt ? "" : "border-l-4 border-l-forest"}`}>
            <div className="min-w-0"><div className="flex items-center gap-2"><h2 className="font-semibold text-stone-800">{item.title}</h2>{!item.readAt && <span className="rounded-full bg-forest/10 px-2 py-0.5 text-[10px] font-semibold uppercase text-forest">New</span>}</div>
              <p className="mt-1 text-sm text-stone-600">{item.body}</p><p className="mt-2 text-xs text-stone-400">{new Date(item.createdAt).toLocaleString()}</p>
              {item.childId && <Link href={`/children/${item.childId}`} onClick={() => { if (!item.readAt) void markRead(item.id); }} className="mt-2 inline-block text-sm font-medium text-forest hover:underline">View child record{item.child?.fullName ? `: ${item.child.fullName}` : ""}</Link>}
            </div>
            {!item.readAt && <button className="btn-secondary flex-shrink-0 text-xs" onClick={() => void markRead(item.id)} disabled={saving}>Mark read</button>}
          </article>)}</div>}
    </div>
  );
}
