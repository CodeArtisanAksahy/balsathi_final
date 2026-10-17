"use client";

import { ArrowLeft, Check, Clock3, FileCheck2, Loader2 } from "lucide-react";

type Props = {
  title: string;
  method: string;
  childName: string;
  observedAt: Date;
  duration?: string;
  about: string;
  details?: Array<{ label: string; value: string }>;
  saving: boolean;
  error?: string;
  onEdit: () => void;
  onSubmit: () => void;
};

export function ObservationReviewCard({
  title, method, childName, observedAt, duration, about, details = [], saving, error, onEdit, onSubmit,
}: Props) {
  return (
    <main className="mx-auto max-w-2xl space-y-5 text-stone-800">
      <button type="button" onClick={onEdit} className="inline-flex items-center gap-2 text-sm font-semibold text-stone-600 hover:text-forest">
        <ArrowLeft className="h-4 w-4" /> Edit observation
      </button>
      <header>
        <p className="text-xs font-bold uppercase tracking-[0.16em] text-forest">Review before saving</p>
        <h1 className="mt-1 text-2xl font-bold">Review Observation</h1>
        <p className="mt-1 text-sm text-stone-500">Check the details below before adding this observation to the child’s record.</p>
      </header>

      <section className="overflow-hidden rounded-3xl border border-[#eee5d5] bg-[#fffdf8] shadow-sm">
        <div className="border-b border-[#eee5d5] px-5 py-4">
          <h2 className="font-bold">Observation Details</h2>
          <dl className="mt-3 grid gap-3 text-sm sm:grid-cols-2">
            <div><dt className="text-xs text-stone-500">Type</dt><dd className="mt-0.5 font-semibold">{method}</dd></div>
            <div><dt className="text-xs text-stone-500">Date &amp; time</dt><dd className="mt-0.5 font-semibold">{observedAt.toLocaleString()}</dd></div>
            {duration && <div><dt className="text-xs text-stone-500">Duration</dt><dd className="mt-0.5 font-semibold">{duration}</dd></div>}
            <div><dt className="text-xs text-stone-500">About</dt><dd className="mt-0.5 font-semibold">{childName}</dd></div>
          </dl>
          {details.map((item) => <p key={item.label} className="mt-2 text-sm"><span className="text-stone-500">{item.label}: </span><span className="font-medium">{item.value}</span></p>)}
          <div className="mt-4 rounded-2xl bg-white p-3">
            <p className="text-xs font-bold text-stone-500">OBSERVATION</p>
            <p className="mt-1 whitespace-pre-wrap text-sm leading-6">{about}</p>
          </div>
        </div>
        <div className="bg-[#f5f6ea] px-5 py-4">
          <h2 className="flex items-center gap-2 font-bold"><FileCheck2 className="h-4 w-4 text-forest" /> Ready to save</h2>
          <p className="mt-2 text-sm leading-5 text-stone-600">This will add the observation to the child’s record for the usual review process. Automated AI analysis is not run by this screen.</p>
          <p className="mt-2 flex items-center gap-1.5 text-xs text-stone-500"><Clock3 className="h-3.5 w-3.5" /> No separate analysis job will be submitted.</p>
        </div>
        {error && <div role="alert" className="mx-5 mt-4 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">{error}</div>}
        <div className="flex gap-3 p-5">
          <button type="button" onClick={onEdit} className="min-h-11 flex-1 rounded-xl border border-[#ddd5c7] bg-white px-4 font-semibold hover:bg-stone-50">Edit</button>
          <button type="button" onClick={onSubmit} disabled={saving} className="inline-flex min-h-11 flex-1 items-center justify-center gap-2 rounded-xl bg-[#24733d] px-4 font-semibold text-white hover:bg-[#1d6033] disabled:opacity-60">
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
            {saving ? "Saving…" : "Save Observation"}
          </button>
        </div>
      </section>
    </main>
  );
}
