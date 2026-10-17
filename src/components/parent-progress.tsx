"use client";

import Link from "next/link";
import { useState } from "react";
import { ArrowLeft, CheckCircle2, Circle, Clock3, Sparkles } from "lucide-react";
import { useStoreSelector } from "@/hooks/use-store";
import { getChildProfile } from "@/lib/selectors";
import { developmentDomains } from "@/lib/domain";
import type { SessionUser } from "@/lib/domain";
import { domainLabel } from "@/lib/i18n";
import { ageLabel, formatDate } from "@/lib/utils";

const colors: Record<string, string> = { PHYSICAL: "#4f8a56", COGNITIVE: "#e6a32c", LANGUAGE: "#8b65b4", SOCIAL: "#4398b8", EMOTIONAL: "#df7770" };

export function ParentProgressView({ session, profile: initialProfile }: { session: SessionUser; profile: { child: { id: string } } }) {
  const childId = initialProfile.child.id;
  const profile = useStoreSelector((state) => getChildProfile(state, childId));
  const [tab, setTab] = useState<"overview" | "domains" | "timeline">("overview");
  if (!profile) return <div className="rounded-3xl bg-white p-8 text-center text-stone-500">Child record not found.</div>;

  const progress = developmentDomains.map((domain) => {
    const ids = new Set(profile.milestoneDefinitions.filter((item) => item.active && item.domain === domain).map((item) => item.id));
    const rows = profile.milestoneAssessments.filter((item) => ids.has(item.milestoneId) && !["NOT_OBSERVED", "NOT_ASSESSED", "NOT_APPLICABLE"].includes(item.status));
    const met = rows.filter((item) => item.status === "MET").length;
    return { domain, count: rows.length, met, score: rows.length ? Math.round(met / rows.length * 100) : null };
  });
  const scored = progress.filter((item) => item.score !== null);
  const overall = scored.length ? Math.round(scored.reduce((total, item) => total + (item.score ?? 0), 0) / scored.length) : null;
  const timeline = profile.milestoneAssessments.map((assessment) => ({ assessment, milestone: profile.milestoneDefinitions.find((item) => item.id === assessment.milestoneId) })).filter((item) => item.milestone).sort((a, b) => b.assessment.assessedAt.localeCompare(a.assessment.assessedAt));

  return <main className="mx-auto max-w-2xl space-y-4 pb-6">
    <header className="flex items-center gap-3"><Link href="/dashboard" aria-label="Back to home" className="rounded-full p-2 text-stone-600 hover:bg-white"><ArrowLeft className="h-5 w-5" /></Link><div className="min-w-0"><h1 className="truncate font-semibold text-stone-800">{profile.child.fullName}</h1><p className="text-xs text-stone-500">{ageLabel(profile.child.dateOfBirth)}</p></div></header>
    <nav className="grid grid-cols-3 rounded-2xl bg-[#f0eee8] p-1" aria-label="Progress views">{(["overview", "domains", "timeline"] as const).map((key) => <button key={key} onClick={() => setTab(key)} className={`rounded-xl px-2 py-2 text-sm capitalize ${tab === key ? "bg-[#eaf3e8] font-semibold text-[#386d43] shadow-sm" : "text-stone-500"}`}>{key}</button>)}</nav>

    {tab === "overview" && <section className="rounded-3xl border border-[#eee8dc] bg-white p-5 shadow-sm">
      <h2 className="font-semibold text-stone-800">Overall Progress</h2>
      {overall === null ? <p className="my-8 rounded-2xl bg-[#fbfaf6] p-6 text-center text-sm text-stone-500">Progress appears when milestone assessments are recorded.</p> : <div className="py-5 text-center"><div className="mx-auto grid h-36 w-36 place-items-center rounded-full" style={{ background: `conic-gradient(#32804b ${overall * 3.6}deg, #edf0e9 0deg)` }}><div className="grid h-28 w-28 place-content-center rounded-full bg-white"><strong className="text-3xl text-stone-800">{overall}%</strong><span className="text-xs text-[#386d43]">Assessed milestones</span></div></div><p className="mx-auto mt-4 max-w-xs text-sm text-stone-600">Based on recorded milestone assessments. This is not a clinical evaluation.</p></div>}
      <div className="mt-4 divide-y divide-stone-100">{progress.map((item) => <div key={item.domain} className="flex items-center gap-3 py-3"><span className="grid h-9 w-9 place-items-center rounded-full text-lg" style={{ backgroundColor: `${colors[item.domain]}18`, color: colors[item.domain] }}>●</span><span className="min-w-0 flex-1 text-sm font-medium text-stone-700">{domainLabel(item.domain, session.preferredLanguage)}</span>{item.score === null ? <span className="text-xs text-stone-400">No data</span> : <><div className="h-1.5 w-24 overflow-hidden rounded-full bg-stone-100"><div className="h-full rounded-full" style={{ width: `${item.score}%`, backgroundColor: colors[item.domain] }} /></div><span className="w-10 text-right text-sm font-semibold text-stone-700">{item.score}%</span></>}</div>)}</div>
    </section>}

    {tab === "domains" && <section className="space-y-3">{progress.map((item) => <article key={item.domain} className="rounded-2xl border border-[#eee8dc] bg-white p-4"><div className="flex items-center justify-between"><h2 className="font-semibold text-stone-800">{domainLabel(item.domain, session.preferredLanguage)}</h2><span className="text-sm font-semibold" style={{ color: colors[item.domain] }}>{item.score === null ? "No data" : `${item.score}%`}</span></div><p className="mt-1 text-xs text-stone-500">{item.count ? `${item.met} of ${item.count} assessed milestones achieved` : "No milestone assessments recorded for this domain."}</p></article>)}</section>}

    {tab === "timeline" && <section className="rounded-3xl border border-[#eee8dc] bg-white p-4"><h2 className="mb-3 font-semibold text-stone-800">Milestone Timeline</h2>{timeline.length ? <ol className="space-y-3">{timeline.map(({ assessment, milestone }) => <li key={assessment.id} className="flex gap-3 rounded-2xl bg-[#faf9f5] p-3"><span className={`mt-0.5 grid h-8 w-8 shrink-0 place-items-center rounded-full ${assessment.status === "MET" ? "bg-[#e6f2e4] text-[#4f8a56]" : assessment.status === "IN_PROGRESS" ? "bg-[#fff3df] text-[#d18a20]" : "bg-[#f0eafa] text-[#8b65b4]"}`}>{assessment.status === "MET" ? <CheckCircle2 className="h-4 w-4" /> : assessment.status === "IN_PROGRESS" ? <Clock3 className="h-4 w-4" /> : <Circle className="h-4 w-4" />}</span><div className="min-w-0 flex-1"><p className="text-sm font-medium text-stone-800">{milestone?.title[session.preferredLanguage] ?? milestone?.title.en}</p><p className="mt-0.5 text-xs capitalize text-stone-500">{assessment.status.toLowerCase().replaceAll("_", " ")} · {formatDate(assessment.assessedAt, session.preferredLanguage)}</p>{assessment.notes && <p className="mt-1 text-xs text-stone-600">{assessment.notes}</p>}</div></li>)}</ol> : <p className="py-10 text-center text-sm text-stone-500"><Sparkles className="mx-auto mb-2 h-6 w-6 text-[#8b65b4]" />No milestone updates recorded yet.</p>}</section>}
    <Link href={`/parent/children/${profile.child.id}/milestones`} className="flex items-center justify-center rounded-2xl border border-[#d9e5d5] bg-[#f4f8f1] p-3 text-sm font-medium text-[#386d43]">View all milestones</Link>
  </main>;
}
