"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { Bell, CalendarDays, Heart, Loader2, Megaphone, MessageCircle } from "lucide-react";
import { apiFetch, getConfiguredDataMode } from "@/lib/fetch";
import { useStoreSelector } from "@/hooks/use-store";
import { getAuthorizedChildren } from "@/lib/selectors";
import type { Message, SessionUser } from "@/lib/domain";

type Notice = { id: string; childId: string | null; type: string; title: string; body: string; readAt: string | null; createdAt: string };
type Item = Notice & { href?: string; notificationId?: string };
const iconFor = (type: string) => type.includes("MESSAGE") ? MessageCircle : type.includes("HEALTH") ? Heart : type.includes("EVENT") ? CalendarDays : type.includes("NOTICE") ? Megaphone : Bell;
const destinationForNotice = (item: Notice) => {
  if (item.type === "REPORT_READY") return "/parent/reports";
  if (item.childId && item.type === "MILESTONE_UPDATED") return `/parent/children/${encodeURIComponent(item.childId)}/milestones`;
  if (item.childId && item.type === "GROWTH_RECORDED") return `/growth?childId=${encodeURIComponent(item.childId)}`;
  if (item.childId) return `/parent/observations?childId=${encodeURIComponent(item.childId)}`;
  return "/parent/more";
};

export function ParentInbox({ session }: { session: SessionUser }) {
  const children = useStoreSelector((state) => getAuthorizedChildren(state, session));
  const [items, setItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const refresh = useCallback(async () => {
    try {
      if (await getConfiguredDataMode() !== "sqlite") { setError("Saved notifications require SQLite mode."); return; }
      const [response, ...threads] = await Promise.all([
        apiFetch<{ items: Notice[] }>("/api/notifications"),
        ...children.map((child) => apiFetch<Message[]>(`/api/messages?childId=${encodeURIComponent(child.id)}`).then((messages) => messages.map((message) => ({
          id: `message-${message.id}`, childId: message.childId, type: "MESSAGE", title: message.subject || "Message from your Anganwadi worker",
          body: message.body, readAt: message.readAt, createdAt: message.createdAt, href: `/messages?childId=${encodeURIComponent(message.childId)}`,
        })))),
      ]);
      const notices = response.items.map((item) => ({ ...item, href: destinationForNotice(item), notificationId: item.id }));
      setItems([...notices, ...threads.flat()].sort((a, b) => b.createdAt.localeCompare(a.createdAt))); setError("");
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Messages could not be loaded."); }
    finally { setLoading(false); }
  }, [children]);
  useEffect(() => { void refresh(); const timer = window.setInterval(() => { if (document.visibilityState === "visible") void refresh(); }, 10_000); return () => window.clearInterval(timer); }, [refresh]);
  return <div className="mx-auto max-w-2xl space-y-4 pb-6">
    <header className="flex items-center justify-between"><h1 className="text-xl font-bold text-stone-800">Messages</h1><Link href="/messages" aria-label="Talk to your Anganwadi worker" className="rounded-full border border-stone-200 p-2 text-[#386d43]"><MessageCircle className="h-5 w-5" /></Link></header>
    {error && <div role="alert" className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-800">{error}</div>}
    {loading ? <div className="card flex justify-center gap-2 p-10 text-stone-500"><Loader2 className="h-4 w-4 animate-spin" />Loading messages…</div> : items.length === 0 ? <div className="card p-10 text-center"><Bell className="mx-auto mb-3 h-9 w-9 text-stone-300"/><p className="font-medium text-stone-700">No messages yet</p><p className="mt-1 text-sm text-stone-500">Updates and notices will appear here when sent to your account.</p></div> : <div className="space-y-3">{items.map((item) => { const Icon = iconFor(item.type); return <article key={item.id} className="card flex items-start gap-3 p-4"><span className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-[#f1f5ea] text-[#4f8a56]"><Icon className="h-6 w-6"/></span><div className="min-w-0 flex-1">{item.href ? <Link href={item.href} className="block" onClick={() => { if (item.notificationId && !item.readAt) { void apiFetch("/api/notifications", { method: "PATCH", body: JSON.stringify({ id: item.notificationId }) }).then(() => setItems((current) => current.map((row) => row.id === item.id ? { ...row, readAt: new Date().toISOString() } : row))).catch(() => setError("Could not mark this update as read.")); } }}><div className="flex items-start justify-between gap-2"><h2 className="font-semibold text-stone-800">{item.title}</h2><time className="shrink-0 text-xs text-stone-400">{new Date(item.createdAt).toLocaleDateString()}</time></div><p className="mt-1 text-sm text-stone-600">{item.body}</p></Link> : <><div className="flex items-start justify-between gap-2"><h2 className="font-semibold text-stone-800">{item.title}</h2><time className="shrink-0 text-xs text-stone-400">{new Date(item.createdAt).toLocaleDateString()}</time></div><p className="mt-1 text-sm text-stone-600">{item.body}</p></>}</div>{!item.readAt && <span aria-label="Unread" className="mt-1 h-3 w-3 shrink-0 rounded-full bg-[#32804b]"/>}</article>; })}</div>}
    <Link href="/messages" className="btn-secondary flex justify-center">Talk to Anganwadi Worker</Link>
  </div>;
}
