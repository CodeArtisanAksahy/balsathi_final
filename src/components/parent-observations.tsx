"use client";

import Link from "next/link";
import { ArrowLeft, ClipboardList, Image as ImageIcon, Mic } from "lucide-react";
import { useStoreSelector } from "@/hooks/use-store";
import { getAuthorizedChildren, getChildObservations } from "@/lib/selectors";
import type { SessionUser } from "@/lib/domain";
import { formatDate, formatDateTime } from "@/lib/utils";
import { domainLabel } from "@/lib/i18n";

export function ParentObservations({ session, requestedChildId }: { session: SessionUser; requestedChildId?: string }) {
  const children = useStoreSelector((state) => getAuthorizedChildren(state, session));
  const childId = requestedChildId && children.some((child) => child.id === requestedChildId) ? requestedChildId : children[0]?.id;
  const child = children.find((item) => item.id === childId);
  const observations = useStoreSelector((state) => childId ? getChildObservations(state, childId) : []);
  return <main className="mx-auto max-w-2xl space-y-4 pb-6">
    <header className="flex items-center gap-3"><Link href="/dashboard" aria-label="Back to home" className="rounded-full p-2 text-stone-600 hover:bg-white"><ArrowLeft className="h-5 w-5" /></Link><div><h1 className="font-semibold text-stone-800">Recent Observations</h1>{child && <p className="text-xs text-stone-500">{child.fullName}</p>}</div></header>
    {children.length > 1 && <nav className="flex gap-2 overflow-x-auto">{children.map((item) => <Link key={item.id} href={`/parent/observations?childId=${item.id}`} className={`shrink-0 rounded-full px-4 py-2 text-xs font-medium ${item.id === childId ? "bg-[#386d43] text-white" : "bg-white text-stone-600"}`}>{item.fullName}</Link>)}</nav>}
    <section className="space-y-3">{observations.map((observation) => { const Icon = observation.method === "VOICE" ? Mic : observation.method === "PHOTO" ? ImageIcon : ClipboardList; const title = observation.method === "VOICE" ? "Voice Note" : observation.method === "PHOTO" ? "Photo Observation" : "Text Note"; return <article key={observation.id} className="flex items-start gap-3 rounded-3xl border border-[#eee8dc] bg-white p-4 shadow-sm"><span className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-[#eaf3e8] text-[#477b4c]"><Icon className="h-5 w-5" /></span><div className="min-w-0 flex-1"><div className="flex items-start justify-between gap-2"><div><h2 className="text-sm font-semibold text-stone-800">{title}</h2><p className="mt-1 text-sm text-stone-600">{observation.observationText || observation.workerNotes || domainLabel(observation.domain, session.preferredLanguage)}</p></div><time className="shrink-0 text-[11px] text-stone-400">{formatDate(observation.observedAt, session.preferredLanguage)}</time></div><p className="mt-2 text-[11px] text-stone-400">{domainLabel(observation.domain, session.preferredLanguage)} · {formatDateTime(observation.observedAt, session.preferredLanguage)}</p>{observation.followUpRequired && <span className="mt-2 inline-flex rounded-full bg-[#fff3df] px-2 py-1 text-[10px] font-medium text-[#a86120]">Follow-up noted</span>}</div></article>; })}{!observations.length && <div className="rounded-3xl border border-[#eee8dc] bg-white p-10 text-center text-sm text-stone-500">No observations have been shared for this child yet.</div>}</section>
  </main>;
}
