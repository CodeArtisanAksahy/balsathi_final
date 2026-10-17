"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { Camera, Upload, X, Save, ArrowLeft, Plus } from "lucide-react";
import type { SessionUser } from "@/lib/domain";
import { apiFetch } from "@/lib/fetch";
import { getConfiguredDataMode } from "@/lib/fetch";
import Image from "next/image";
import { ObservationReviewCard } from "@/components/observation-review-card";

export default function PhotoObservationPage() {
  return <PhotoObservationInner />;
}

function PhotoObservationInner() {
  const router = useRouter();
  const [session, setSession] = useState<SessionUser | null>(null);
  const [children, setChildren] = useState<Array<{ id: string; fullName: string }>>([]);
  const [childId, setChildId] = useState("");
  const [images, setImages] = useState<Array<{ url: string; file: File }>>([]);
  const [domain, setDomain] = useState("PHYSICAL");
  const [activityContext, setActivityContext] = useState("");
  const [observationText, setObservationText] = useState("");
  const [note, setNote] = useState("");
  const [consentVerified, setConsentVerified] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [sqliteMode, setSqliteMode] = useState(false);
  const [reviewing, setReviewing] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    getConfiguredDataMode().then((mode) => setSqliteMode(mode === "sqlite")).catch(() => setError("Application data service is unavailable."));
    Promise.all([
      apiFetch<SessionUser | null>("/api/auth/session"),
      apiFetch<{ items: Array<{ id: string; fullName: string }> }>("/api/children?pageSize=100"),
    ]).then(([s, result]) => {
      setSession(s);
      if (s) {
        const childList = result.items;
        setChildren(childList);
        if (childList[0]) setChildId(childList[0].id);
      }
    });
  }, []);

  function handleFiles(files: FileList | null) {
    if (!files) return;
    const arr = Array.from(files).slice(0, 5);
    const mapped = arr.map((f) => ({ url: URL.createObjectURL(f), file: f }));
    setImages((prev) => [...prev, ...mapped].slice(0, 5));
  }

  function removeImage(idx: number) {
    setImages((prev) => prev.filter((_, i) => i !== idx));
  }

  async function save() {
    if (sqliteMode) { setError("Photo uploads are not available in SQLite mode. Use text observation capture instead."); return; }
    if (images.length === 0) { setError("Please add at least one photo."); return; }
    if (!observationText.trim()) { setError("Please describe the observation."); return; }
    setSaving(true);
    setError("");
    try {
      const attachmentIds: string[] = [];
      for (const img of images) {
        const fd = new FormData();
        fd.append("file", img.file);
        fd.append("childId", childId);
        fd.append("kind", "PHOTO");
        fd.append("consentVerified", String(consentVerified));
        const uploaded = await apiFetch<{ id: string }>("/api/upload", {
          method: "POST",
          body: fd as any,
        });
        if ((uploaded as any).id) attachmentIds.push((uploaded as any).id);
      }
      await apiFetch("/api/observations", {
        method: "POST",
        body: JSON.stringify({
          childId,
          observedAt: new Date().toISOString(),
          method: "PHOTO",
          observationLanguage: session?.preferredLanguage ?? "en",
          domain,
          activityContext,
          observationText,
          workerNotes: note,
          followUpRequired: false,
          reviewStatus: "REVIEW_PENDING",
          attachmentIds,
          milestoneAssessments: [],
        }),
      });
      router.push(`/children/${childId}`);
      router.refresh();
    } catch (e: any) {
      setError(e.message ?? "Failed to save");
    } finally {
      setSaving(false);
    }
  }

  const childName = children.find((child) => child.id === childId)?.fullName ?? "Child not selected";

  if (session?.role === "PARENT") {
    return (
      <div className="max-w-2xl mx-auto space-y-4">
        <h1 className="text-2xl font-bold text-stone-800">Photo Observation</h1>
        <div role="status" className="rounded-xl border border-blue-200 bg-blue-50 p-4 text-sm text-blue-900">
          Parents can view observations, but only an Anganwadi worker or administrator can record official observations.
        </div>
      </div>
    );
  }

  if (reviewing) {
    return <ObservationReviewCard
      title="Photo observation"
      method="Photo / Image Note"
      childName={childName}
      observedAt={new Date()}
      about={observationText}
      details={[{ label: "Photos", value: `${images.length} selected` }, { label: "Domain", value: domain }, ...(activityContext ? [{ label: "Activity", value: activityContext }] : []), ...(note ? [{ label: "Additional note", value: note }] : []), { label: "Guardian consent", value: consentVerified ? "Confirmed" : "Not confirmed" }]}
      saving={saving}
      error={error}
      onEdit={() => { setError(""); setReviewing(false); }}
      onSubmit={save}
    />;
  }

  return (
    <div className="mx-auto max-w-2xl space-y-5 text-stone-800">
      <button type="button" onClick={() => router.push("/observations/new")} className="inline-flex items-center gap-2 text-sm font-semibold text-stone-600 hover:text-forest"><ArrowLeft className="h-4 w-4" /> Back</button>
      <header><p className="text-xs font-bold uppercase tracking-[0.15em] text-forest">Capture or upload a clear photo</p><h1 className="mt-1 text-2xl font-bold">Photo / Image Observation</h1></header>

      {sqliteMode && <div className="rounded-xl bg-amber-50 border border-amber-200 text-amber-900 text-sm px-4 py-3">Photo uploads are currently unavailable in SQLite mode. Capture the observation as text instead.</div>}

      {error && <div className="rounded-xl bg-risk-red-light text-risk-red text-sm px-4 py-3">{error}</div>}

      <div className="rounded-3xl border border-[#eee5d5] bg-[#fffdf8] p-4 shadow-sm sm:p-6 space-y-5">
        <div>
          <label className="label">Child</label>
          <select className="input" value={childId} onChange={(e) => setChildId(e.target.value)}>
            {children.map((c) => <option key={c.id} value={c.id}>{c.fullName}</option>)}
          </select>
        </div>

        {/* Photo upload */}
        <div>
          <label className="label">Photos (up to 5)</label>
          <div className="flex gap-2 overflow-x-auto pb-1">
            {images.map((img, idx) => (
              <div key={idx} className={`relative h-20 w-20 shrink-0 overflow-hidden rounded-xl border ${idx === 0 ? "h-36 w-full" : "border-stone-200"}`}>
                {/* Local object URLs represent user-selected files, so next/image optimization is not applicable. */}
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={img.url} alt={`Selected observation photo ${idx + 1}`} className="h-full w-full object-cover" />
                <button
                  type="button"
                  onClick={() => removeImage(idx)}
                  className="absolute top-1 right-1 w-6 h-6 rounded-full bg-black/50 text-white flex items-center justify-center"
                >
                  <X className="w-3 h-3" />
                </button>
              </div>
            ))}
            {images.length < 5 && (
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={sqliteMode}
                className="flex h-20 w-20 shrink-0 flex-col items-center justify-center rounded-xl border-2 border-dashed border-stone-300 text-stone-500 hover:border-forest hover:text-forest disabled:cursor-not-allowed disabled:opacity-50"
              >
                <Plus className="h-5 w-5" />
                <span className="text-[11px]">Add photo</span>
              </button>
            )}
          </div>
          <input ref={fileInputRef} type="file" accept="image/*" multiple className="hidden" disabled={sqliteMode} onChange={(e) => handleFiles(e.target.files)} />
          <button
            type="button"
            onClick={() => cameraInputRef.current?.click()}
            disabled={sqliteMode}
            className="inline-flex items-center gap-2 rounded-xl border border-stone-200 bg-white px-3 py-2 text-sm font-semibold text-stone-600 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <Camera className="w-4 h-4" /> Take a photo
          </button>
          <input ref={cameraInputRef} type="file" accept="image/*" capture="environment" className="hidden" disabled={sqliteMode} onChange={(e) => handleFiles(e.target.files)} />
          <p className="text-xs text-stone-500 mt-2">Guardian consent is required before a photo can be saved.</p>
        </div>

        <div>
          <label className="label">Developmental Domain</label>
          <select className="input" value={domain} onChange={(e) => setDomain(e.target.value)}>
            {["PHYSICAL", "COGNITIVE", "LANGUAGE", "SOCIAL", "EMOTIONAL"].map((d) => (
              <option key={d} value={d}>{d}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="label">Activity Context</label>
          <input className="input" value={activityContext} onChange={(e) => setActivityContext(e.target.value)} placeholder="e.g., Free play, art activity" />
        </div>

        <div>
          <label className="label">Observation Description *</label>
          <textarea className="input min-h-[80px] resize-y" value={observationText} onChange={(e) => setObservationText(e.target.value)} placeholder="Describe what the photo shows in context of the child's development…" required />
        </div>

        <div>
          <label className="label">Add Note (Optional)</label>
          <textarea className="input min-h-[60px] resize-y" value={note} onChange={(e) => setNote(e.target.value)} placeholder="Optional note…" />
        </div>

        <div className="flex items-start gap-2">
          <input
            type="checkbox"
            checked={consentVerified}
            onChange={(e) => setConsentVerified(e.target.checked)}
            className="accent-forest w-4 h-4 mt-0.5"
            disabled={sqliteMode}
          />
          <label className="text-sm text-stone-600">
            I confirm that guardian consent has been obtained for capturing and storing this child&apos;s photograph.
          </label>
        </div>

        <div className="flex justify-end">
          <button onClick={() => { if (!childId) { setError("Select a child first."); return; } if (images.length === 0) { setError("Please add at least one photo."); return; } if (!observationText.trim()) { setError("Please describe the observation."); return; } if (!consentVerified) { setError("Confirm guardian consent before continuing."); return; } setError(""); setReviewing(true); }} disabled={sqliteMode || !consentVerified} className="inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-[#24733d] px-4 font-semibold text-white hover:bg-[#1d6033] disabled:cursor-not-allowed disabled:opacity-50">
            <Save className="w-4 h-4" /> Review Photo Observation
          </button>
        </div>
      </div>
      <div className="flex items-center justify-between rounded-2xl bg-[#f3f3e7] px-3 py-2 text-sm text-stone-600">
        <span>Your note helps describe the child’s activity.</span>
        <Image src="/illustrations/anganwadi-worker-tablet.png" alt="Anganwadi worker recording an observation" width={74} height={82} className="h-[74px] w-[68px] object-contain" />
      </div>
    </div>
  );
}
