"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Save, Loader2 } from "lucide-react";
import { appLocales, genders, guardianRelationships, type SessionUser, type AppLocale, type Child } from "@/lib/domain";
import { storeActions } from "@/lib/store-actions";
import { toast } from "sonner";
import { apiFetch, getConfiguredDataMode } from "@/lib/fetch";

export function AddChildForm({
  session,
  centers,
  workers,
}: {
  session: SessionUser;
  centers: Array<{ id: string; name: string }>;
  workers: Array<{ id: string; name: string; centerIds: string[] }>;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [form, setForm] = useState({
    fullName: "",
    dateOfBirth: "",
    gender: "UNSPECIFIED" as string,
    centerId: centers[0]?.id ?? "",
    assignedWorkerId: workers.find((worker) => worker.centerIds.includes(centers[0]?.id ?? ""))?.id ?? "",
    primaryLanguage: "en" as string,
    emergencyContactName: "",
    emergencyContactPhone: "",
    guardian: {
      name: "",
      phone: "",
      preferredLanguage: "en" as string,
      relationship: "MOTHER" as string,
    },
  });

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      const input = {
        fullName: form.fullName,
        dateOfBirth: form.dateOfBirth,
        gender: form.gender as Child["gender"],
        centerId: form.centerId,
        assignedWorkerId: form.assignedWorkerId,
        primaryLanguage: form.primaryLanguage as AppLocale,
        emergencyContactName: form.emergencyContactName,
        emergencyContactPhone: form.emergencyContactPhone,
        guardian: {
          name: form.guardian.name,
          phone: form.guardian.phone,
          preferredLanguage: form.guardian.preferredLanguage as AppLocale,
          relationship: form.guardian.relationship as "MOTHER" | "FATHER" | "GRANDPARENT" | "SIBLING" | "OTHER",
        },
      };
      const child = await getConfiguredDataMode() === "sqlite"
        ? await apiFetch<{ id: string; fullName: string }>("/api/children", { method: "POST", headers: { "Idempotency-Key": crypto.randomUUID() }, body: JSON.stringify(input) })
        : storeActions.addChild(session, input);
      toast.success(`Child "${child.fullName}" registered successfully.`);
      router.push(`/children/${child.id}`);
    } catch (err: any) {
      setError(err.message ?? "Failed to create child record");
    } finally {
      setLoading(false);
    }
  }

  const update = (field: string, value: string) => setForm((f) => ({ ...f, [field]: value }));
  const updateGuardian = (field: string, value: string) =>
    setForm((f) => ({ ...f, guardian: { ...f.guardian, [field]: value } }));

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-stone-800">Register New Child</h1>
        <p className="text-stone-500 text-sm">Fill in the child and guardian details below.</p>
      </div>

      {error && <div className="rounded-xl bg-risk-red-light text-risk-red text-sm px-4 py-3">{error}</div>}

      <form onSubmit={handleSubmit} className="card p-6 space-y-5">
        <h3 className="font-semibold text-stone-800">Child Information</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="md:col-span-2">
            <label className="label">Full Name *</label>
            <input className="input" value={form.fullName} onChange={(e) => update("fullName", e.target.value)} required minLength={2} />
          </div>
          <div>
            <label className="label">Date of Birth *</label>
            <input type="date" className="input" value={form.dateOfBirth} onChange={(e) => update("dateOfBirth", e.target.value)} required />
          </div>
          <div>
            <label className="label">Gender</label>
            <select className="input" value={form.gender} onChange={(e) => update("gender", e.target.value)}>
              {genders.map((g) => <option key={g} value={g}>{g}</option>)}
            </select>
          </div>
          <div>
            <label className="label">Center *</label>
            <select className="input" value={form.centerId} onChange={(e) => {
              const centerId = e.target.value;
              setForm((current) => ({ ...current, centerId, assignedWorkerId: workers.find((worker) => worker.centerIds.includes(centerId))?.id ?? "" }));
            }} required>
              {centers.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
          <div>
            <label className="label">Assigned Worker *</label>
            <select className="input" value={form.assignedWorkerId} onChange={(e) => update("assignedWorkerId", e.target.value)} required>
              {workers.filter((worker) => worker.centerIds.includes(form.centerId)).map((w) => <option key={w.id} value={w.id}>{w.name}</option>)}
            </select>
            {centers.length > 0 && workers.filter((worker) => worker.centerIds.includes(form.centerId)).length === 0 && <p className="mt-1 text-sm text-risk-red">No active workers are assigned to this center. Ask an administrator to assign a worker before registering a child.</p>}
          </div>
          <div>
            <label className="label">Primary Language</label>
            <select className="input" value={form.primaryLanguage} onChange={(e) => update("primaryLanguage", e.target.value)}>
              {appLocales.map((l) => <option key={l} value={l}>{l.toUpperCase()}</option>)}
            </select>
          </div>
          <div>
            <label className="label">Emergency Contact Name *</label>
            <input className="input" value={form.emergencyContactName} onChange={(e) => update("emergencyContactName", e.target.value)} required />
          </div>
          <div>
            <label className="label">Emergency Contact Phone *</label>
            <input className="input" value={form.emergencyContactPhone} onChange={(e) => update("emergencyContactPhone", e.target.value)} required />
          </div>
        </div>

        <hr className="border-stone-100" />
        <h3 className="font-semibold text-stone-800">Guardian Information</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="label">Guardian Name *</label>
            <input className="input" value={form.guardian.name} onChange={(e) => updateGuardian("name", e.target.value)} required />
          </div>
          <div>
            <label className="label">Phone *</label>
            <input className="input" value={form.guardian.phone} onChange={(e) => updateGuardian("phone", e.target.value)} required />
          </div>
          <div>
            <label className="label">Relationship</label>
            <select className="input" value={form.guardian.relationship} onChange={(e) => updateGuardian("relationship", e.target.value)}>
              {guardianRelationships.map((r) => <option key={r} value={r}>{r}</option>)}
            </select>
          </div>
          <div>
            <label className="label">Preferred Language</label>
            <select className="input" value={form.guardian.preferredLanguage} onChange={(e) => updateGuardian("preferredLanguage", e.target.value)}>
              {appLocales.map((l) => <option key={l} value={l}>{l.toUpperCase()}</option>)}
            </select>
          </div>
        </div>

        <div className="flex justify-end gap-3 pt-2">
          <button type="button" onClick={() => router.back()} className="btn-secondary">Cancel</button>
          <button type="submit" disabled={loading} className="btn-primary">
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            Register Child
          </button>
        </div>
      </form>
    </div>
  );
}
