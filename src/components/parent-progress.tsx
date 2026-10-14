"use client";

import Link from "next/link";
import {
  ArrowLeft, Activity, CheckCircle2, Clock, Target, Calendar,
  TrendingUp, Brain, MessageCircle, FileText,
} from "lucide-react";
import {
  RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar, ResponsiveContainer,
} from "recharts";
import type { SessionUser, Child, Observation, MilestoneAssessment, GrowthMeasurement, RiskAssessment, Recommendation } from "@/lib/domain";
import { developmentDomains } from "@/lib/domain";
import { domainLabel, getMessages } from "@/lib/i18n";
import { ageLabel, formatDate, formatDateTime, cn } from "@/lib/utils";
import { useStoreSelector } from "@/hooks/use-store";
import { getChildProfile as selectChildProfile, getAuthorizedChildren } from "@/lib/selectors";

type Profile = Awaited<ReturnType<typeof import("@/lib/data").getChildProfile>>;

export function ParentProgressView({
  session,
  profile: initialProfile,
  children: _initialChildren,
}: {
  session: SessionUser;
  profile: Profile;
  children: Array<{ id: string; fullName: string }>;
}) {
  const childId = initialProfile.child.id;
  const profile = useStoreSelector((state) => selectChildProfile(state, childId));
  const children = useStoreSelector((state) => getAuthorizedChildren(state, session));
  const t = getMessages(session.preferredLanguage);
  if (!profile) return <div className="card p-8 text-center text-stone-500">Child record not found.</div>;
  const child = profile.child;
  const locale = session.preferredLanguage;

  const radarData = developmentDomains.map((domain) => {
    const assessments = profile.milestoneAssessments.filter((a) => {
      const def = profile.milestoneDefinitions.find((m) => m.id === a.milestoneId);
      return def?.domain === domain;
    });
    const met = assessments.filter((a) => a.status === "MET").length;
    const total = assessments.filter((assessment) => !["NOT_OBSERVED", "NOT_ASSESSED", "NOT_APPLICABLE"].includes(assessment.status)).length;
    return { domain: domainLabel(domain, locale), value: total ? Math.round((met / total) * 100) : null, fullMark: 100 };
  });

  const completed = profile.milestoneAssessments.filter((a) => a.status === "MET").length;
  const inProgress = profile.milestoneAssessments.filter((a) => a.status === "IN_PROGRESS").length;
  const needsReview = profile.milestoneAssessments.filter((a) => a.status === "NEEDS_REVIEW").length;
  const lastGrowth = profile.growth[profile.growth.length - 1];

  return (
    <div className="space-y-6">
      <Link href="/children" className="inline-flex items-center gap-1 text-sm text-stone-500 hover:text-stone-700">
        <ArrowLeft className="w-4 h-4" /> Back to Children
      </Link>

      {/* Header */}
      <div className="card p-5">
        <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center">
          <div className="w-16 h-16 rounded-2xl bg-forest/15 flex items-center justify-center text-forest text-2xl font-bold flex-shrink-0">
            {child.fullName.slice(0, 2).toUpperCase()}
          </div>
          <div className="flex-1">
            <h1 className="text-xl font-bold text-stone-800">{child.fullName}</h1>
            <p className="text-sm text-stone-500">
              {ageLabel(child.dateOfBirth)} • {child.gender} • ID: {child.internalId}
            </p>
            <p className="text-sm text-stone-500">Anganwadi Center: {profile.center?.name ?? "—"}</p>
          </div>
          {profile.risks.some((r) => r.reviewRequired) && (
            <span className="badge bg-amber-light text-amber-700">
              <Target className="w-3 h-3" /> Follow-up noted
            </span>
          )}
        </div>
      </div>

      {/* Quick stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard icon={CheckCircle2} label="Milestones Met" value={completed} color="bg-forest/10 text-forest" />
        <StatCard icon={Clock} label="In Progress" value={inProgress} color="bg-blue-100 text-blue-600" />
        <StatCard icon={Activity} label="Observations" value={profile.observations.length} color="bg-purple-100 text-purple-600" />
        <StatCard icon={TrendingUp} label="Growth Records" value={profile.growth.length} color="bg-amber-light text-amber-700" />
      </div>

      {/* Development overview */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="card p-5">
          <h3 className="font-semibold text-stone-800 mb-4">Development Overview</h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <RadarChart data={radarData}>
                <PolarGrid stroke="#e7e5e4" />
                <PolarAngleAxis dataKey="domain" tick={{ fontSize: 11, fill: "#57534e" }} />
                <PolarRadiusAxis angle={30} domain={[0, 100]} tick={{ fontSize: 9, fill: "#a8a29e" }} />
                <Radar name="Progress" dataKey="value" stroke="#2d5a3d" fill="#2d5a3d" fillOpacity={0.3} strokeWidth={2} />
              </RadarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="card p-5">
          <h3 className="font-semibold text-stone-800 mb-4">Latest Growth</h3>
          {lastGrowth ? (
            <div className="space-y-3">
              <div className="flex items-center justify-between p-3 rounded-xl bg-stone-50">
                <span className="text-sm text-stone-600">Weight</span>
                <span className="font-semibold text-stone-800">{lastGrowth.weightKg} kg</span>
              </div>
              <div className="flex items-center justify-between p-3 rounded-xl bg-stone-50">
                <span className="text-sm text-stone-600">Height</span>
                <span className="font-semibold text-stone-800">{lastGrowth.heightCm} cm</span>
              </div>
              <div className="flex items-center justify-between p-3 rounded-xl bg-stone-50">
                <span className="text-sm text-stone-600">Measured on</span>
                <span className="font-medium text-stone-700">{formatDate(lastGrowth.measuredAt, locale)}</span>
              </div>
              <Link href="/growth" className="btn-secondary w-full justify-center text-sm">
                View Growth Chart
              </Link>
            </div>
          ) : (
            <p className="text-sm text-stone-400 text-center py-8">No growth measurements yet.</p>
          )}
        </div>
      </div>

      {/* Recent observations */}
      <div className="card p-5">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold text-stone-800">Recent Observations</h3>
          <Link href="/observations" className="text-xs text-forest font-medium hover:underline">View All</Link>
        </div>
        <div className="space-y-3">
          {profile.observations.slice(0, 4).map((obs) => (
            <div key={obs.id} className="flex items-start gap-3 p-3 rounded-xl bg-stone-50/60">
              <div className={cn(
                "w-2 h-2 rounded-full mt-1.5 flex-shrink-0",
                obs.followUpRequired ? "bg-amber-500" : "bg-forest",
              )} />
              <div className="min-w-0 flex-1">
                <div className="text-sm text-stone-700 line-clamp-2">{obs.observationText}</div>
                <div className="text-xs text-stone-400 mt-0.5">
                  {domainLabel(obs.domain, locale)} • {formatDateTime(obs.observedAt, locale)}
                </div>
              </div>
            </div>
          ))}
          {profile.observations.length === 0 && (
            <p className="text-sm text-stone-400 text-center py-4">No observations yet.</p>
          )}
        </div>
      </div>

      {/* Milestones summary */}
      <div className="card p-5">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold text-stone-800">Milestone Journey</h3>
          <Link href={`/milestones?childId=${child.id}`} className="text-xs text-forest font-medium hover:underline">
            View Journey
          </Link>
        </div>
        <div className="grid grid-cols-3 gap-3">
          <div className="text-center p-3 rounded-xl bg-forest/5">
            <div className="text-2xl font-bold text-forest">{completed}</div>
            <div className="text-xs text-stone-500 mt-1">Completed</div>
          </div>
          <div className="text-center p-3 rounded-xl bg-blue-50">
            <div className="text-2xl font-bold text-blue-600">{inProgress}</div>
            <div className="text-xs text-stone-500 mt-1">In Progress</div>
          </div>
          <div className="text-center p-3 rounded-xl bg-amber-50">
            <div className="text-2xl font-bold text-amber-600">{needsReview}</div>
            <div className="text-xs text-stone-500 mt-1">Needs Review</div>
          </div>
        </div>
      </div>

      {/* Recommendations */}
      {profile.recommendations.length > 0 && (
        <div className="card p-5">
          <h3 className="font-semibold text-stone-800 mb-4">Suggested Home Activities</h3>
          <div className="space-y-3">
            {profile.recommendations.filter((r) => r.approvedForParent).map((r) => (
              <div key={r.id} className="p-3 rounded-xl bg-amber-50 border border-amber-100">
                <h4 className="font-medium text-stone-800 text-sm">{r.title}</h4>
                <p className="text-sm text-stone-600 mt-1">{r.description}</p>
              </div>
            ))}
          </div>
          <Link href="/recommendations" className="btn-secondary w-full justify-center text-sm mt-4">
            All Activities
          </Link>
        </div>
      )}
    </div>
  );
}

function StatCard({ icon: Icon, label, value, color }: { icon: any; label: string; value: number; color: string }) {
  return (
    <div className="card p-4">
      <div className={cn("w-9 h-9 rounded-xl flex items-center justify-center mb-2", color)}>
        <Icon className="w-4.5 h-4.5" />
      </div>
      <div className="text-2xl font-bold text-stone-800">{value}</div>
      <div className="text-xs text-stone-500">{label}</div>
    </div>
  );
}
