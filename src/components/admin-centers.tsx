"use client";

import { useState } from "react";
import { Building2, MapPin, Plus } from "lucide-react";
import type { SessionUser, Center } from "@/lib/domain";
import { apiFetch } from "@/lib/fetch";

type CenterRow = Center & { active?: boolean };

export function AdminCenters({ session, centers: initialCenters, databaseMode }: { session: SessionUser; centers: CenterRow[]; databaseMode: boolean }) {
  const [centers, setCenters] = useState(initialCenters);
  const [showAdd, setShowAdd] = useState(false);
  const [editing, setEditing] = useState<CenterRow | null>(null);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const canCreate = session.role === "DISTRICT_ADMIN";
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
  return <div className="space-y-6">
    <div className="flex items-center justify-between gap-3"><h1 className="text-2xl font-bold text-stone-800">Anganwadi Centers</h1>{canCreate && <button onClick={() => { setError(""); setShowAdd(true); }} disabled={!databaseMode} className="btn-primary disabled:opacity-50"><Plus className="h-4 w-4" /> Add Center</button>}</div>
    {!databaseMode && <div className="rounded-xl bg-amber-50 p-4 text-sm text-amber-900">Center provisioning is available only when SQLite persistence is enabled.</div>}
    {error && !showAdd && <div role="alert" className="rounded-xl bg-risk-red-light p-3 text-sm text-risk-red">{error}</div>}
    <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">{centers.map((center) => <article key={center.id} className="card p-5"><div className="flex items-start justify-between"><div className="flex h-12 w-12 items-center justify-center rounded-xl bg-forest/15"><Building2 className="h-6 w-6 text-forest" /></div><span className={`badge ${center.active === false ? "bg-stone-100 text-stone-500" : "bg-forest/10 text-forest"}`}>{center.active === false ? "Inactive" : "Active"}</span></div><h2 className="mt-3 font-semibold text-stone-800">{center.name}</h2><p className="mt-1 flex items-center gap-1 text-sm text-stone-500"><MapPin className="h-3.5 w-3.5" />{center.village}, {center.district}</p><p className="mt-1 text-xs text-stone-400">{center.state} · {center.code}</p>{canCreate && <div className="mt-4 flex gap-4"><button onClick={() => { setError(""); setEditing(center); }} disabled={!databaseMode} className="text-sm font-medium text-forest disabled:opacity-40">Edit details</button><button onClick={() => toggleActive(center)} disabled={!databaseMode} className="text-sm font-medium text-forest disabled:opacity-40">{center.active === false ? "Reactivate center" : "Deactivate center"}</button></div>}</article>)}</div>
    {centers.length === 0 && <div className="card p-12 text-center text-stone-500">No centers found.</div>}
    {showAdd && <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onMouseDown={(event) => event.target === event.currentTarget && setShowAdd(false)}><form action={createCenter} className="w-full max-w-lg space-y-4 rounded-2xl bg-white p-6 shadow-xl"><h2 className="text-lg font-bold">Add center</h2>{error && <div role="alert" className="rounded-lg bg-risk-red-light p-3 text-sm text-risk-red">{error}</div>}<label className="block text-sm">Center code<input name="code" required minLength={2} maxLength={32} pattern="[A-Za-z0-9_-]+" className="input mt-1" /></label><label className="block text-sm">Name<input name="name" required minLength={2} maxLength={120} className="input mt-1" /></label><label className="block text-sm">Village<input name="village" required minLength={2} maxLength={120} className="input mt-1" /></label><label className="block text-sm">District<input name="district" required minLength={2} maxLength={120} className="input mt-1" /></label><label className="block text-sm">State<input name="state" required minLength={2} maxLength={120} className="input mt-1" /></label><div className="flex justify-end gap-2"><button type="button" onClick={() => setShowAdd(false)} className="btn-secondary">Cancel</button><button disabled={saving} className="btn-primary disabled:opacity-50">{saving ? "Saving…" : "Create center"}</button></div></form></div>}
    {editing && <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"><form action={updateCenter} className="w-full max-w-lg space-y-4 rounded-2xl bg-white p-6 shadow-xl"><h2 className="text-lg font-bold">Edit center</h2>{error && <div role="alert" className="rounded-lg bg-risk-red-light p-3 text-sm text-risk-red">{error}</div>}{([["name", "Name"], ["village", "Village"], ["district", "District"], ["state", "State"]] as const).map(([key, label]) => <label key={key} className="block text-sm">{label}<input name={key} defaultValue={editing[key]} required minLength={2} maxLength={120} className="input mt-1" /></label>)}<div className="flex justify-end gap-2"><button type="button" onClick={() => setEditing(null)} className="btn-secondary">Cancel</button><button disabled={saving} className="btn-primary disabled:opacity-50">{saving ? "Saving…" : "Save changes"}</button></div></form></div>}
  </div>;
}
