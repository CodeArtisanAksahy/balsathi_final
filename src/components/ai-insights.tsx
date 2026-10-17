"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  AlertTriangle, CheckCircle2, Brain, FileText, Target, Calendar,
  ChevronRight, Clock, Sparkles, Shield, XCircle,
} from "lucide-react";
import type { SessionUser, Child, RiskAssessment, Observation, MilestoneAssessment } from "@/lib/domain";
import { domainLabel, getMessages } from "@/lib/i18n";
import { formatDate, formatDateTime, cn, ageLabel } from "@/lib/utils";
import { developmentDomains } from "@/lib/domain";

type RiskWithChild = RiskAssessment & { child: Child | undefined };

type Props = {
  session: SessionUser;
  risks: RiskWithChild[];
  observations: Observation[];
  assessments: MilestoneAssessment[];
};

export function AiInsightsView({ session, risks, observations, assessments }: Props) {
  const t = getMessages(session.preferredLanguage);
  const router = useRouter();
  const [selectedRisk, setSelectedRisk] = useState<string | null>(risks[0]?.id ?? null);
  const [dismissed, setDismissed] = useState<Set<string>>(new Set());
  const [reviewed, setReviewed] = useState<Set<string>>(new Set());

  const activeRisks = risks.filter((r) => !dismissed.has(r.id));
  const current = activeRisks.find((r) => r.id === selectedRisk) ?? activeRisks[0];

  // Domain indicators from observations
  const domainStats = developmentDomains.map((domain) => {
    const domainObs = observations.filter((o) => o.domain === domain);
    const followUps = domainObs.filter((o) => o.followUpRequired).length;
    const domainAssessments = assessments.filter((a) => {
      return true; // assessments don't have domain directly, we keep simple
    });
    return {
      domain,
      count: domainObs.length,
      followUps,
      pct: domainObs.length > 0 ? Math.round(((domainObs.length - followUps) / domainObs.length) * 100) : 0,
    };
  });

  function dismiss(id: string) {
    setDismissed((prev) => new Set(prev).add(id));
    setSelectedRisk(null);
  }

  function markReviewed(id: string) {
    setReviewed((prev) => new Set(prev).add(id));
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <div className="w-8 h-8 rounded-lg bg-purple-100 flex items-center justify-center">
              <Sparkles className="w-4 h-4 text-purple-600" />
            </div>
            <h1 className="text-2xl font-bold text-stone-800">AI Insights &amp; Risk Assessment</h1>
          </div>
          <p className="text-stone-500 text-sm">
            Illustrative indicators compiled from recorded observations and milestone assessments. Not a clinical diagnosis.
          </p>
        </div>
        <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-amber-light text-amber-700 text-xs font-medium">
          <Shield className="w-3.5 h-3.5" />
          Review before action — not a diagnosis
        </div>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <SummaryCard
          icon={AlertTriangle}
          label="Active Follow-ups"
          value={activeRisks.filter((r) => !reviewed.has(r.id)).length}
          color="bg-amber-100 text-amber-600"
          trend="Needs review"
        />
        <SummaryCard
          icon={CheckCircle2}
          label="Reviewed"
          value={reviewed.size}
          color="bg-forest/10 text-forest"
          trend="This session"
        />
        <SummaryCard
          icon={XCircle}
          label="Dismissed"
          value={dismissed.size}
          color="bg-stone-100 text-stone-500"
          trend="False flags"
        />
        <SummaryCard
          icon={FileText}
          label="Observations Analyzed"
          value={observations.length}
          color="bg-purple-100 text-purple-600"
          trend="From records"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Follow-up list */}
        <div className="card p-5 lg:col-span-1">
          <h3 className="font-semibold text-stone-800 mb-4 flex items-center gap-2">
            <Target className="w-4 h-4 text-forest" />
            Follow-up Summary
          </h3>
          <div className="space-y-2 max-h-[480px] overflow-y-auto pr-1">
            {activeRisks.length === 0 ? (
              <div className="text-center py-8 text-stone-400">
                <CheckCircle2 className="w-10 h-10 mx-auto mb-2" />
                <p className="text-sm">No active follow-ups. All clear!</p>
              </div>
            ) : (
              activeRisks.map((risk) => (
                <button
                  key={risk.id}
                  onClick={() => setSelectedRisk(risk.id)}
                  className={cn(
                    "w-full text-left p-3 rounded-xl border transition-all",
                    current?.id === risk.id
                      ? "border-forest bg-forest/5"
                      : "border-stone-200 hover:border-stone-300 hover:bg-stone-50",
                  )}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-stone-800 truncate">{risk.child?.fullName ?? "Unknown"}</p>
                      <p className="text-xs text-stone-500 truncate">{risk.title}</p>
                    </div>
                    <RiskBadge level={risk.level} />
                  </div>
                  {reviewed.has(risk.id) && (
                    <span className="inline-flex items-center gap-1 text-[10px] text-forest mt-1">
                      <CheckCircle2 className="w-3 h-3" /> Reviewed
                    </span>
                  )}
                </button>
              ))
            )}
          </div>
        </div>

        {/* Detail panel */}
        <div className="lg:col-span-2 space-y-4">
          {current ? (
            <>
              <div className="overflow-hidden rounded-3xl border border-[#eee5d5] bg-[#fffdf8] shadow-sm">
                <div className="flex items-center gap-3 bg-[#fff0e6] px-5 py-4">
                  <span className="grid h-11 w-11 place-items-center rounded-2xl bg-white/80 text-[#cf5b48]"><Brain className="h-6 w-6" /></span>
                  <div className="min-w-0 flex-1"><p className="text-[11px] font-bold uppercase tracking-[0.12em] text-[#bd5140]">AI Insight · Follow-up flag</p><h2 className="font-bold text-[#8f3e33]">{current.title}</h2></div>
                  <RiskBadge level={current.level} large />
                </div>
                <div className="p-5">
                <div className="flex items-start justify-between gap-3 mb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-full bg-forest/15 flex items-center justify-center text-forest font-bold">
                      {current.child?.fullName.slice(0, 2).toUpperCase() ?? "??"}
                    </div>
                    <div>
                      <h3 className="font-semibold text-stone-800">{current.child?.fullName}</h3>
                      <p className="text-xs text-stone-500">
                        {current.child ? ageLabel(current.child.dateOfBirth) : ""} • {current.child ? `ID: ${current.child.internalId}` : ""}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="rounded-2xl border border-[#f1e9dc] bg-white p-4 mb-4">
                  <h4 className="text-sm font-bold text-stone-800 mb-1">Why this needs attention</h4>
                  <p className="text-sm leading-6 text-stone-600">{current.explanation}</p>
                </div>

                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div className="flex items-center gap-2 text-stone-600">
                    <Calendar className="w-4 h-4 text-stone-400" />
                    <span>Flagged: {formatDate(current.createdAt, session.preferredLanguage)}</span>
                  </div>
                  <div className="flex items-center gap-2 text-stone-600">
                    <Clock className="w-4 h-4 text-stone-400" />
                    <span>Review required: {current.reviewRequired ? "Yes" : "No"}</span>
                  </div>
                </div>

                {/* Source observations */}
                <div className="mt-4">
                  <h4 className="text-sm font-semibold text-stone-700 mb-2">Recorded observations</h4>
                  <div className="space-y-2">
                    {observations
                      .filter((o) => o.childId === current.childId)
                      .slice(0, 3)
                      .map((obs) => (
                        <div key={obs.id} className="flex items-start gap-2 p-2 rounded-lg bg-stone-50">
                          <span className={cn(
                            "w-2 h-2 rounded-full mt-1.5 flex-shrink-0",
                            obs.followUpRequired ? "bg-amber-500" : "bg-forest",
                          )} />
                          <div className="min-w-0">
                            <p className="text-sm text-stone-700 line-clamp-1">{obs.observationText}</p>
                            <p className="text-xs text-stone-400">
                              {domainLabel(obs.domain, session.preferredLanguage)} • {formatDateTime(obs.observedAt, session.preferredLanguage)}
                            </p>
                          </div>
                        </div>
                      ))}
                    {observations.filter((o) => o.childId === current.childId).length === 0 && <p className="rounded-xl bg-stone-50 p-3 text-sm text-stone-500">No observation details are available to show here.</p>}
                  </div>
                </div>

                <div className="mb-4 rounded-2xl bg-[#f5f5e9] p-4">
                  <h4 className="text-sm font-bold text-stone-800">Next step</h4>
                  <p className="mt-1 text-sm leading-5 text-stone-600">Review the child’s progress with their caregiver and explore age-appropriate activities. This flag is an indicator for follow-up, not a diagnosis.</p>
                </div>

                {/* Actions */}
                <div className="flex flex-wrap gap-2 mt-5 pt-4 border-t border-stone-100">
                  {!reviewed.has(current.id) && (
                    <button onClick={() => markReviewed(current.id)} className="btn-primary">
                      <CheckCircle2 className="w-4 h-4" /> Mark Reviewed
                    </button>
                  )}
                  <Link href={`/recommendations?childId=${current.childId}`} className="inline-flex min-h-11 flex-1 items-center justify-between rounded-xl bg-[#24733d] px-4 font-semibold text-white hover:bg-[#1d6033]">
                    View Recommendations <ChevronRight className="w-4 h-4" />
                  </Link>
                  <Link href={`/children/${current.childId}`} className="btn-secondary">View Profile</Link>
                  <Link href={`/observations/new?childId=${current.childId}`} className="btn-secondary"><FileText className="w-4 h-4" /> Add Observation</Link>
                  <button
                    onClick={() => dismiss(current.id)}
                    className="btn-secondary text-stone-500 hover:text-risk-red"
                  >
                    <XCircle className="w-4 h-4" /> Dismiss Flag
                  </button>
                </div>
              </div>
              </div>
            </>
          ) : (
            <div className="card p-12 text-center">
              <CheckCircle2 className="w-12 h-12 text-forest mx-auto mb-3" />
              <h3 className="font-semibold text-stone-800">No active follow-ups</h3>
              <p className="text-stone-500 text-sm mt-1">All flagged items have been reviewed or dismissed.</p>
            </div>
          )}
        </div>
      </div>

      {/* Domain indicators */}
      <div className="card p-5">
        <h3 className="font-semibold text-stone-800 mb-4 flex items-center gap-2">
          <Brain className="w-4 h-4 text-purple-600" />
          Developmental Domain Indicators
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
          {domainStats.map((stat) => (
            <div key={stat.domain} className="p-3 rounded-xl bg-stone-50">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-stone-700">
                  {domainLabel(stat.domain, session.preferredLanguage)}
                </span>
                {stat.count === 0 ? (
                  <span className="text-[10px] text-stone-400">No data</span>
                ) : stat.followUps > 0 ? (
                  <span className="badge bg-amber-light text-amber-700">{stat.followUps} flag</span>
                ) : (
                  <CheckCircle2 className="w-4 h-4 text-forest" />
                )}
              </div>
              <div className="w-full bg-stone-200 rounded-full h-1.5 mb-1">
                <div
                  className={cn("h-1.5 rounded-full", stat.pct >= 80 ? "bg-forest" : stat.pct >= 50 ? "bg-amber-500" : "bg-risk-red")}
                  style={{ width: `${stat.pct}%` }}
                />
              </div>
              <p className="text-xs text-stone-400">{stat.count} observations</p>
            </div>
          ))}
        </div>
        <p className="text-xs text-stone-400 mt-4">
          Indicators are derived from observation follow-up flags in your authorized scope. They do not constitute a developmental diagnosis.
        </p>
      </div>
    </div>
  );
}

function SummaryCard({
  icon: Icon, label, value, color, trend,
}: { icon: any; label: string; value: number; color: string; trend: string }) {
  return (
    <div className="card p-4">
      <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center mb-2", color)}>
        <Icon className="w-5 h-5" />
      </div>
      <div className="text-2xl font-bold text-stone-800">{value}</div>
      <div className="text-xs text-stone-500">{label}</div>
      <div className="text-[11px] text-forest mt-1 font-medium">{trend}</div>
    </div>
  );
}

function RiskBadge({ level, large }: { level: string; large?: boolean }) {
  const map: Record<string, string> = {
    LOW: "bg-forest/10 text-forest",
    MODERATE: "bg-amber-light text-amber-700",
    HIGH: "bg-risk-red-light text-risk-red",
  };
  return (
    <span className={cn("badge", map[level] ?? "bg-stone-100 text-stone-600", large && "text-sm px-3 py-1")}>
      {level}
    </span>
  );
}
