"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2, Circle, Clock, Target, ChevronRight, Save, Loader2 } from "lucide-react";
import type { SessionUser, MilestoneAssessment, MilestoneDefinition, AssessmentStatus } from "@/lib/domain";
import { assessmentStatuses } from "@/lib/domain";
import { cn } from "@/lib/utils";
import { domainLabel } from "@/lib/i18n";
import { useStoreSelector } from "@/hooks/use-store";
import { getAuthorizedChildren, getChildMilestoneAssessments } from "@/lib/selectors";
import { storeActions } from "@/lib/store-actions";
import { toast } from "sonner";
import { apiFetch, getConfiguredDataMode } from "@/lib/fetch";

export function MilestoneJourney({
  session,
  selectedChildId,
}: {
  session: SessionUser;
  selectedChildId?: string;
}) {
  const router = useRouter();
  const children = useStoreSelector((state) => getAuthorizedChildren(state, session));
  const childId = selectedChildId ?? children[0]?.id ?? "";
  const selectedChild = children.find((c) => c.id === childId) ?? null;

  const milestoneDefinitions = useStoreSelector((state) =>
    state.milestoneDefinitions.filter((m) => m.active),
  );
  const assessments = useStoreSelector((state) =>
    childId ? getChildMilestoneAssessments(state, childId) : [],
  );

  const [savingId, setSavingId] = useState<string | null>(null);

  function selectChild(id: string) {
    router.push(`/milestones?childId=${id}`);
  }

  // Find the latest assessment for a milestone (in case of multiple)
  function latestAssessmentFor(milestoneId: string): MilestoneAssessment | undefined {
    return assessments.find((a) => a.milestoneId === milestoneId);
  }

  async function setMilestoneStatus(milestoneId: string, status: AssessmentStatus) {
    if (!childId) return;
    setSavingId(milestoneId);
    try {
      const existing = latestAssessmentFor(milestoneId);
      if (await getConfiguredDataMode() === "sqlite") {
        await apiFetch("/api/milestones", { method: "POST", body: JSON.stringify({ childId, milestoneId, status, notes: existing?.notes ?? "" }) });
      } else if (existing) {
        storeActions.updateMilestoneAssessment(session, existing.id, { status });
      } else {
        storeActions.addMilestoneAssessment(session, {
          childId,
          milestoneId,
          status,
          notes: "",
        });
      }
      toast.success(`Milestone marked as ${status}.`);
    } finally {
      setSavingId(null);
    }
  }

  if (children.length === 0) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-bold text-stone-800">Milestone Journey</h1>
        <div className="card p-12 text-center text-stone-500">No children available.</div>
      </div>
    );
  }

  if (!selectedChild) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-bold text-stone-800">Milestone Journey</h1>
        <ChildSelector children={children} selectedId={childId} onSelect={selectChild} />
        <div className="card p-12 text-center text-stone-500">Select a child to view their milestone journey.</div>
      </div>
    );
  }

  // Group milestones by age bracket
  const brackets = [
    { label: "0-6 months", min: 0, max: 6 },
    { label: "6-12 months", min: 6, max: 12 },
    { label: "12-24 months", min: 12, max: 24 },
    { label: "2-3 years", min: 24, max: 36 },
    { label: "3-4 years", min: 36, max: 48 },
    { label: "4-6 years", min: 48, max: 72 },
  ];

  const completedCount = assessments.filter((a) => a.status === "MET").length;
  const inProgressCount = assessments.filter((a) => a.status === "IN_PROGRESS").length;
  const needsReviewCount = assessments.filter((a) => a.status === "NEEDS_REVIEW").length;

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-stone-800">Milestone Journey</h1>
      <ChildSelector children={children} selectedId={childId} onSelect={selectChild} />

      {/* Progress summary */}
      <div className="grid grid-cols-3 gap-4">
        <ProgressCard icon={CheckCircle2} label="Completed" value={completedCount} color="bg-forest/10 text-forest" />
        <ProgressCard icon={Clock} label="In Progress" value={inProgressCount} color="bg-blue-100 text-blue-600" />
        <ProgressCard icon={Target} label="Needs Review" value={needsReviewCount} color="bg-amber-light text-amber-700" />
      </div>

      {/* Timeline */}
      {milestoneDefinitions.length === 0 ? (
        <div role="status" className="card p-8 text-center text-stone-600">
          <p className="font-medium">Milestone tracking is not configured.</p>
          <p className="mt-2 text-sm text-stone-500">No active milestone definitions are available in this database. Ask an administrator to configure approved program definitions before recording assessments.</p>
        </div>
      ) : <div className="space-y-6">
        {brackets.map((bracket) => {
          const bracketMilestones = milestoneDefinitions.filter(
            (m) => m.minAgeMonths >= bracket.min && m.minAgeMonths < bracket.max,
          );
          if (bracketMilestones.length === 0) return null;
          const completed = bracketMilestones.filter((m) => latestAssessmentFor(m.id)?.status === "MET").length;
          const pct = Math.round((completed / bracketMilestones.length) * 100);
          return (
            <div key={bracket.label} className="card p-5">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold text-stone-800">{bracket.label}</h3>
                <span className="text-sm text-stone-500">{completed}/{bracketMilestones.length} completed</span>
              </div>
              <div className="w-full bg-stone-100 rounded-full h-2 mb-4">
                <div className="bg-forest h-2 rounded-full transition-all" style={{ width: `${pct}%` }} />
              </div>
              <div className="space-y-2">
                {bracketMilestones.map((m) => {
                  const assessment = latestAssessmentFor(m.id);
                  const status = assessment?.status ?? "NOT_OBSERVED";
                  const isSaving = savingId === m.id;
                  return (
                    <div key={m.id} className="flex items-start gap-3 p-2 rounded-lg hover:bg-stone-50">
                      <StatusIcon status={status} />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-stone-700">{m.title[session.preferredLanguage] ?? m.title.en}</p>
                        <p className="text-xs text-stone-400">{domainLabel(m.domain, session.preferredLanguage)}</p>
                      </div>
                      {session.role !== "PARENT" && (
                        <select
                          className="input text-xs py-1 max-w-[140px]"
                          value={status}
                          disabled={isSaving}
                          onChange={(e) => setMilestoneStatus(m.id, e.target.value as AssessmentStatus)}
                        >
                          {assessmentStatuses.map((s) => (
                            <option key={s} value={s}>{s.replace("_", " ")}</option>
                          ))}
                        </select>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>}
    </div>
  );
}

function ChildSelector({ children, selectedId, onSelect }: { children: Array<{ id: string; fullName: string }>; selectedId: string; onSelect: (id: string) => void }) {
  return (
    <div className="flex gap-2 overflow-x-auto pb-2">
      {children.map((c) => (
        <button
          key={c.id}
          onClick={() => onSelect(c.id)}
          className={cn(
            "px-4 py-2 rounded-xl text-sm font-medium whitespace-nowrap transition",
            selectedId === c.id ? "bg-forest text-white" : "bg-stone-100 text-stone-600 hover:bg-stone-200",
          )}
        >
          {c.fullName}
        </button>
      ))}
    </div>
  );
}

function ProgressCard({ icon: Icon, label, value, color }: { icon: any; label: string; value: number; color: string }) {
  return (
    <div className="card p-4">
      <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center mb-2", color)}>
        <Icon className="w-5 h-5" />
      </div>
      <div className="text-2xl font-bold text-stone-800">{value}</div>
      <div className="text-xs text-stone-500">{label}</div>
    </div>
  );
}

function StatusIcon({ status }: { status: string }) {
  if (status === "MET") return <CheckCircle2 className="w-5 h-5 text-forest flex-shrink-0" />;
  if (status === "IN_PROGRESS") return <Clock className="w-5 h-5 text-blue-500 flex-shrink-0" />;
  if (status === "NEEDS_REVIEW") return <Target className="w-5 h-5 text-amber-500 flex-shrink-0" />;
  return <Circle className="w-5 h-5 text-stone-300 flex-shrink-0" />;
}
