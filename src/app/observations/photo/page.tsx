"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { Camera, Upload, X, Save, Loader2 } from "lucide-react";
import type { SessionUser } from "@/lib/domain";
import { apiFetch } from "@/lib/fetch";
import { getConfiguredDataMode } from "@/lib/fetch";

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

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <h1 className="text-2xl font-bold text-stone-800">Photo Observation</h1>

      {sqliteMode && <div className="rounded-xl bg-amber-50 border border-amber-200 text-amber-900 text-sm px-4 py-3">Photo uploads are currently unavailable in SQLite mode. Capture the observation as text instead.</div>}

      {error && <div className="rounded-xl bg-risk-red-light text-risk-red text-sm px-4 py-3">{error}</div>}

      <div className="card p-6 space-y-5">
        <div>
          <label className="label">Child</label>
          <select className="input" value={childId} onChange={(e) => setChildId(e.target.value)}>
            {children.map((c) => <option key={c.id} value={c.id}>{c.fullName}</option>)}
          </select>
        </div>

        {/* Photo upload */}
        <div>
          <label className="label">Photos (max 5)</label>
          <div className="grid grid-cols-3 gap-3">
            {images.map((img, idx) => (
              <div key={idx} className="relative aspect-square rounded-xl overflow-hidden border border-stone-200">
                <img src={img.url} alt={`Photo ${idx + 1}`} className="w-full h-full object-cover" />
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
                className="aspect-square rounded-xl border-2 border-dashed border-stone-300 flex flex-col items-center justify-center text-stone-400 hover:border-forest hover:text-forest transition"
              >
                <Upload className="w-6 h-6 mb-1" />
                <span className="text-xs">Upload</span>
              </button>
            )}
          </div>
          <input ref={fileInputRef} type="file" accept="image/*" multiple className="hidden" onChange={(e) => handleFiles(e.target.files)} />
          <button
            type="button"
            onClick={() => cameraInputRef.current?.click()}
            className="btn-secondary mt-3"
          >
            <Camera className="w-4 h-4" /> Capture from Camera
          </button>
          <input ref={cameraInputRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={(e) => handleFiles(e.target.files)} />
          <p className="text-xs text-stone-400 mt-2">Photos are stored securely. Consent must be verified before capturing.</p>
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
          <label className="label">Additional Note</label>
          <textarea className="input min-h-[60px] resize-y" value={note} onChange={(e) => setNote(e.target.value)} placeholder="Optional note…" />
        </div>

        <div className="flex items-start gap-2">
          <input
            type="checkbox"
            checked={consentVerified}
            onChange={(e) => setConsentVerified(e.target.checked)}
            className="accent-forest w-4 h-4 mt-0.5"
          />
          <label className="text-sm text-stone-600">
            I confirm that guardian consent has been obtained for capturing and storing this child&apos;s photograph.
          </label>
        </div>

        <div className="flex justify-end">
          <button onClick={save} disabled={saving || !consentVerified} className="btn-primary">
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            Save Photo Observation
          </button>
        </div>
      </div>
    </div>
  );
}
