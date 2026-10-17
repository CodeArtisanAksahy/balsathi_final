"use client";

import Link from "next/link";
import { useState } from "react";
import { ArrowLeft, Sprout } from "lucide-react";
import { Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis, CartesianGrid } from "recharts";
import type { SessionUser } from "@/lib/domain";
import { developmentDomains } from "@/lib/domain";
import { useStoreSelector } from "@/hooks/use-store";
import { getAuthorizedChildren, getChildProfile } from "@/lib/selectors";
import { domainLabel } from "@/lib/i18n";
import { ageLabel } from "@/lib/utils";

const colors = ["#4f8a56", "#e6a32c", "#8b65b4", "#4398b8", "#df7770"];
const periods = [{ label: "3 Months", months: 3 }, { label: "6 Months", months: 6 }, { label: "1 Year", months: 12 }];

export function ParentGrowthJourney({ session, selectedChildId }: { session: SessionUser; selectedChildId?: string }) {
  const children = useStoreSelector((state) => getAuthorizedChildren(state, session));
  const childId = selectedChildId && children.some((item) => item.id === selectedChildId) ? selectedChildId : children[0]?.id;
  const child = children.find((item) => item.id === childId);
  const profile = useStoreSelector((state) => childId ? getChildProfile(state, childId) : null);
  const [periodMonths, setPeriodMonths] = useState(3);
  if (!child || !profile) return <main className="mx-auto max-w-2xl rounded-3xl border border-[#eee8dc] bg-white p-8 text-center text-stone-500">No child record is linked to this account yet.</main>;

  const now = new Date();
  const cutoff = new Date(now);
  cutoff.setMonth(cutoff.getMonth() - periodMonths);
  const scoreAt = (domain: string, date: Date) => {
    const milestoneIds = new Set(profile.milestoneDefinitions.filter((item) => item.active && item.domain === domain).map((item) => item.id));
    const latestByMilestone = new Map<string, (typeof profile.milestoneAssessments)[number]>();
    for (const assessment of profile.milestoneAssessments.filter((row) => milestoneIds.has(row.milestoneId) && new Date(row.assessedAt) <= date).sort((a, b) => a.assessedAt.localeCompare(b.assessedAt))) latestByMilestone.set(assessment.milestoneId, assessment);
    const rows = [...latestByMilestone.values()].filter((row) => !["NOT_OBSERVED", "NOT_ASSESSED", "NOT_APPLICABLE"].includes(row.status));
    return rows.length ? Math.round(rows.filter((row) => row.status === "MET").length / rows.length * 100) : null;
  };
  const chartData = developmentDomains.map((domain) => ({ name: domainLabel(domain, session.preferredLanguage), earlier: scoreAt(domain, cutoff), now: scoreAt(domain, now) }));
  const currentScores = chartData.map((row) => row.now).filter((value): value is number => value !== null);
  const overall = currentScores.length ? Math.round(currentScores.reduce((sum, value) => sum + value, 0) / currentScores.length) : null;
  const hasAssessments = profile.milestoneAssessments.length > 0;

  return <main className="mx-auto max-w-2xl space-y-4 pb-6">
    <header className="flex items-center gap-3"><Link href="/dashboard" aria-label="Back to home" className="rounded-full p-2 text-stone-600 hover:bg-white"><ArrowLeft className="h-5 w-5" /></Link><div><h1 className="font-semibold text-stone-800">{child.fullName}&apos;s Growth</h1><p className="text-xs text-stone-500">{ageLabel(child.dateOfBirth)}</p></div></header>
    <div className="grid grid-cols-3 gap-2 rounded-2xl bg-[#f0eee8] p-1">{periods.map((period) => <button key={period.months} onClick={() => setPeriodMonths(period.months)} className={`rounded-xl px-2 py-2 text-xs font-semibold ${periodMonths === period.months ? "bg-[#24733d] text-white shadow-sm" : "text-stone-600"}`}>{period.label}</button>)}</div>
    <section className="rounded-3xl border border-[#eee8dc] bg-white p-4 shadow-sm sm:p-5">
      <div className="mb-3 flex items-center justify-between"><div><h2 className="font-semibold text-stone-800">Overall Progress</h2><p className="text-xs text-stone-500">Milestone assessments by domain</p></div><div className="flex gap-3 text-[10px] text-stone-500"><span>◌ Earlier</span><span className="font-medium text-[#386d43]">● Now</span></div></div>
      {overall === null ? <div className="my-8 rounded-2xl bg-[#fbfaf6] p-6 text-center text-sm text-stone-500">No milestone history is available to compare yet.</div> : <><div className="h-64"><ResponsiveContainer width="100%" height="100%"><LineChart data={chartData} margin={{ top: 10, right: 8, bottom: 10, left: -16 }}><CartesianGrid stroke="#eeeae2" vertical={false} /><XAxis dataKey="name" tick={{ fontSize: 10, fill: "#57534e" }} /><YAxis domain={[0, 100]} ticks={[0, 25, 50, 75, 100]} tickFormatter={(value) => `${value}%`} tick={{ fontSize: 10, fill: "#78716c" }} /><Tooltip formatter={(value) => value === null || value === undefined ? "No assessment" : [`${value}%`, "Milestones achieved"]} /><Line type="monotone" dataKey="earlier" name="Earlier" stroke="#a8a29e" strokeDasharray="4 4" strokeWidth={2} connectNulls={false} dot={{ r: 3 }} /><Line type="monotone" dataKey="now" name="Now" stroke="#4f8a56" strokeWidth={2.5} connectNulls={false} dot={{ r: 4, fill: "#4f8a56" }} /></LineChart></ResponsiveContainer></div><div className="mt-1 flex justify-between text-xs text-stone-500"><span>{cutoff.toLocaleDateString()}</span><span>{now.toLocaleDateString()}</span></div><p className="mt-3 text-center text-xs text-stone-500">{overall}% of currently assessed milestones are marked achieved. Blank points mean no assessment data for that domain/date.</p></>}
    </section>
    <section className="flex items-center gap-4 rounded-3xl bg-[#f1f6e9] p-4"><div className="flex-1"><h2 className="font-semibold text-[#315f3a]">{hasAssessments ? "Keep celebrating each step" : "Progress grows with recorded milestones"}</h2><p className="mt-1 text-xs leading-relaxed text-stone-600">{hasAssessments ? "These comparisons summarize saved assessments. They are not standardized developmental scores." : "Your Anganwadi worker can record milestone updates during regular check-ins."}</p></div><Sprout className="h-12 w-12 shrink-0 text-[#709455]" /></section>
    <Link href={`/parent/children/${child.id}/progress`} className="block text-center text-sm font-medium text-[#386d43]">View detailed progress</Link>
  </main>;
}
