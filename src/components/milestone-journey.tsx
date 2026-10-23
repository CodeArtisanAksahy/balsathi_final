"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2, Circle, Clock, Target, ArrowLeft, Check, Loader2, BookOpen, Heart, ListChecks } from "lucide-react";
import type { SessionUser, MilestoneAssessment, AssessmentStatus, MilestoneDefinition, DevelopmentDomain } from "@/lib/domain";
import { cn } from "@/lib/utils";
import { domainLabel } from "@/lib/i18n";
import { useStoreSelector } from "@/hooks/use-store";
import { getAuthorizedChildren, getChildMilestoneAssessments } from "@/lib/selectors";
import { storeActions } from "@/lib/store-actions";
import { toast } from "sonner";
import { apiFetch } from "@/lib/fetch";
import Image from "next/image";

const ageBrackets = [
  { label: "0–2 yrs", min: 0, max: 24 },
  { label: "2–3 yrs", min: 24, max: 36 },
  { label: "3–4 yrs", min: 36, max: 48 },
  { label: "4–5 yrs", min: 48, max: 60 },
  { label: "5–6 yrs", min: 60, max: 72 },
];
function ageBracketFor(dateOfBirth?: string) {
  if (!dateOfBirth) return 0;
  const ageMonths = Math.max(0, (Date.now() - new Date(dateOfBirth).getTime()) / (1000 * 60 * 60 * 24 * 30.4375));
  const index = ageBrackets.findIndex((bracket) => ageMonths >= bracket.min && ageMonths < bracket.max);
  return index < 0 ? ageBrackets.length - 1 : index;
}
const statusOptions: Array<{ value: AssessmentStatus; label: string; className: string; icon: typeof CheckCircle2 }> = [
  { value: "MET", label: "Achieved", className: "border-green-200 bg-green-50 text-green-800", icon: CheckCircle2 },
  { value: "IN_PROGRESS", label: "In Progress", className: "border-amber-200 bg-amber-50 text-amber-800", icon: Clock },
  { value: "NOT_OBSERVED", label: "Not Yet", className: "border-rose-200 bg-rose-50 text-rose-800", icon: Heart },
  { value: "NEEDS_REVIEW", label: "Not Sure", className: "border-stone-200 bg-stone-50 text-stone-700", icon: Circle },
];
export function MilestoneJourney({ session, selectedChildId, sqliteMode = false, initialChildren = [] }: { session: SessionUser; selectedChildId?: string; sqliteMode?: boolean; initialChildren?: Array<{ id: string; fullName: string; dateOfBirth: string }> }) {
  const router = useRouter();
  const demoChildren = useStoreSelector((state) => getAuthorizedChildren(state, session));
  const children = sqliteMode ? initialChildren : demoChildren;
  // Server and hydrated client stores can briefly contain different child
  // snapshots. Only honor the query selection when it exists in this user's
  // currently authorized client list; otherwise use the first authorized child.
  const childId = selectedChildId && children.some((child) => child.id === selectedChildId)
    ? selectedChildId
    : children[0]?.id ?? "";
  const selectedChild = children.find((c) => c.id === childId) ?? null;
  const storeDefinitions = useStoreSelector((state) => state.milestoneDefinitions.filter((m) => m.active));
  const storeAssessments = useStoreSelector((state) => childId ? getChildMilestoneAssessments(state, childId) : []);
  const [definitionsFromApi, setDefinitionsFromApi] = useState<MilestoneDefinition[]>([]);
  const [assessmentsFromApi, setAssessmentsFromApi] = useState<MilestoneAssessment[]>([]);
  const [ageTab, setAgeTab] = useState(() => ageBracketFor(selectedChild?.dateOfBirth));
  const [view, setView] = useState<"age" | "domain">("age");
  const [selectedDomain, setSelectedDomain] = useState<DevelopmentDomain>("PHYSICAL");
  const [editing, setEditing] = useState<MilestoneDefinition | null>(null);
  const [editStatus, setEditStatus] = useState<AssessmentStatus>("NOT_OBSERVED");
  const [editNote, setEditNote] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const definitions = sqliteMode ? definitionsFromApi : storeDefinitions;
  const assessments = sqliteMode ? assessmentsFromApi : storeAssessments;

  useEffect(() => {
    setAgeTab(ageBracketFor(selectedChild?.dateOfBirth));
  }, [childId, selectedChild?.dateOfBirth]);
  useEffect(() => {
    if (!childId) return;
    let alive = true;
    apiFetch<{ definitions: MilestoneDefinition[]; assessments?: MilestoneAssessment[] }>(`/api/milestones?childId=${encodeURIComponent(childId)}`)
      .then((data) => { if (alive) { setDefinitionsFromApi(data.definitions ?? []); setAssessmentsFromApi(data.assessments ?? []); } })
      .catch(() => { if (alive) setError("Milestones could not be loaded from the server. Please refresh and try again."); });
    return () => { alive = false; };
  }, [childId]);

  function selectChild(id: string) { router.push(`/milestones?childId=${id}`); }
  function latestAssessmentFor(milestoneId: string) { return assessments.find((a) => a.milestoneId === milestoneId); }
  function openEditor(milestone: MilestoneDefinition) {
    const existing = latestAssessmentFor(milestone.id);
    setEditing(milestone);
    setEditStatus(existing?.status ?? "NOT_OBSERVED");
    setEditNote(existing?.notes ?? "");
    setError("");
  }
  async function saveAssessment() {
    if (!editing || !childId) return;
    setSaving(true); setError("");
    try {
      if (sqliteMode) {
        const saved = await apiFetch<MilestoneAssessment>("/api/milestones", { method: "POST", body: JSON.stringify({ childId, milestoneId: editing.id, status: editStatus, notes: editNote }) });
        setAssessmentsFromApi((previous) => [saved, ...previous.filter((a) => a.milestoneId !== editing.id)]);
      } else {
        const existing = latestAssessmentFor(editing.id);
        if (existing) storeActions.updateMilestoneAssessment(session, existing.id, { status: editStatus, notes: editNote });
        else storeActions.addMilestoneAssessment(session, { childId, milestoneId: editing.id, status: editStatus, notes: editNote });
      }
      toast.success("Milestone update saved.");
      setEditing(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not save this milestone update.");
    } finally { setSaving(false); }
  }

  const ageFiltered = useMemo(() => {
    const bracket = ageBrackets[ageTab];
    return definitions.filter((m) => m.minAgeMonths < bracket.max && m.maxAgeMonths > bracket.min);
  }, [definitions, ageTab]);
  const visible = view === "age" ? ageFiltered : definitions.filter((m) => m.domain === selectedDomain);
  const completed = assessments.filter((a) => a.status === "MET").length;
  const inProgress = assessments.filter((a) => a.status === "IN_PROGRESS").length;
  const needsReview = assessments.filter((a) => a.status === "NEEDS_REVIEW").length;

  if (!children.length) return <div className="mx-auto max-w-3xl space-y-5"><h1 className="text-2xl font-bold">Milestones</h1><div className="rounded-3xl border border-[#eee5d5] bg-[#fffdf8] p-12 text-center text-stone-500">No children available.</div></div>;
  if (!selectedChild) return <div className="mx-auto max-w-3xl space-y-5"><h1 className="text-2xl font-bold">Milestones</h1><ChildSelector children={children} selectedId={childId} onSelect={selectChild} /><p>Select a child to view milestones.</p></div>;

  if (editing) {
    const title = editing.title[session.preferredLanguage] ?? editing.title.en;
    if (session.role === "PARENT") {
      const assessment = latestAssessmentFor(editing.id);
      const achieved = assessment?.status === "MET";
      const activities = editing.activities[session.preferredLanguage] ?? editing.activities.en ?? [];
      return <main className="mx-auto max-w-2xl space-y-4 text-stone-800">
        <button type="button" onClick={() => setEditing(null)} className="inline-flex items-center gap-2 text-sm font-semibold text-stone-600"><ArrowLeft className="h-4 w-4" /> Back to milestones</button>
        <section className="rounded-3xl border border-[#eee8dc] bg-white p-5 text-center shadow-sm sm:p-7">
          <div className={`mx-auto grid h-20 w-20 place-items-center rounded-full ${achieved ? "bg-[#e8f3e6] text-[#32804b]" : "bg-[#fff2dd] text-[#c37b1d]"}`}><CheckCircle2 className="h-11 w-11" /></div>
          <h1 className="mt-4 text-xl font-bold">{title}</h1>
          <p className="mt-1 font-semibold text-[#386d43]">{achieved ? "Achieved!" : statusOptions.find((item) => item.value === assessment?.status)?.label ?? "Not yet recorded"}</p>
          {assessment && <p className="mt-1 text-xs text-stone-500">Updated {new Date(assessment.assessedAt).toLocaleDateString()}</p>}
          <div className="mt-5 space-y-3 text-left">
            <div className="rounded-2xl bg-[#faf9f5] p-4"><h2 className="text-sm font-semibold">What it means</h2><p className="mt-1 text-sm leading-relaxed text-stone-600">{editing.description[session.preferredLanguage] ?? editing.description.en}</p></div>
            {activities.length > 0 && <div className="rounded-2xl bg-[#faf9f5] p-4"><h2 className="text-sm font-semibold">Examples</h2><ul className="mt-2 space-y-2">{activities.map((activity, index) => <li key={index} className="flex gap-2 text-sm text-stone-700"><span className="text-[#386d43]">•</span>{activity}</li>)}</ul></div>}
            {assessment?.notes && <div className="rounded-2xl bg-[#f7f7ef] p-4"><h2 className="text-sm font-semibold">Update note</h2><p className="mt-1 text-sm text-stone-600">{assessment.notes}</p></div>}
          </div>
          <button type="button" onClick={() => setEditing(null)} className="mt-5 min-h-12 w-full rounded-xl bg-[#24733d] px-4 font-semibold text-white">Great!</button>
        </section>
      </main>;
    }
    return <main className="mx-auto max-w-2xl space-y-5 text-stone-800">
      <button type="button" onClick={() => setEditing(null)} className="inline-flex items-center gap-2 text-sm font-semibold text-stone-600"><ArrowLeft className="h-4 w-4" /> Back to milestones</button>
      <header><p className="text-xs font-bold uppercase tracking-[0.15em] text-forest">Milestone Check</p><h1 className="mt-1 text-2xl font-bold">Update milestone</h1><p className="text-sm text-stone-500">Check and update the child’s current status.</p></header>
      <section className="space-y-5 rounded-3xl border border-[#eee5d5] bg-[#fffdf8] p-5 shadow-sm sm:p-6">
        <div className="flex gap-3 rounded-2xl bg-[#f3f5e9] p-4"><span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-white text-forest"><ListChecks className="h-5 w-5" /></span><div><h2 className="font-bold">{title}</h2><p className="mt-1 text-sm leading-5 text-stone-600">{editing.description[session.preferredLanguage] ?? editing.description.en}</p></div></div>
        <fieldset><legend className="mb-3 text-sm font-bold">How is {selectedChild.fullName} doing?</legend><div className="grid grid-cols-2 gap-2 sm:grid-cols-4">{statusOptions.map(({ value, label, className, icon: Icon }) => <button key={value} type="button" aria-pressed={editStatus === value} onClick={() => setEditStatus(value)} className={cn("flex min-h-24 flex-col items-center justify-center gap-2 rounded-2xl border p-2 text-xs font-semibold transition", editStatus === value ? className + " ring-2 ring-offset-1 ring-current" : "border-stone-200 bg-white text-stone-600 hover:bg-stone-50")}><Icon className="h-5 w-5" />{label}</button>)}</div></fieldset>
        <div><label htmlFor="milestone-note" className="mb-2 block text-sm font-semibold">Add a note (optional)</label><textarea id="milestone-note" value={editNote} maxLength={600} onChange={(e) => setEditNote(e.target.value)} className="input min-h-24 resize-y" placeholder="Add context about what you observed…" /></div>
        {error && <p role="alert" className="rounded-xl bg-red-50 p-3 text-sm text-red-800">{error}</p>}
        <button type="button" onClick={saveAssessment} disabled={saving} className="inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-[#24733d] px-4 font-semibold text-white hover:bg-[#1d6033] disabled:opacity-60">{saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}{saving ? "Saving…" : "Save Update"}</button>
      </section>
    </main>;
  }

  return <main className="mx-auto max-w-4xl space-y-5 text-stone-800">
    <header><h1 className="text-2xl font-bold">Milestone Journey</h1><p className="mt-1 text-sm text-stone-500">See and update {selectedChild.fullName}’s developmental milestones.</p></header>
    <ChildSelector children={children} selectedId={childId} onSelect={selectChild} />
    <div className="grid grid-cols-3 gap-3"><ProgressCard icon={CheckCircle2} label="Achieved" value={completed} color="bg-green-50 text-green-700" /><ProgressCard icon={Clock} label="In Progress" value={inProgress} color="bg-amber-50 text-amber-700" /><ProgressCard icon={Target} label="Needs Review" value={needsReview} color="bg-rose-50 text-rose-700" /></div>
    <section className="rounded-3xl border border-[#eee5d5] bg-[#fffdf8] p-4 shadow-sm sm:p-6">
      <div className="mb-4 flex gap-2 rounded-xl bg-[#f4f0e8] p-1"><button onClick={() => setView("age")} className={cn("flex-1 rounded-lg px-4 py-2 text-sm font-semibold", view === "age" ? "bg-white text-forest shadow-sm" : "text-stone-500")}>By Age</button><button onClick={() => setView("domain")} className={cn("flex-1 rounded-lg px-4 py-2 text-sm font-semibold", view === "domain" ? "bg-white text-forest shadow-sm" : "text-stone-500")}>By Domain</button></div>
      {view === "age" ? <div className="mb-4 flex gap-2 overflow-x-auto pb-1">{ageBrackets.map((bracket, index) => <button key={bracket.label} onClick={() => setAgeTab(index)} className={cn("shrink-0 rounded-full px-3 py-2 text-xs font-semibold", ageTab === index ? "bg-[#24733d] text-white" : "bg-[#f2eee5] text-stone-600")}>{bracket.label}</button>)}</div> : <div className="mb-4 flex gap-2 overflow-x-auto pb-1">{(["PHYSICAL", "COGNITIVE", "LANGUAGE", "SOCIAL", "EMOTIONAL"] as DevelopmentDomain[]).map((domain) => <button key={domain} onClick={() => setSelectedDomain(domain)} className={cn("shrink-0 rounded-full px-3 py-2 text-xs font-semibold", selectedDomain === domain ? "bg-[#24733d] text-white" : "bg-[#f2eee5] text-stone-600")}>{domainLabel(domain, session.preferredLanguage)}</button>)}</div>}
      {error && !editing && <p role="status" className="mb-3 rounded-xl bg-amber-50 p-3 text-sm text-amber-900">{error}</p>}
      {!definitions.length ? <p className="py-8 text-center text-sm text-stone-500">No active milestone definitions are available.</p> : !visible.length ? <p className="py-8 text-center text-sm text-stone-500">No milestones are configured for this selection.</p> : <div className="divide-y divide-[#eee8dc]">{visible.map((milestone) => {
        const assessment = latestAssessmentFor(milestone.id); const status = assessment?.status ?? "NOT_OBSERVED"; const foundStatus = statusOptions.find((s) => s.value === status) ?? statusOptions[3]; const Icon = statusIcon(status);
        return <button key={milestone.id} type="button" onClick={() => openEditor(milestone)} className="flex w-full items-center gap-3 py-3 text-left hover:bg-[#fcfaf5]">
          <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-[#f3f5e9] text-stone-600"><BookOpen className="h-4 w-4" /></span><span className="min-w-0 flex-1"><span className="block truncate text-sm font-semibold">{milestone.title[session.preferredLanguage] ?? milestone.title.en}</span><span className="mt-0.5 block text-xs text-stone-500">{domainLabel(milestone.domain, session.preferredLanguage)}</span></span><span className={cn("shrink-0 rounded-full px-2.5 py-1 text-[11px] font-bold", foundStatus.className)}><Icon className="mr-1 inline h-3 w-3" />{foundStatus.label}</span>
        </button>;
      })}</div>}
      <div className="mt-4 flex items-end justify-between"><span className="text-xs text-stone-500">{session.role === "PARENT" ? "Milestone updates are recorded by your Anganwadi worker." : "Tap a milestone to update its status"}</span><Image src="/illustrations/child-playing-blocks.png" alt="Child playing with blocks" width={88} height={68} className="h-[68px] w-[88px] object-contain" /></div>
    </section>
  </main>;
}

function statusIcon(status: AssessmentStatus) {
  if (status === "MET") return CheckCircle2;
  if (status === "IN_PROGRESS") return Clock;
  if (status === "NEEDS_REVIEW") return Circle;
  return Heart;
}
function ChildSelector({ children, selectedId, onSelect }: { children: Array<{ id: string; fullName: string }>; selectedId: string; onSelect: (id: string) => void }) {
  return <div className="flex gap-2 overflow-x-auto pb-1">{children.map((child) => <button key={child.id} onClick={() => onSelect(child.id)} className={cn("shrink-0 rounded-full px-4 py-2 text-sm font-medium", selectedId === child.id ? "bg-forest text-white" : "bg-stone-100 text-stone-600 hover:bg-stone-200")}>{child.fullName}</button>)}</div>;
}
function ProgressCard({ icon: Icon, label, value, color }: { icon: typeof CheckCircle2; label: string; value: number; color: string }) {
  return <div className="rounded-2xl border border-[#eee5d5] bg-[#fffdf8] p-3 shadow-sm"><span className={cn("mb-2 grid h-9 w-9 place-items-center rounded-xl", color)}><Icon className="h-4 w-4" /></span><p className="text-xl font-bold">{value}</p><p className="text-xs text-stone-500">{label}</p></div>;
}
