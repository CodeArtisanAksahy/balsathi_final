"use client";

import { useMemo, useState } from "react";
import Image from "next/image";
import { Activity, Brain, Heart, MessageCircle, Users } from "lucide-react";
import type { DevelopmentDomain, SessionUser } from "@/lib/domain";
import { getAuthorizedChildren } from "@/lib/selectors";
import { useStoreSelector } from "@/hooks/use-store";

const ages = [6, 12, 18, 24, 30, 36];
const domains: Array<{ id: DevelopmentDomain; label: string; color: string; icon: typeof Activity }> = [
  { id: "PHYSICAL", label: "Physical", color: "#568d42", icon: Activity },
  { id: "COGNITIVE", label: "Cognitive", color: "#e39b2e", icon: Brain },
  { id: "LANGUAGE", label: "Language", color: "#3c9ec2", icon: MessageCircle },
  { id: "SOCIAL", label: "Social", color: "#8270c4", icon: Users },
  { id: "EMOTIONAL", label: "Emotional", color: "#df7774", icon: Heart },
];
const xAt = (index: number) => 10 + index * 10;
const yAt = (score: number) => 94 - score * 0.8;
const ageLabel = (months: number) => months < 12 ? `${months}m` : months % 12 === 0 ? `${months / 12}y` : `${months / 12}y`;

export function DevelopmentJourney({ session }: { session: SessionUser }) {
  const children = useStoreSelector((state) => getAuthorizedChildren(state, session));
  const assessments = useStoreSelector((state) => state.milestoneAssessments);
  const definitions = useStoreSelector((state) => state.milestoneDefinitions.filter((definition) => definition.active));
  const observations = useStoreSelector((state) => state.observations);
  const risks = useStoreSelector((state) => state.riskAssessments);
  const [selectedChildId, setSelectedChildId] = useState("");
  const child = children.find((item) => item.id === selectedChildId) ?? children[0];

  const chart = useMemo(() => {
    if (!child) return [];
    const childAssessments = assessments.filter((item) => item.childId === child.id);
    return domains.map((domain) => {
      const values = ages.map((checkpoint, ageIndex) => {
        const atCheckpoint = childAssessments.filter((item) => {
          const definition = definitions.find((candidate) => candidate.id === item.milestoneId);
          if (!definition || definition.domain !== domain.id) return false;
          const ageAtAssessment = ageAt(child.dateOfBirth, item.assessedAt);
          return ageAtAssessment <= checkpoint && checkpoint >= definition.minAgeMonths && checkpoint < definition.maxAgeMonths;
        });
        const latestByMilestone = new Map<string, (typeof atCheckpoint)[number]>();
        for (const item of atCheckpoint.sort((a, b) => a.assessedAt.localeCompare(b.assessedAt))) latestByMilestone.set(item.milestoneId, item);
        const latest = [...latestByMilestone.values()];
        const counted = latest.filter((item) => ["MET", "IN_PROGRESS", "NEEDS_REVIEW"].includes(item.status));
        if (!counted.length) return { ageIndex, score: null as number | null, state: "none" as const };
        const achieved = counted.filter((item) => item.status === "MET").length;
        const reviewMilestoneIds = new Set(latest.filter((item) => item.status === "NEEDS_REVIEW").map((item) => item.milestoneId));
        const linkedRisk = risks.some((risk) => {
          if (risk.childId !== child.id || risk.level !== "HIGH") return false;
          if (risk.sourceMilestoneId && reviewMilestoneIds.has(risk.sourceMilestoneId)) return true;
          const sourceObservation = observations.find((observation) => observation.id === risk.sourceObservationId);
          return sourceObservation?.domain === domain.id && ageAt(child.dateOfBirth, sourceObservation.observedAt) <= checkpoint;
        });
        return {
          ageIndex,
          score: Math.round((achieved / counted.length) * 100),
          state: linkedRisk ? "risk" as const : latest.some((item) => item.status === "IN_PROGRESS" || item.status === "NEEDS_REVIEW") ? "support" as const : "track" as const,
        };
      });
      return { ...domain, values };
    });
  }, [assessments, child, definitions, observations, risks]);

  const assessmentCount = child ? assessments.filter((item) => item.childId === child.id).length : 0;
  const summary = useMemo(() => {
    if (!child) return "No child is currently available in your authorized scope.";
    if (!assessmentCount) return `No milestone updates have been recorded for ${child.fullName} yet. The journey will build as assessments are saved.`;
    const current = domains.map((domain) => {
      const domainRows = assessments.filter((item) => item.childId === child.id && definitions.find((d) => d.id === item.milestoneId)?.domain === domain.id).sort((a, b) => b.assessedAt.localeCompare(a.assessedAt));
      const latestByMilestone = new Map<string, (typeof domainRows)[number]>();
      for (const row of domainRows) if (!latestByMilestone.has(row.milestoneId)) latestByMilestone.set(row.milestoneId, row);
      const latest = [...latestByMilestone.values()];
      return { domain, achieved: latest.filter((row) => row.status === "MET").length, inProgress: latest.filter((row) => row.status === "IN_PROGRESS").length, needsReview: latest.filter((row) => row.status === "NEEDS_REVIEW").length };
    }).filter((item) => item.achieved + item.inProgress + item.needsReview > 0);
    if (!current.length) return `${child.fullName} has ${assessmentCount} recorded milestone update${assessmentCount === 1 ? "" : "s"}; none are currently marked Achieved, In Progress, or Needs Review.`;
    const positive = current.filter((item) => item.achieved > 0).map((item) => item.domain.label);
    const support = current.filter((item) => item.inProgress + item.needsReview > 0).map((item) => item.domain.label);
    const statements = [positive.length ? `Updates are marked Achieved in ${joinLabels(positive)}.` : "No current milestone updates are marked Achieved.", support.length ? `In-progress or review items are recorded in ${joinLabels(support)}.` : "No in-progress or review items are recorded."];
    return statements.join(" ");
  }, [assessmentCount, assessments, child, definitions]);

  const hasPoints = chart.some((series) => series.values.some((point) => point.score !== null));

  return <section aria-label="Development Journey" className="overflow-hidden rounded-3xl border border-[#e9e4d7] bg-[#fffdf8] shadow-sm">
    <div className="flex flex-wrap items-center justify-between gap-2 px-4 pb-1 pt-4 sm:px-5">
      <div><h3 className="font-semibold text-stone-800">Development Journey</h3><p className="mt-0.5 text-[10px] text-stone-400">Recorded milestone history by age and domain</p></div>
      {children.length > 1 && <label className="sr-only" htmlFor="journey-child">Choose child</label>}
      {children.length > 1 && <select id="journey-child" value={child?.id ?? ""} onChange={(event) => setSelectedChildId(event.target.value)} className="max-w-40 rounded-lg border border-stone-200 bg-white px-2 py-1.5 text-xs text-stone-700">{children.map((item) => <option key={item.id} value={item.id}>{item.fullName}</option>)}</select>}
    </div>
    <div className="px-3 pt-2 sm:px-5">
      {!hasPoints && <p className="mb-1 text-center text-xs text-stone-500">{definitions.length ? "No dated assessments yet; the chart will fill in as milestones are updated." : "No milestone definitions or assessments are available yet."}</p>}
      <div className="grid grid-cols-[86px_minmax(0,1fr)] gap-2 sm:grid-cols-[105px_minmax(0,1fr)]">
        <div className="flex flex-col justify-around pb-6 pt-2">{domains.map(({ id, label, color, icon: Icon }) => <div key={id} className="flex items-center gap-1.5 text-[10px] font-medium text-stone-600"><span className="grid h-5 w-5 place-items-center rounded-md" style={{ backgroundColor: `${color}18`, color }}><Icon className="h-3 w-3" /></span><span>{label}</span></div>)}</div>
        <div className="min-w-0 overflow-hidden">
          <svg viewBox="0 0 100 112" role="img" aria-label="Recorded milestone achievement ratios at six-month age checkpoints" className="h-48 w-full overflow-visible sm:h-56">
            {[14, 34, 54, 74, 94].map((y) => <line key={y} x1="8" x2="98" y1={y} y2={y} stroke="#e9e5dc" strokeWidth="0.45" />)}
            {ages.map((age, index) => <g key={age}><line x1={xAt(index)} x2={xAt(index)} y1="12" y2="96" stroke="#f0ede6" strokeWidth="0.35" /><text x={xAt(index)} y="108" textAnchor="middle" fill="#7b786f" fontSize="3.5">{ageLabel(age)}</text></g>)}
            {chart.map((series) => {
              const points = series.values.filter((point) => point.score !== null).map((point) => `${xAt(point.ageIndex)},${yAt(point.score!)}`).join(" ");
              return <g key={series.id}>
                {points && <polyline points={points} fill="none" stroke={series.color} strokeWidth="0.85" strokeLinecap="round" strokeLinejoin="round" />}
                {series.values.filter((point) => point.score !== null).map((point) => {
                  const color = point.state === "risk" ? "#d84a43" : point.state === "support" ? "#e69c25" : "#36834b";
                  return <circle key={point.ageIndex} cx={xAt(point.ageIndex)} cy={yAt(point.score!)} r="1.6" fill={color} stroke="white" strokeWidth="0.7"><title>{`${series.label}, ${ageLabel(ages[point.ageIndex])}: ${point.score}% of assessed milestones achieved`}</title></circle>;
                })}
              </g>;
            })}
          </svg>
        </div>
      </div>
      <div className="-mt-1 flex flex-wrap justify-center gap-x-4 gap-y-1 pb-3 text-[10px] text-stone-600">
        <Legend color="#36834b" label="On Track: recorded milestones achieved" />
        <Legend color="#e69c25" label="Needs Support: in progress / review" />
        <Legend color="#d84a43" label="At Risk: high risk flag linked to domain" />
      </div>
      <p className="pb-3 text-center text-[10px] text-stone-400">Points use saved assessments at the child’s age. This is an activity summary, not a standardized or clinical developmental score.</p>
    </div>
    <div className="m-3 flex items-end justify-between gap-3 rounded-2xl bg-[#f3f5e8] px-4 py-3 sm:m-4">
      <div className="min-w-0"><p className="text-xs font-bold text-stone-800">Today’s Summary</p><p className="mt-1 text-xs leading-5 text-stone-600">{summary}</p></div>
      <Image src="/illustrations/child-playing-blocks.png" alt="Child playing with blocks" width={86} height={68} className="h-[68px] w-[86px] shrink-0 object-contain" />
    </div>
  </section>;
}

function ageAt(birthDate: string | Date, observedAt: string | Date) {
  const birth = new Date(birthDate);
  const assessed = new Date(observedAt);
  let months = (assessed.getUTCFullYear() - birth.getUTCFullYear()) * 12 + assessed.getUTCMonth() - birth.getUTCMonth();
  if (assessed.getUTCDate() < birth.getUTCDate()) months -= 1;
  return Math.max(0, months);
}
function joinLabels(labels: string[]) { return labels.length > 1 ? `${labels.slice(0, -1).join(", ")} and ${labels.at(-1)}` : labels[0]; }
function Legend({ color, label }: { color: string; label: string }) { return <span className="inline-flex items-center gap-1"><i className="h-2 w-2 rounded-full" style={{ backgroundColor: color }} />{label}</span>; }
