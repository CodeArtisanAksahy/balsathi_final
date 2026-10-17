"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { Activity, AlertTriangle, Baby, Building2, CheckCircle2, ClipboardCheck, FileText, RefreshCw, UserPlus, Users } from "lucide-react";
import type { SessionUser } from "@/lib/domain";
import { apiFetch } from "@/lib/fetch";

type DashboardPayload = {
  totalChildren: number;
  followUpChildren: number;
  observationsThisWeek: number;
  pendingReview: number;
  totalCenters?: number;
  activeWorkers?: number;
  registeredParents?: number;
  attentionChildren: Array<{ child: { id: string; fullName: string }; risks: Array<{ id: string; title: string; level: string; createdAt: string }> }>;
  centerStats?: Array<{ centerName: string; totalChildren: number }>;
  auditLogs?: Array<{ id: string; action: string; createdAt: string }>;
};
type UserRow = { role: string; active: boolean };
type CenterRow = { active: boolean };

export function AdminDashboard({ session, databaseMode }: { session: SessionUser; databaseMode: boolean }) {
  const [data, setData] = useState<DashboardPayload | null>(null);
  const [userCount, setUserCount] = useState<number | null>(null);
  const [centerCounts, setCenterCounts] = useState<{ active: number; inactive: number } | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const refresh = useCallback(async () => {
    try {
      const dashboard = await apiFetch<DashboardPayload>("/api/dashboard");
      setData(dashboard);
      if (databaseMode) {
        const [users, centers] = await Promise.all([apiFetch<UserRow[]>("/api/v1/admin/users"), apiFetch<CenterRow[]>("/api/v1/admin/centers")]);
        setUserCount(users.filter((user) => user.active && user.role === "WORKER").length);
        setCenterCounts({ active: centers.filter((center) => center.active).length, inactive: centers.filter((center) => !center.active).length });
      }
      setError("");
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Admin dashboard data could not be loaded."); }
    finally { setLoading(false); }
  }, [databaseMode]);
  useEffect(() => { void refresh(); const timer = window.setInterval(() => { if (document.visibilityState === "visible") void refresh(); }, 15_000); const onFocus = () => void refresh(); window.addEventListener("focus", onFocus); return () => { window.clearInterval(timer); window.removeEventListener("focus", onFocus); }; }, [refresh]);

  const total = data?.totalChildren ?? 0;
  const followed = data?.followUpChildren ?? 0;
  const followRate = total ? Math.min(100, Math.round(followed / total * 100)) : 0;
  const metrics = [
    { label: "Total Children", value: loading ? "—" : total.toLocaleString(), note: "In your authorized scope", icon: Baby, tint: "bg-[#eaf3e8] text-[#386d43]" },
    { label: "Anganwadi Centers", value: loading ? "—" : (centerCounts?.active ?? data?.totalCenters)?.toLocaleString() ?? "—", note: centerCounts ? `${centerCounts.inactive} inactive` : "Status not returned by this data source", icon: Building2, tint: "bg-[#f0e9fa] text-[#8256b1]" },
    { label: "Anganwadi Workers", value: loading ? "—" : (userCount ?? data?.activeWorkers)?.toLocaleString() ?? "—", note: "Active accounts", icon: Users, tint: "bg-[#fff0df] text-[#b66d20]" },
    { label: "Active Parents", value: loading ? "—" : data?.registeredParents?.toLocaleString() ?? "—", note: "Linked to children", icon: Activity, tint: "bg-[#e6f2f8] text-[#347ea6]" },
  ];
  const alerts = [
    ...(data?.attentionChildren.slice(0, 3).map((item) => ({ id: item.child.id, label: `${item.child.fullName}: ${item.risks[0]?.title ?? "Follow-up needed"}`, date: item.risks[0]?.createdAt, tone: "amber" })) ?? []),
    ...(data?.pendingReview ? [{ id: "pending-review", label: `${data.pendingReview} observations awaiting review`, date: undefined, tone: "purple" }] : []),
  ].slice(0, 5);

  return <div className="mx-auto max-w-7xl space-y-5 pb-8">
    <header className="flex flex-wrap items-end justify-between gap-3"><div><p className="text-xs font-semibold uppercase tracking-[0.14em] text-[#638062]">Balsathi · Admin Panel</p><h1 className="mt-1 text-2xl font-bold text-stone-800">Welcome, {session.name.split(" ")[0]}! <span aria-hidden="true">👋</span></h1><p className="mt-1 text-sm text-stone-500">Platform overview from current records in your authorized scope.</p></div><button onClick={() => { setLoading(true); void refresh(); }} className="btn-secondary" disabled={loading}><RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`}/>Refresh</button></header>
    {error && <div role="alert" className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-800">{error} <button className="ml-2 underline" onClick={() => { setLoading(true); void refresh(); }}>Retry</button></div>}
    <section aria-label="Platform totals" className="grid grid-cols-2 gap-3 xl:grid-cols-4">{metrics.map(({ label, value, note, icon: Icon, tint }) => <article key={label} className="card border-[#eee8dc] p-4"><span className={`grid h-9 w-9 place-items-center rounded-xl ${tint}`}><Icon className="h-5 w-5"/></span><p className="mt-3 text-xs font-medium text-stone-500">{label}</p><p className="mt-0.5 text-2xl font-bold text-stone-800">{value}</p><p className="mt-1 text-xs text-stone-400">{note}</p></article>)}</section>
    <section className="grid gap-4 lg:grid-cols-[1.4fr_0.9fr]">
      <article className="card p-5"><div className="flex items-center justify-between gap-2"><div><h2 className="font-semibold text-stone-800">Children needing follow-up</h2><p className="text-xs text-stone-500">Based on open follow-ups and active risk flags.</p></div><Link href="/admin/children" className="text-xs font-semibold text-[#386d43]">View children →</Link></div><div className="mt-5 flex flex-col items-center gap-5 sm:flex-row"><div className="relative grid h-40 w-40 shrink-0 place-items-center rounded-full" style={{ background: `conic-gradient(#dc6658 ${followRate * 3.6}deg, #e9f1e5 0deg)` }}><div className="grid h-[8.1rem] w-[8.1rem] content-center rounded-full bg-white text-center"><strong className="text-3xl text-stone-800">{loading ? "—" : followed}</strong><span className="text-xs text-stone-500">of {total} children</span></div></div><div className="w-full space-y-3">{[
        { label: "Open follow-up records", value: followed, color: "bg-[#eea33a]" },
        { label: "Observations this week", value: data?.observationsThisWeek ?? 0, color: "bg-[#4f8a56]" },
        { label: "Waiting for review", value: data?.pendingReview ?? 0, color: "bg-[#8b65b4]" },
      ].map((row) => <div key={row.label}><div className="flex justify-between text-xs"><span className="text-stone-600">{row.label}</span><strong className="text-stone-800">{loading ? "—" : row.value}</strong></div><div className="mt-1 h-2 overflow-hidden rounded-full bg-stone-100"><div className={`h-full ${row.color}`} style={{ width: `${total ? Math.min(100, Math.round(row.value / total * 100)) : 0}%` }}/></div></div>)}</div></div></article>
      <article className="card p-5"><div className="flex items-center justify-between"><div><h2 className="font-semibold text-stone-800">Recent alerts</h2><p className="text-xs text-stone-500">Current records requiring attention</p></div><AlertTriangle className="h-5 w-5 text-[#d48a2c]"/></div>{loading ? <p className="py-8 text-center text-sm text-stone-400">Loading alerts…</p> : alerts.length ? <ul className="mt-3 divide-y divide-stone-100">{alerts.map((alert) => <li key={alert.id} className="flex gap-3 py-3"><span className={`mt-1 h-2.5 w-2.5 shrink-0 rounded-full ${alert.tone === "purple" ? "bg-[#8b65b4]" : "bg-[#e7a43a]"}`}/><div className="min-w-0 flex-1"><p className="text-sm text-stone-700">{alert.label}</p>{alert.date && <time className="text-[11px] text-stone-400">{new Date(alert.date).toLocaleString()}</time>}</div></li>)}</ul> : <div className="py-8 text-center"><CheckCircle2 className="mx-auto h-8 w-8 text-[#4f8a56]"/><p className="mt-2 text-sm text-stone-500">No current alerts.</p></div>}</article>
    </section>
    <section className="grid gap-4 lg:grid-cols-2">
      <article className="card p-5"><div className="flex items-center justify-between"><h2 className="font-semibold text-stone-800">Centers at a glance</h2><Link href="/admin/centers" className="text-xs font-semibold text-[#386d43]">Manage centers →</Link></div><div className="mt-3 divide-y divide-stone-100">{data?.centerStats?.slice(0, 5).map((center) => <div key={center.centerName} className="flex justify-between py-2.5 text-sm"><span className="text-stone-600">{center.centerName}</span><span className="font-semibold text-stone-800">{center.totalChildren} children</span></div>)}{!loading && !data?.centerStats?.length && <p className="py-6 text-center text-sm text-stone-400">No centers in this scope.</p>}</div></article>
      <article className="card p-5"><h2 className="font-semibold text-stone-800">Quick actions</h2><div className="mt-3 grid grid-cols-2 gap-3">{[
        { label: "Add Center", href: "/admin/centers", icon: Building2 }, { label: "Add User", href: "/admin/users", icon: UserPlus }, { label: "System Reports", href: "/admin/analytics", icon: FileText }, { label: "Review Observations", href: "/admin/children", icon: ClipboardCheck },
      ].filter(({ href }) => href !== "/admin/centers" || session.role === "DISTRICT_ADMIN").map(({ label, href, icon: Icon }) => <Link key={label} href={href} className="flex items-center gap-2 rounded-2xl bg-[#fbf7ee] p-3 text-sm font-medium text-stone-700 hover:bg-[#f5edda]"><Icon className="h-4 w-4 text-[#57734c]"/>{label}</Link>)}</div><p className="mt-3 text-[11px] text-stone-400">Figures refresh every 15 seconds and are limited to your permitted scope.</p></article>
    </section>
  </div>;
}
