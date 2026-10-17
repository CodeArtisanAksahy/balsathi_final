"use client";

import Link from "next/link";
import { ArrowRight, Bell, CheckCircle2, ClipboardList, Heart, Image as ImageIcon, Mic, MessageCircle, TrendingUp } from "lucide-react";
import { Radar, RadarChart, PolarAngleAxis, PolarGrid, ResponsiveContainer } from "recharts";
import { useState } from "react";
import type { SessionUser } from "@/lib/domain";
import { developmentDomains } from "@/lib/domain";
import { useStoreSelector } from "@/hooks/use-store";
import { getAuthorizedChildren, getChildProfile } from "@/lib/selectors";
import { ageLabel, formatDate } from "@/lib/utils";
import { domainLabel } from "@/lib/i18n";

const domainColors = ["#4f8a56", "#e6a32c", "#8b65b4", "#4398b8", "#df7770"];

export function ParentDashboard({ session }: { session: SessionUser }) {
  const children = useStoreSelector((state) => getAuthorizedChildren(state, session));
  const [selectedChildId, setSelectedChildId] = useState<string>();
  const child = children.find((item) => item.id === selectedChildId) ?? children[0];
  const profile = useStoreSelector((state) => child ? getChildProfile(state, child.id) : null);

  if (!child || !profile) return <div className="rounded-3xl border border-[#eee8dc] bg-white p-8 text-center text-stone-500">No child profile is linked to this account yet. Contact your Anganwadi center for help.</div>;

  const domains = developmentDomains.map((domain, index) => {
    const milestones = profile.milestoneDefinitions.filter((item) => item.active && item.domain === domain);
    const ids = new Set(milestones.map((item) => item.id));
    const assessed = profile.milestoneAssessments.filter((item) => ids.has(item.milestoneId) && !["NOT_OBSERVED", "NOT_ASSESSED", "NOT_APPLICABLE"].includes(item.status));
    const achieved = assessed.filter((item) => item.status === "MET").length;
    const score = assessed.length ? Math.round(achieved / assessed.length * 100) : null;
    return { domain, value: score, color: domainColors[index] };
  });
  const available = domains.filter((item) => item.value !== null);
  const overall = available.length ? Math.round(available.reduce((sum, item) => sum + (item.value ?? 0), 0) / available.length) : null;
  const latest = profile.observations[0];
  const latestMilestone = profile.milestoneAssessments[0];
  const approvedActivities = profile.recommendations.filter((item) => item.status === "ACTIVE" && item.approvedForParent);

  return (
    <main className="mx-auto max-w-3xl space-y-4 pb-5 sm:space-y-6">
      <header className="flex items-start justify-between px-1 pt-1">
        <div>
          <div className="font-serif text-2xl font-semibold tracking-tight text-[#315f3a]">🌿 Balsathi</div>
          <p className="text-[11px] text-stone-500">Nurturing every little milestone</p>
        </div>
        <Link href="/notifications" aria-label="Notifications" className="relative rounded-full p-2 text-stone-600 hover:bg-white"><Bell className="h-5 w-5" /></Link>
      </header>

      <section className="px-1">
        <h1 className="text-xl font-bold text-stone-800">Namaste, {session.name.split(" ")[0]}! <span aria-hidden="true">👋</span></h1>
        <p className="mt-1 text-sm text-stone-500">Here&apos;s how {child.fullName.split(" ")[0]} is growing.</p>
      </section>

      {children.length > 1 && <nav aria-label="Choose child" className="flex gap-2 overflow-x-auto">{children.map((item) => <button key={item.id} onClick={() => setSelectedChildId(item.id)} className={`shrink-0 rounded-full px-4 py-2 text-xs font-medium ${item.id === child.id ? "bg-[#386d43] text-white" : "border border-[#e8e3d8] bg-white text-stone-600"}`}>{item.fullName}</button>)}</nav>}

      <Link href={`/children/${child.id}`} className="flex items-center gap-3 rounded-3xl border border-[#eee8dc] bg-white p-3.5 shadow-sm transition hover:border-[#c6d8c2]">
        <ChildAvatar name={child.fullName} photo={child.profilePhotoPath} />
        <div className="min-w-0 flex-1"><p className="truncate font-semibold text-stone-800">{child.fullName}</p><p className="text-sm text-stone-500">{ageLabel(child.dateOfBirth)}</p></div>
        <span className="inline-flex items-center gap-1 text-xs font-medium text-[#386d43]">View Profile <ArrowRight className="h-4 w-4" /></span>
      </Link>

      <section aria-label="Latest update" className="rounded-3xl border border-[#eee8dc] bg-[#f7f7ef] p-4">
        <h2 className="text-sm font-semibold text-stone-800">Latest Update</h2>
        {latest ? <div className="mt-2 flex items-start gap-2 text-sm text-stone-700"><CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-[#4f8a56]" /><div><span className="font-medium">{latest.method === "VOICE" ? "Voice note" : latest.method === "PHOTO" ? "Photo observation" : "Observation"} added</span><p className="mt-0.5 line-clamp-2 text-xs text-stone-500">{latest.observationText || latest.workerNotes || domainLabel(latest.domain, session.preferredLanguage)} · {formatDate(latest.observedAt, session.preferredLanguage)}</p></div></div> : <p className="mt-2 text-sm text-stone-500">No observations have been recorded yet.</p>}
        {latestMilestone && <div className="mt-2 flex items-center gap-2 text-xs text-stone-600"><Heart className="h-4 w-4 text-[#8b65b4]" />{latestMilestone.status === "MET" ? "A milestone was marked achieved" : "A milestone was updated"} · {formatDate(latestMilestone.assessedAt, session.preferredLanguage)}</div>}
      </section>

      <section className="rounded-3xl border border-[#eee8dc] bg-white p-4 shadow-sm sm:p-5">
        <div className="flex items-center justify-between"><div><h2 className="font-semibold text-stone-800">Development Overview</h2><p className="text-xs text-stone-500">Recorded milestone progress</p></div><Link href={`/growth?childId=${child.id}`} className="text-xs font-medium text-[#386d43]">View progress <ArrowRight className="inline h-3.5 w-3.5" /></Link></div>
        {overall === null ? <div className="my-8 rounded-2xl bg-[#fbfaf6] p-6 text-center text-sm text-stone-500">Progress will appear here after milestone assessments are recorded.</div> : <>
          <div className="mx-auto h-56 max-w-sm" role="img" aria-label={`Recorded milestone achievement across ${available.length} developmental domains`}><ResponsiveContainer width="100%" height="100%"><RadarChart data={domains.map((item) => ({ name: domainLabel(item.domain, session.preferredLanguage), score: item.value ?? 0 }))} outerRadius="68%"><PolarGrid stroke="#e9e5dc" /><PolarAngleAxis dataKey="name" tick={{ fontSize: 10, fill: "#57534e" }} /><Radar dataKey="score" stroke="#775ca8" fill="#b9a5d2" fillOpacity={0.42} strokeWidth={2} /></RadarChart></ResponsiveContainer></div>
          <p className="text-center text-xs text-stone-500">{overall}% of assessed milestones achieved across recorded domains</p>
          <div className="mt-3 space-y-2">{domains.map((item) => <div key={item.domain} className="flex items-center gap-2 text-xs"><span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: item.color }} /><span className="min-w-0 flex-1 text-stone-700">{domainLabel(item.domain, session.preferredLanguage)}</span>{item.value === null ? <span className="text-stone-400">No data</span> : <><div className="h-1.5 w-20 overflow-hidden rounded-full bg-stone-100"><div className="h-full rounded-full" style={{ width: `${item.value}%`, backgroundColor: item.color }} /></div><span className="w-9 text-right font-medium text-stone-600">{item.value}%</span></>}</div>)}</div>
        </>}
      </section>

      <section className="rounded-3xl border border-[#eee8dc] bg-white p-4 shadow-sm">
        <div className="mb-3 flex items-center justify-between"><h2 className="font-semibold text-stone-800">Recent Observations</h2><Link href={`/parent/observations?childId=${child.id}`} className="text-xs font-medium text-[#386d43]">View all</Link></div>
        <div className="space-y-2">{profile.observations.slice(0, 3).map((observation) => <Link key={observation.id} href={`/parent/observations?childId=${child.id}`} className="flex items-center gap-3 rounded-2xl bg-[#fcfbf8] p-3"><span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-[#eaf3e8] text-[#477b4c]">{observation.method === "VOICE" ? <Mic className="h-5 w-5" /> : observation.method === "PHOTO" ? <ImageIcon className="h-5 w-5" /> : <ClipboardList className="h-5 w-5" />}</span><span className="min-w-0 flex-1"><span className="block text-xs font-semibold text-stone-800">{observation.method === "VOICE" ? "Voice note" : observation.method === "PHOTO" ? "Photo observation" : "Text note"}</span><span className="block truncate text-xs text-stone-600">{observation.observationText || observation.workerNotes || domainLabel(observation.domain, session.preferredLanguage)}</span></span><span className="shrink-0 text-[10px] text-stone-400">{formatDate(observation.observedAt, session.preferredLanguage)}</span></Link>)}{profile.observations.length === 0 && <p className="rounded-xl bg-[#fcfbf8] p-4 text-center text-sm text-stone-500">No observations yet.</p>}</div>
      </section>

      <section className="grid grid-cols-2 gap-3">
        <Link href={`/parent/children/${child.id}/milestones`} className="flex items-center justify-center gap-2 rounded-2xl border border-[#d9e5d5] bg-[#f4f8f1] p-3 text-sm font-medium text-[#386d43]"><TrendingUp className="h-4 w-4" /> Milestone journey</Link>
        <Link href="/messages" className="flex items-center justify-center gap-2 rounded-2xl border border-[#dbe6ec] bg-[#f2f8fa] p-3 text-sm font-medium text-[#347ea6]"><MessageCircle className="h-4 w-4" /> Message center</Link>
      </section>
      {approvedActivities.length > 0 && <section className="rounded-3xl border border-[#eee8dc] bg-white p-4"><div className="flex items-center justify-between"><h2 className="font-semibold text-stone-800">Activities for Home</h2><Link href="/parent/activities" className="text-xs font-medium text-[#386d43]">View all</Link></div><p className="mt-1 text-sm text-stone-500">{approvedActivities[0].title}</p></section>}
    </main>
  );
}

function ChildAvatar({ name, photo }: { name: string; photo: string | null }) {
  if (photo) return <img src={photo} alt="" className="h-14 w-14 rounded-2xl object-cover" />;
  return <span className="grid h-14 w-14 shrink-0 place-items-center rounded-2xl bg-[#eaf3e8] text-lg font-semibold text-[#386d43]">{name.split(/\s+/).slice(0, 2).map((word) => word[0]).join("").toUpperCase()}</span>;
}
