"use client";

import { useEffect, useState } from "react";
import { AlertCircle, BrainCircuit, CircleHelp, LoaderCircle } from "lucide-react";
import type { SessionUser } from "@/lib/domain";
import { apiFetch } from "@/lib/fetch";

type TaskStatus = {
  ready: boolean;
  artifact_loaded: boolean;
  state: string;
  model_version: string | null;
  target: string;
  features: string[];
  training_source: string;
  limitations: string;
  reason: string | null;
};
type Readiness = { service: string; ready: boolean; experimental_only: boolean; tasks: Record<string, TaskStatus>; message?: string };

const taskLabels: Record<string, { title: string; target: string; currentGap: string }> = {
  ngo: {
    title: "Worker follow-up",
    target: "requires_admin_followup",
    currentGap: "Worker experience years are not stored in the worker profile, so the app cannot safely build this model input.",
  },
  parent: {
    title: "Parent engagement",
    target: "engagement_level",
    currentGap: "The app does not track materials accessed. Session records also do not establish the notebook’s portal-login feature semantics.",
  },
  child: {
    title: "Child review screener",
    target: "warrants_professional_review",
    currentGap: "The notebook’s last export selected a dummy baseline for this target. It is not enabled as a child screening model.",
  },
};

export function MLModelReadiness({ session }: { session: SessionUser }) {
  const [state, setState] = useState<{ status: "loading" } | { status: "ok"; data: Readiness } | { status: "error"; message: string }>({ status: "loading" });

  useEffect(() => {
    let cancelled = false;
    void apiFetch<Readiness>("/api/v1/analytics/model-status")
      .then((data) => { if (!cancelled) setState({ status: "ok", data }); })
      .catch((error) => { if (!cancelled) setState({ status: "error", message: error instanceof Error ? error.message : "Model readiness could not be loaded." }); });
    return () => { cancelled = true; };
  }, [session.id]);

  return <section className="card p-5" aria-labelledby="ml-readiness-heading">
    <div className="flex items-start gap-3">
      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#f0e9fa] text-[#7954ad]"><BrainCircuit className="h-5 w-5" /></span>
      <div className="min-w-0 flex-1">
        <h2 id="ml-readiness-heading" className="font-semibold text-stone-800">Notebook model integration</h2>
        <p className="mt-1 text-xs leading-5 text-stone-500">The supplied NGO, parent, and child classifiers were trained on synthetic demonstration data. These results are experimental and are not validated for real-world decisions.</p>
      </div>
    </div>

    {state.status === "loading" ? <div role="status" className="mt-4 flex items-center gap-2 text-sm text-stone-500"><LoaderCircle className="h-4 w-4 animate-spin" />Checking private model service and artifacts…</div> : null}
    {state.status === "error" ? <div role="alert" className="mt-4 flex items-start gap-2 rounded-xl bg-risk-red-light p-3 text-sm text-risk-red"><AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />{state.message}</div> : null}
    {state.status === "ok" ? <>
      {state.data.message && <p role="status" className="mt-4 rounded-xl bg-amber-50 p-3 text-sm text-amber-900">{state.data.message}</p>}
      <div className="mt-4 grid gap-3 lg:grid-cols-3">
        {Object.entries(taskLabels).map(([id, item]) => {
          const model = state.data.tasks?.[id];
          const ready = model?.ready === true;
          return <article key={id} className="rounded-xl border border-stone-200 bg-[#fffefa] p-4">
            <div className="flex items-center justify-between gap-2"><h3 className="text-sm font-semibold text-stone-800">{item.title}</h3><span className={`rounded-full px-2 py-1 text-[10px] font-semibold ${ready ? "bg-amber-100 text-amber-800" : "bg-stone-100 text-stone-600"}`}>{ready ? "Experimental" : "Unavailable"}</span></div>
            <p className="mt-2 text-xs text-stone-500">Target: <code>{item.target}</code></p>
            <p className="mt-2 text-xs leading-5 text-stone-600">{item.currentGap}</p>
            {!model && <p className="mt-2 text-xs leading-5 text-stone-500">{state.data.message ?? "No readiness data was returned for this model."}</p>}
            {model && !ready && model.reason && <p className="mt-2 text-xs leading-5 text-stone-500">{model.reason}</p>}
            {model?.model_version && <p className="mt-2 text-[11px] text-stone-400">Version {model.model_version}</p>}
          </article>;
        })}
      </div>
      <p className="mt-4 flex items-start gap-2 text-[11px] leading-5 text-stone-400"><CircleHelp className="mt-0.5 h-3.5 w-3.5 shrink-0" />The separate aggregate observation-volume forecast remains in the analytics chart above. It does not score individual children or replace professional judgment.</p>
    </> : null}
  </section>;
}
