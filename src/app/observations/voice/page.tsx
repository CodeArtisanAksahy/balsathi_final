"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Mic, MicOff, Save, Loader2, Play, Pause } from "lucide-react";
import type { SessionUser } from "@/lib/domain";
import { apiFetch } from "@/lib/fetch";
import { getConfiguredDataMode } from "@/lib/fetch";

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
    if (!observationText.trim()) { setError("Please enter observation notes."); return; }
    setSaving(true);
    setError("");
    try {
      await apiFetch("/api/observations", {
        method: "POST",
        body: JSON.stringify({
          childId,
          observedAt: new Date().toISOString(),
          method: "VOICE",
          observationLanguage: session?.preferredLanguage ?? "en",
          domain,
          activityContext,
          observationText,
          workerNotes: transcript,
          aiTranscript: transcript,
          aiExtractedSummary: observationText.slice(0, 200),
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

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <h1 className="text-2xl font-bold text-stone-800">Voice Observation</h1>

      {sqliteMode && <div className="rounded-xl bg-amber-50 border border-amber-200 text-amber-900 text-sm px-4 py-3">Voice recording and transcription are unavailable in SQLite mode. You can still enter observation notes and save them as a text-based record.</div>}

      {error && <div className="rounded-xl bg-risk-red-light text-risk-red text-sm px-4 py-3">{error}</div>}

      <div className="card p-6 space-y-5">
        <div>
          <label className="label">Child</label>
          <select className="input" value={childId} onChange={(e) => setChildId(e.target.value)}>
            {children.map((c) => <option key={c.id} value={c.id}>{c.fullName}</option>)}
          </select>
        </div>

        {/* Recorder */}
        <div className="flex flex-col items-center py-8 bg-stone-50 rounded-xl">
          <div className={`w-20 h-20 rounded-full flex items-center justify-center mb-4 ${recording ? "bg-risk-red/10" : "bg-forest/10"}`}>
            {recording ? (
              <MicOff className={`w-8 h-8 ${paused ? "text-amber-500" : "text-risk-red"}`} />
            ) : (
              <Mic className="w-8 h-8 text-forest" />
            )}
          </div>
          <div className="text-3xl font-mono font-bold text-stone-800 mb-4">{mm}:{ss}</div>
          <div className="flex gap-3">
            {!recording ? (
              <button onClick={startRecording} className="btn-primary">
                <Mic className="w-4 h-4" /> Start Recording
              </button>
            ) : (
              <>
                <button onClick={togglePause} className="btn-secondary">
                  {paused ? <Play className="w-4 h-4" /> : <Pause className="w-4 h-4" />}
                  {paused ? "Resume" : "Pause"}
                </button>
                <button onClick={stopRecording} className="btn-primary bg-risk-red hover:bg-risk-red/90">
                  Stop
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
          <label className="label">Activity Context</label>
          <input className="input" value={activityContext} onChange={(e) => setActivityContext(e.target.value)} placeholder="e.g., Group play" />
        </div>

        <div>
          <label className="label">Observation Notes *</label>
          <textarea className="input min-h-[100px] resize-y" value={observationText} onChange={(e) => setObservationText(e.target.value)} placeholder="Describe what was observed…" required />
        </div>

        <div className="flex justify-end">
          <button onClick={save} disabled={saving} className="btn-primary">
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            Save Observation
          </button>
        </div>
      </div>
    </div>
  );
}
