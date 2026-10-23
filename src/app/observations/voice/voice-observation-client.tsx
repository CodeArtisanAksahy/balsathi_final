"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Mic, Save, Play, Pause, Square, ArrowLeft } from "lucide-react";
import type { SessionUser } from "@/lib/domain";
import { apiFetch } from "@/lib/fetch";
import { getConfiguredDataMode } from "@/lib/fetch";
import Image from "next/image";
import { ObservationReviewCard } from "@/components/observation-review-card";

export default function VoiceObservationPage() {
  return <VoiceObservationInner />;
}

function VoiceObservationInner() {
  const router = useRouter();
  const [session, setSession] = useState<SessionUser | null>(null);
  const [children, setChildren] = useState<Array<{ id: string; fullName: string }>>([]);
  const [childId, setChildId] = useState("");
  const [recording, setRecording] = useState(false);
  const [paused, setPaused] = useState(false);
  const [duration, setDuration] = useState(0);
  const [transcript, setTranscript] = useState("");
  const [observationText, setObservationText] = useState("");
  const [domain, setDomain] = useState("LANGUAGE");
  const [activityContext, setActivityContext] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [sqliteMode, setSqliteMode] = useState(false);
  const [reviewing, setReviewing] = useState(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

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

  useEffect(() => {
    if (recording && !paused) {
      timerRef.current = setInterval(() => setDuration((d) => d + 1), 1000);
    } else if (timerRef.current) {
      clearInterval(timerRef.current);
    }
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [recording, paused]);

  async function startRecording() {
    if (sqliteMode) { setError("Voice transcription is unavailable in SQLite mode. Enter observation notes below to save a text-based record."); return; }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mr = new MediaRecorder(stream);
      mediaRecorderRef.current = mr;
      chunksRef.current = [];
      mr.ondataavailable = (e) => chunksRef.current.push(e.data);
      mr.onstop = async () => {
        const blob = new Blob(chunksRef.current, { type: "audio/webm" });
        stream.getTracks().forEach((t) => t.stop());
        try {
          const fd = new FormData();
          fd.append("file", blob, "recording.webm");
          fd.append("locale", session?.preferredLanguage ?? "en");
          const result = await apiFetch<{ transcript: string; isDemo: boolean }>("/api/transcribe", {
            method: "POST",
            body: fd as any,
          });
          setTranscript(result.transcript);
        } catch {
          setTranscript("[Audio recorded. Transcription unavailable in offline mode.]");
        }
      };
      mr.start();
      setRecording(true);
      setPaused(false);
      setDuration(0);
    } catch {
      setError("Microphone access denied. Please allow microphone permissions.");
    }
  }

  function stopRecording() {
    mediaRecorderRef.current?.stop();
    setRecording(false);
    setPaused(false);
  }

  function togglePause() {
    if (!mediaRecorderRef.current) return;
    if (paused) {
      mediaRecorderRef.current.resume();
      setPaused(false);
    } else {
      mediaRecorderRef.current.pause();
      setPaused(true);
    }
  }

  async function save() {
    if (!childId) { setError("Select a child first."); return; }
    if (observationText.trim().length < 5) { setError("Observation notes must be at least 5 characters."); return; }
    setSaving(true);
    setError("");
    try {
      await apiFetch("/api/observations", {
        method: "POST",
        body: JSON.stringify({
          childId,
          observedAt: new Date().toISOString(),
          method: sqliteMode ? "TEXT" : "VOICE",
          observationLanguage: session?.preferredLanguage ?? "en",
          domain,
          activityContext,
          observationText,
          workerNotes: sqliteMode ? "" : transcript,
          ...(sqliteMode ? {} : { aiTranscript: transcript, aiExtractedSummary: observationText.slice(0, 200) }),
          followUpRequired: false,
          reviewStatus: "REVIEW_PENDING",
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

  const mm = String(Math.floor(duration / 60)).padStart(2, "0");
  const ss = String(duration % 60).padStart(2, "0");
  const childName = children.find((child) => child.id === childId)?.fullName ?? "Child not selected";

  if (session?.role === "PARENT") {
    return (
      <div className="max-w-2xl mx-auto space-y-4">
        <h1 className="text-2xl font-bold text-stone-800">Voice Observation</h1>
        <div role="status" className="rounded-xl border border-blue-200 bg-blue-50 p-4 text-sm text-blue-900">
          Parents can view observations, but only an Anganwadi worker or administrator can record official observations.
        </div>
      </div>
    );
  }

  if (reviewing) {
    return <ObservationReviewCard
      title="Voice observation"
      method={sqliteMode ? "Text note (voice unavailable in SQLite)" : "Voice note"}
      childName={childName}
      observedAt={new Date()}
      duration={sqliteMode ? undefined : `${mm}:${ss}`}
      about={observationText}
      details={[{ label: "Domain", value: domain }, ...(activityContext ? [{ label: "Activity", value: activityContext }] : []), ...(transcript ? [{ label: "Transcript", value: transcript }] : [])]}
      saving={saving}
      error={error}
      onEdit={() => { setError(""); setReviewing(false); }}
      onSubmit={save}
    />;
  }

  return (
    <div className="mx-auto max-w-2xl space-y-5 text-stone-800">
      <button type="button" onClick={() => router.push("/observations/new")} className="inline-flex items-center gap-2 text-sm font-semibold text-stone-600 hover:text-forest"><ArrowLeft className="h-4 w-4" /> Back</button>
      <header><p className="text-xs font-bold uppercase tracking-[0.15em] text-forest">Speak about the child’s activity or behaviour</p><h1 className="mt-1 text-2xl font-bold">Voice Observation</h1></header>

      {sqliteMode && <div className="rounded-xl bg-amber-50 border border-amber-200 text-amber-900 text-sm px-4 py-3">Voice recording and transcription are unavailable in SQLite mode. You can still enter observation notes and save them as a text-based record.</div>}

      {error && <div className="rounded-xl bg-risk-red-light text-risk-red text-sm px-4 py-3">{error}</div>}

      <div className="rounded-3xl border border-[#eee5d5] bg-[#fffdf8] p-5 shadow-sm sm:p-6 space-y-5">
        <div>
          <label className="label">Child</label>
          <select className="input" value={childId} onChange={(e) => setChildId(e.target.value)}>
            {children.map((c) => <option key={c.id} value={c.id}>{c.fullName}</option>)}
          </select>
        </div>

        {/* Recorder */}
        <div className="rounded-3xl border border-[#eee8dc] bg-white px-4 py-7 text-center">
          <div className="mb-3 flex h-14 items-center justify-center gap-[3px]" aria-label={recording ? "Recording audio" : "Audio waveform preview"}>
            {Array.from({ length: 39 }, (_, i) => {
              const heights = [3,4,5,4,7,11,16,24,15,11,7,13,19,29,40,27,17,11,8,13,20,29,19,13,8,11,17,24,15,10,7,12,19,26,17,11,7,4,3];
              return <span key={i} className={`w-[3px] rounded-full ${recording && !paused ? "bg-[#368448]" : "bg-[#8ab58a]"}`} style={{ height: `${heights[i]}px` }} />;
            })}
          </div>
          <div className="text-3xl font-bold tabular-nums text-[#285c37]">{mm}:{ss}</div>
          <p className="mt-1 text-xs text-stone-500">{recording ? (paused ? "Paused" : "Recording…") : sqliteMode ? "Voice recording unavailable" : "Ready to record"}</p>
          <div className="mt-5 flex justify-center gap-3">
            {!recording ? (
              <button onClick={startRecording} disabled={sqliteMode} aria-label="Start recording" className="inline-flex h-12 items-center gap-2 rounded-full bg-[#e6f0df] px-5 font-semibold text-[#285c37] disabled:cursor-not-allowed disabled:opacity-50">
                <Mic className="w-4 h-4" /> Start
              </button>
            ) : (
              <>
                <button onClick={togglePause} aria-label={paused ? "Resume recording" : "Pause recording"} className="inline-flex h-12 w-12 items-center justify-center rounded-full border border-stone-200 bg-white">
                  {paused ? <Play className="w-4 h-4" /> : <Pause className="w-4 h-4" />}
                </button>
                <button onClick={stopRecording} aria-label="Stop recording" className="inline-flex h-12 w-12 items-center justify-center rounded-full bg-red-50 text-red-600">
                  <Square className="h-4 w-4 fill-current" />
                </button>
              </>
            )}
          </div>
        </div>

        {transcript && (
          <div>
            <label className="label">AI Transcript (review before submitting)</label>
            <div className="rounded-xl bg-purple-50 border border-purple-100 p-3 text-sm text-stone-700">
              {transcript}
              <p className="text-[10px] text-purple-500 mt-1">AI-generated — please review for accuracy.</p>
            </div>
          </div>
        )}

        <div>
          <label className="label">Developmental Domain</label>
          <select className="input" value={domain} onChange={(e) => setDomain(e.target.value)}>
            {["PHYSICAL", "COGNITIVE", "LANGUAGE", "SOCIAL", "EMOTIONAL"].map((d) => (
              <option key={d} value={d}>{d}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="label">Activity Context (optional)</label>
          <input className="input" value={activityContext} onChange={(e) => setActivityContext(e.target.value)} placeholder="e.g., Group play" />
        </div>

        <div>
          <label className="label">What did you observe? *</label>
          <textarea className="input min-h-[100px] resize-y" value={observationText} onChange={(e) => setObservationText(e.target.value)} placeholder="Describe what was observed…" required />
        </div>

        <div className="flex justify-end">
          <button onClick={() => { if (!childId) { setError("Select a child first."); return; } if (observationText.trim().length < 5) { setError("Observation notes must be at least 5 characters."); return; } setError(""); setReviewing(true); }} disabled={saving} className="inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-[#24733d] px-4 font-semibold text-white hover:bg-[#1d6033] disabled:opacity-60">
            <Save className="w-4 h-4" /> Review Observation
          </button>
        </div>
      </div>
      <div className="flex items-center justify-between rounded-2xl bg-[#f3f3e7] px-3 py-2 text-sm text-stone-600">
        <span>You can review the details before saving.</span>
        <Image src="/illustrations/child-playing-blocks.png" alt="Child playing with blocks" width={74} height={58} className="h-[58px] w-[74px] object-contain" />
      </div>
    </div>
  );
}
