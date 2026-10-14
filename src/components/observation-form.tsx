"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Save, Loader2, Mic, Camera, FileText } from "lucide-react";
import type { SessionUser, ObservationMethod, DevelopmentDomain, AssessmentStatus } from "@/lib/domain";
import { appLocales, developmentDomains, observationMethods, assessmentStatuses } from "@/lib/domain";
import { cn } from "@/lib/utils";
import { apiFetch, getConfiguredDataMode } from "@/lib/fetch";
import { useStoreSelector } from "@/hooks/use-store";
import { getAuthorizedChildren } from "@/lib/selectors";
import { storeActions } from "@/lib/store-actions";
import { toast } from "sonner";

export function ObservationForm({
  session,
  initialChildId,
  initialMethod,
}: {
  session: SessionUser;
  initialChildId?: string;
  initialMethod: ObservationMethod;
}) {
  const router = useRouter();
  const children = useStoreSelector((state) => getAuthorizedChildren(state, session));
  const milestones = useStoreSelector((state) =>
    state.milestoneDefinitions.filter((m) => m.active),
  );

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [form, setForm] = useState({
    childId: initialChildId ?? children[0]?.id ?? "",
    observedAt: new Date().toISOString().slice(0, 16),
    method: initialMethod,
    observationLanguage: session.preferredLanguage,
    domain: "LANGUAGE" as DevelopmentDomain,
    activityContext: "",
    observationText: "",
    workerNotes: "",
    followUpRequired: false,
    reviewStatus: "REVIEW_PENDING" as "DRAFT" | "REVIEW_PENDING" | "VERIFIED",
    milestoneAssessments: [] as Array<{ milestoneId: string; status: AssessmentStatus; notes: string }>,
  });

  const update = (field: string, value: any) => setForm((f) => ({ ...f, [field]: value }));

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      const payload = {
        ...form,
        observedAt: new Date(form.observedAt).toISOString(),
        attachmentIds: [],
      };
      const saved = await getConfiguredDataMode() === "postgres"
        ? await apiFetch<{ id: string; childId: string }>("/api/observations", { method: "POST", headers: { "Idempotency-Key": crypto.randomUUID() }, body: JSON.stringify(payload) })
        : storeActions.addObservation(session, payload).observation;
      toast.success("Observation saved successfully.");
      router.push(`/children/${saved.childId}`);
    } catch (err: any) {
      setError(err.message ?? "Failed to save observation");
    } finally {
      setLoading(false);
    }
  }

  function toggleMilestone(milestoneId: string) {
    setForm((f) => {
      const exists = f.milestoneAssessments.find((m) => m.milestoneId === milestoneId);
      if (exists) {
        return { ...f, milestoneAssessments: f.milestoneAssessments.filter((m) => m.milestoneId !== milestoneId) };
      }
      return {
        ...f,
        milestoneAssessments: [...f.milestoneAssessments, { milestoneId, status: "MET", notes: "" }],
      };
    });
  }

  function updateAssessment(milestoneId: string, field: "status" | "notes", value: string) {
    setForm((f) => ({
      ...f,
      milestoneAssessments: f.milestoneAssessments.map((m) =>
        m.milestoneId === milestoneId ? { ...m, [field]: value } : m,
      ),
    }));
  }

  const filteredMilestones = milestones.filter((m) => m.domain === form.domain);

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-stone-800">Record Observation</h1>
        <p className="text-stone-500 text-sm">Document a child&apos;s developmental observation.</p>
      </div>

      {error && <div className="rounded-xl bg-risk-red-light text-risk-red text-sm px-4 py-3">{error}</div>}

      <form onSubmit={handleSubmit} className="card p-6 space-y-5">
        {/* Method selector */}
        <div>
          <label className="label">Observation Method</label>
          <div className="grid grid-cols-3 gap-2">
            {observationMethods.map((m) => {
              const icons = { TEXT: FileText, VOICE: Mic, PHOTO: Camera };
              const Icon = icons[m];
              return (
                <button
                  type="button"
                  key={m}
                  onClick={() => update("method", m)}
                  className={cn(
                    "flex flex-col items-center gap-1.5 p-3 rounded-xl border-2 transition",
                    form.method === m ? "border-forest bg-forest/5 text-forest" : "border-stone-200 text-stone-500 hover:border-stone-300",
                  )}
                >
                  <Icon className="w-5 h-5" />
                  <span className="text-xs font-medium">{m}</span>
                </button>
              );
            })}
          </div>
        </div>

        <div>
          <label className="label">Child *</label>
          <select className="input" value={form.childId} onChange={(e) => update("childId", e.target.value)} required>
            <option value="">Select child…</option>
            {children.map((c) => <option key={c.id} value={c.id}>{c.fullName}</option>)}
          </select>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="label">Date & Time</label>
            <input type="datetime-local" className="input" value={form.observedAt} onChange={(e) => update("observedAt", e.target.value)} />
          </div>
          <div>
            <label className="label">Observation Language</label>
            <select className="input" value={form.observationLanguage} onChange={(e) => update("observationLanguage", e.target.value)}>
              {appLocales.map((l) => <option key={l} value={l}>{l.toUpperCase()}</option>)}
            </select>
          </div>
        </div>

        <div>
          <label className="label">Developmental Domain</label>
          <select className="input" value={form.domain} onChange={(e) => update("domain", e.target.value)}>
            {developmentDomains.map((d) => <option key={d} value={d}>{d}</option>)}
          </select>
        </div>

        <div>
          <label className="label">Activity Context</label>
          <input className="input" value={form.activityContext} onChange={(e) => update("activityContext", e.target.value)} placeholder="e.g., Story circle, outdoor play" />
        </div>

        <div>
          <label className="label">Observation Notes *</label>
          <textarea
            className="input min-h-[120px] resize-y"
            value={form.observationText}
            onChange={(e) => update("observationText", e.target.value)}
            placeholder="Describe what you observed…"
            required
            minLength={5}
          />
        </div>

        <div>
          <label className="label">Worker Notes</label>
          <textarea
            className="input min-h-[60px] resize-y"
            value={form.workerNotes}
            onChange={(e) => update("workerNotes", e.target.value)}
            placeholder="Additional notes for follow-up…"
          />
        </div>

        {/* Milestone assessments */}
        <div>
          <label className="label">Link Milestones (optional)</label>
          <div className="space-y-2 max-h-48 overflow-y-auto border border-stone-200 rounded-xl p-2">
            {filteredMilestones.map((m) => {
              const selected = form.milestoneAssessments.find((a) => a.milestoneId === m.id);
              return (
                <div key={m.id} className="p-2 rounded-lg hover:bg-stone-50">
                  <label className="flex items-start gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={!!selected}
                      onChange={() => toggleMilestone(m.id)}
                      className="mt-1 accent-forest"
                    />
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium text-stone-700">{m.title[session.preferredLanguage] ?? m.title.en}</div>
                      <div className="text-xs text-stone-400">{m.slug}</div>
                    </div>
                  </label>
                  {selected && (
                    <div className="mt-2 ml-6 flex gap-2">
                      <select
                        className="input text-xs py-1.5"
                        value={selected.status}
                        onChange={(e) => updateAssessment(m.id, "status", e.target.value)}
                      >
                        {assessmentStatuses.map((s) => <option key={s} value={s}>{s}</option>)}
                      </select>
                    </div>
                  )}
                </div>
              );
            })}
            {filteredMilestones.length === 0 && (
              <p className="text-sm text-stone-400 text-center py-4">No milestones for this domain.</p>
            )}
          </div>
        </div>

        <div className="flex items-center gap-4">
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={form.followUpRequired}
              onChange={(e) => update("followUpRequired", e.target.checked)}
              className="accent-forest w-4 h-4"
            />
            <span className="text-sm text-stone-700">Follow-up required</span>
          </label>
          <select className="input max-w-[180px]" value={form.reviewStatus} onChange={(e) => update("reviewStatus", e.target.value)}>
            <option value="REVIEW_PENDING">Review Pending</option>
            <option value="VERIFIED">Verified</option>
            <option value="DRAFT">Draft</option>
          </select>
        </div>

        <div className="flex justify-end gap-3 pt-2">
          <button type="button" onClick={() => router.back()} className="btn-secondary">Cancel</button>
          <button type="submit" disabled={loading} className="btn-primary">
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            Save Observation
          </button>
        </div>
      </form>
    </div>
  );
}
