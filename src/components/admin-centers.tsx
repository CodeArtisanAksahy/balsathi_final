"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Building2, MapPin, Plus, ChevronLeft, ChevronRight, Search } from "lucide-react";
import type { SessionUser, Center } from "@/lib/domain";
import { apiFetch } from "@/lib/fetch";

type CenterRow = Center & { active?: boolean };

export function AdminCenters({ session, centers: initialCenters, databaseMode }: { session: SessionUser; centers: CenterRow[]; databaseMode: boolean }) {
  const [centers, setCenters] = useState(initialCenters);
  const [showAdd, setShowAdd] = useState(false);
  const [editing, setEditing] = useState<CenterRow | null>(null);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [q, setQ] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [page, setPage] = useState(1);
  const [childrenByCenter, setChildrenByCenter] = useState<Record<string, number>>({});
  const [statsError, setStatsError] = useState("");
  const canCreate = session.role === "DISTRICT_ADMIN";
  const refreshStats = useCallback(async () => {
    if (!databaseMode) return;
    try {
      const data = await apiFetch<{ centerStats: Array<{ centerId: string; centerName: string; totalChildren: number }> }>("/api/dashboard");
      setChildrenByCenter(Object.fromEntries(data.centerStats.map((row) => [row.centerId, row.totalChildren])));
      setStatsError("");
    } catch (cause) { setStatsError(cause instanceof Error ? cause.message : "Center totals could not be refreshed."); }
  }, [databaseMode]);
  useEffect(() => { void refreshStats(); const timer = window.setInterval(() => { if (document.visibilityState === "visible") void refreshStats(); }, 15_000); return () => window.clearInterval(timer); }, [refreshStats]);
  const filtered = useMemo(() => centers.filter((center) => {
    const matches = `${center.name} ${center.code} ${center.village} ${center.district}`.toLowerCase().includes(q.trim().toLowerCase());
    return matches && (statusFilter === "ALL" || (statusFilter === "ACTIVE" ? center.active !== false : center.active === false));
  }), [centers, q, statusFilter]);
  const pageSize = 8;
  const pageCount = Math.max(1, Math.ceil(filtered.length / pageSize));
  const visibleCenters = filtered.slice((page - 1) * pageSize, page * pageSize);
  async function createCenter(formData: FormData) {
    setSaving(true); setError("");
    try {
      const center = await apiFetch<CenterRow>("/api/v1/admin/centers", { method: "POST", body: JSON.stringify(Object.fromEntries(formData)) });
      setCenters((items) => [...items, center].sort((a, b) => a.name.localeCompare(b.name)));
      setShowAdd(false);
    } catch (e) { setError(e instanceof Error ? e.message : "Unable to create center."); }
    finally { setSaving(false); }
  }
  async function toggleActive(center: CenterRow) {
    setError("");
    try {
      const updated = await apiFetch<CenterRow>(`/api/v1/admin/centers/${center.id}`, { method: "PATCH", body: JSON.stringify({ active: center.active === false }) });
      setCenters((items) => items.map((item) => item.id === center.id ? updated : item));
    } catch (e) { setError(e instanceof Error ? e.message : "Unable to update center."); }
  }
  async function updateCenter(formData: FormData) {
    if (!editing) return;
    setSaving(true); setError("");
    try {
      const updated = await apiFetch<CenterRow>(`/api/v1/admin/centers/${editing.id}`, { method: "PATCH", body: JSON.stringify(Object.fromEntries(formData)) });
      setCenters((items) => items.map((item) => item.id === updated.id ? updated : item));
      setEditing(null);
    } catch (e) { setError(e instanceof Error ? e.message : "Unable to update center."); }
    finally { setSaving(false); }
  }
  return <div className="mx-auto max-w-7xl space-y-5">
    <div className="flex items-center justify-between gap-3"><div><p className="text-xs font-semibold uppercase tracking-[0.14em] text-[#638062]">Admin Panel</p><h1 className="mt-1 text-2xl font-bold text-stone-800">Anganwadi Centers</h1></div>{canCreate && <button onClick={() => { setError(""); setShowAdd(true); }} disabled={!databaseMode} className="btn-primary disabled:opacity-50"><Plus className="h-4 w-4" /> Add Center</button>}</div>
    {!databaseMode && <div className="rounded-xl bg-amber-50 p-4 text-sm text-amber-900">Center provisioning is available only when SQLite persistence is enabled.</div>}
    {error && !showAdd && <div role="alert" className="rounded-xl bg-risk-red-light p-3 text-sm text-risk-red">{error}</div>}
    {statsError && <div role="alert" className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-800">{statsError}</div>}
    <section aria-label="Center status summary" className="grid grid-cols-2 gap-3 sm:grid-cols-3"><div className="card p-4"><p className="text-xs text-stone-500">Active centers</p><p className="mt-1 text-2xl font-bold text-[#386d43]">{centers.filter((center) => center.active !== false).length}</p></div><div className="card p-4"><p className="text-xs text-stone-500">Inactive centers</p><p className="mt-1 text-2xl font-bold text-[#b64037]">{centers.filter((center) => center.active === false).length}</p></div><div className="card col-span-2 p-4 sm:col-span-1"><p className="text-xs text-stone-500">Children registered in visible centers</p><p className="mt-1 text-2xl font-bold text-stone-800">{Object.values(childrenByCenter).reduce((sum, count) => sum + count, 0)}</p></div></section>
    <div className="flex flex-wrap gap-3"><div className="relative min-w-[220px] flex-1"><Search className="absolute left-3 top-3 h-4 w-4 text-stone-400"/><input value={q} onChange={(event) => { setQ(event.target.value); setPage(1); }} placeholder="Search center by name, village, or code…" className="input pl-10"/></div><select className="input max-w-[180px]" value={statusFilter} onChange={(event) => { setStatusFilter(event.target.value); setPage(1); }}><option value="ALL">All statuses</option><option value="ACTIVE">Active</option><option value="INACTIVE">Inactive</option></select></div>
    <div className="card overflow-hidden"><div className="overflow-x-auto"><table className="w-full min-w-[680px] text-sm"><thead className="bg-[#faf9f5] text-stone-500"><tr>{["Center Name", "Block / District", "Children", "Status", "Actions"].map((heading) => <th key={heading} className="px-4 py-3 text-left text-xs font-medium">{heading}</th>)}</tr></thead><tbody>{visibleCenters.map((center) => <tr key={center.id} className="border-t border-stone-100"><td className="px-4 py-3"><div className="font-medium text-stone-800">{center.name}</div><div className="text-xs text-stone-400">{center.code}</div></td><td className="px-4 py-3">{center.village}, {center.district}</td><td className="px-4 py-3 font-medium">{childrenByCenter[center.id] ?? "—"}</td><td className="px-4 py-3"><span className={`rounded-full px-2 py-1 text-xs font-medium ${center.active === false ? "bg-[#fde8e5] text-[#b64037]" : "bg-[#eaf3e8] text-[#386d43]"}`}>{center.active === false ? "Inactive" : "Active"}</span></td><td className="px-4 py-3">{canCreate && <><button onClick={() => { setError(""); setEditing(center); }} disabled={!databaseMode} className="mr-2 text-xs font-medium text-[#386d43] disabled:opacity-40">Edit</button><button onClick={() => toggleActive(center)} disabled={!databaseMode} className="text-xs font-medium text-[#386d43] disabled:opacity-40">{center.active === false ? "Reactivate" : "Deactivate"}</button></>}</td></tr>)}</tbody></table>{filtered.length === 0 && <div className="p-10 text-center text-sm text-stone-500">No centers match this search.</div>}</div><div className="flex items-center justify-between border-t border-stone-100 px-4 py-3 text-xs text-stone-500"><span>Showing {filtered.length ? (page - 1) * pageSize + 1 : 0}–{Math.min(page * pageSize, filtered.length)} of {filtered.length} centers</span><div className="flex items-center gap-1"><button aria-label="Previous page" className="rounded p-1 disabled:opacity-30" disabled={page <= 1} onClick={() => setPage((value) => Math.max(1, value - 1))}><ChevronLeft className="h-4 w-4"/></button><span className="rounded bg-[#eff6eb] px-2 py-1 text-[#386d43]">{page}</span><button aria-label="Next page" className="rounded p-1 disabled:opacity-30" disabled={page >= pageCount} onClick={() => setPage((value) => Math.min(pageCount, value + 1))}><ChevronRight className="h-4 w-4"/></button></div></div></div>
    {showAdd && <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onMouseDown={(event) => event.target === event.currentTarget && setShowAdd(false)}><form action={createCenter} className="w-full max-w-lg space-y-4 rounded-2xl bg-white p-6 shadow-xl"><h2 className="text-lg font-bold">Add center</h2>{error && <div role="alert" className="rounded-lg bg-risk-red-light p-3 text-sm text-risk-red">{error}</div>}<label className="block text-sm">Center code<input name="code" required minLength={2} maxLength={32} pattern="[A-Za-z0-9_-]+" className="input mt-1" /></label><label className="block text-sm">Name<input name="name" required minLength={2} maxLength={120} className="input mt-1" /></label><label className="block text-sm">Village<input name="village" required minLength={2} maxLength={120} className="input mt-1" /></label><label className="block text-sm">District<input name="district" required minLength={2} maxLength={120} className="input mt-1" /></label><label className="block text-sm">State<input name="state" required minLength={2} maxLength={120} className="input mt-1" /></label><div className="flex justify-end gap-2"><button type="button" onClick={() => setShowAdd(false)} className="btn-secondary">Cancel</button><button disabled={saving} className="btn-primary disabled:opacity-50">{saving ? "Saving…" : "Create center"}</button></div></form></div>}
    {editing && <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"><form action={updateCenter} className="w-full max-w-lg space-y-4 rounded-2xl bg-white p-6 shadow-xl"><h2 className="text-lg font-bold">Edit center</h2>{error && <div role="alert" className="rounded-lg bg-risk-red-light p-3 text-sm text-risk-red">{error}</div>}{([["name", "Name"], ["village", "Village"], ["district", "District"], ["state", "State"]] as const).map(([key, label]) => <label key={key} className="block text-sm">{label}<input name={key} defaultValue={editing[key]} required minLength={2} maxLength={120} className="input mt-1" /></label>)}<div className="flex justify-end gap-2"><button type="button" onClick={() => setEditing(null)} className="btn-secondary">Cancel</button><button disabled={saving} className="btn-primary disabled:opacity-50">{saving ? "Saving…" : "Save changes"}</button></div></form></div>}
  </div>;
}
