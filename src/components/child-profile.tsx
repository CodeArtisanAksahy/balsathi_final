"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowLeft, AlertTriangle, Calendar, Scale, Ruler, Activity,
  ClipboardList, CheckSquare, FileText, Plus, Loader2,
} from "lucide-react";
import {
  RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar, ResponsiveContainer,
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
} from "recharts";
import type { SessionUser } from "@/lib/domain";
import { domainLabel, getMessages } from "@/lib/i18n";
import { ageLabel, formatDate, formatDateTime, cn } from "@/lib/utils";
import { developmentDomains } from "@/lib/domain";
import { useStoreSelector } from "@/hooks/use-store";
import { getChildProfile as selectChildProfile, getAllDomainProgress } from "@/lib/selectors";
import { storeActions } from "@/lib/store-actions";
import { toast } from "sonner";
import { apiFetch, getConfiguredDataMode } from "@/lib/fetch";

type Profile = Awaited<ReturnType<typeof import("@/lib/data").getChildProfile>>;

const tabs = ["Overview", "Observations", "Milestones", "Growth", "Reports"] as const;

export function ChildProfileView({ session, profile: _initialProfile }: { session: SessionUser; profile: { child: { id: string } } }) {
  const [activeTab, setActiveTab] = useState<(typeof tabs)[number]>("Overview");
  const childId = _initialProfile.child.id;
  const t = getMessages(session.preferredLanguage);

  // Read live profile from the reactive store
  const profile = useStoreSelector((state) => selectChildProfile(state, childId));

  // Radar chart data from milestone assessments per domain (derived from store)
  const radarData = useStoreSelector((state) => {
    return developmentDomains.map((domain) => {
      const score = getAllDomainProgress(state, childId).find((d) => d.domain === domain)?.score ?? 0;
      return { domain: domainLabel(domain, session.preferredLanguage), value: score, fullMark: 100 };
    });
  });

  if (!profile) return <p className="text-stone-500">Child not found.</p>;

  const child = profile.child;
  const risks = profile.risks;
  const hasRisk = risks.some((r) => r.reviewRequired);

  return (
    <div className="space-y-5">
      <Link href="/children" className="inline-flex items-center gap-1 text-sm text-stone-500 hover:text-stone-700">
        <ArrowLeft className="w-4 h-4" /> Back
      </Link>

      {/* Header */}
      <div className="card p-5">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="w-20 h-20 rounded-2xl bg-forest/15 flex items-center justify-center text-forest text-2xl font-bold flex-shrink-0">
            {child.fullName.slice(0, 2).toUpperCase()}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-3 flex-wrap">
              <div>
                <h1 className="text-xl font-bold text-stone-800">{child.fullName}</h1>
                <p className="text-sm text-stone-500">{child.gender} • {ageLabel(child.dateOfBirth)}</p>
                <p className="text-sm text-stone-500">Center: {profile.center?.name ?? "—"}</p>
                <p className="text-sm text-stone-500">Worker: {profile.assignedWorker?.name ?? "—"}</p>
              </div>
              {hasRisk && (
                <span className="badge bg-risk-red-light text-risk-red">
                  <AlertTriangle className="w-3 h-3" /> At Risk
                </span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-stone-100 p-1 rounded-xl w-fit overflow-x-auto">
        {tabs.map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={cn(
              "px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition",
              activeTab === tab ? "bg-white text-forest shadow-sm" : "text-stone-500 hover:text-stone-700",
            )}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* Tab content */}
      {activeTab === "Overview" && (
        <div className="space-y-5">
          <div className="card p-5">
            <h3 className="font-semibold text-stone-800 mb-4">Development Overview</h3>
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <RadarChart data={radarData}>
                  <PolarGrid stroke="#e7e5e4" />
                  <PolarAngleAxis dataKey="domain" tick={{ fontSize: 12, fill: "#57534e" }} />
                  <PolarRadiusAxis angle={30} domain={[0, 100]} tick={{ fontSize: 10, fill: "#a8a29e" }} />
                  <Radar name="Progress" dataKey="value" stroke="#2d5a3d" fill="#2d5a3d" fillOpacity={0.3} strokeWidth={2} />
                </RadarChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <InfoCard icon={Calendar} label="DOB" value={formatDate(child.dateOfBirth, session.preferredLanguage)} color="bg-forest/10 text-forest" />
            <InfoCard icon={Activity} label="Age" value={ageLabel(child.dateOfBirth)} color="bg-purple-100 text-purple-600" />
            <InfoCard icon={Scale} label="Weight" value={`${profile.growth.at(-1)?.weightKg ?? "—"} kg`} color="bg-amber-100 text-amber-600" />
            <InfoCard icon={Ruler} label="Height" value={`${profile.growth.at(-1)?.heightCm ?? "—"} cm`} color="bg-blue-100 text-blue-600" />
          </div>

          {risks.length > 0 && (
            <div className="card p-5 border-amber-200 bg-amber-50/50">
              <h3 className="font-semibold text-amber-800 mb-3 flex items-center gap-2">
                <AlertTriangle className="w-4 h-4" /> Follow-up Required
              </h3>
              {risks.map((r) => (
                <div key={r.id} className="mb-2 last:mb-0">
                  <p className="text-sm text-stone-700 font-medium">{r.title}</p>
                  <p className="text-xs text-stone-500">{r.explanation}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {activeTab === "Observations" && (
        <ObservationTab session={session} profile={profile} />
      )}

      {activeTab === "Milestones" && (
        <MilestoneTab session={session} profile={profile} />
      )}

      {activeTab === "Growth" && (
        <GrowthTab session={session} profile={profile} />
      )}

      {activeTab === "Reports" && (
        <ReportsTab session={session} profile={profile} />
      )}
    </div>
  );
}

function InfoCard({ icon: Icon, label, value, color }: { icon: any; label: string; value: string; color: string }) {
  return (
    <div className="card p-4">
      <div className={`w-9 h-9 rounded-xl ${color} flex items-center justify-center mb-2`}>
        <Icon className="w-4.5 h-4.5" />
      </div>
      <div className="text-xs text-stone-500">{label}</div>
      <div className="text-lg font-semibold text-stone-800">{value}</div>
    </div>
  );
}

function ObservationTab({ session, profile }: { session: SessionUser; profile: Profile }) {
  return (
    <div className="space-y-4">
      {session.role !== "PARENT" && (
        <Link href={`/observations/new?childId=${profile.child.id}`} className="btn-primary w-fit">
          <Plus className="w-4 h-4" /> New Observation
        </Link>
      )}
      <div className="space-y-3">
        {profile.observations.map((obs) => (
          <div key={obs.id} className="card p-4">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="badge bg-forest/10 text-forest">{obs.method}</span>
                  <span className="badge bg-stone-100 text-stone-600">{domainLabel(obs.domain, session.preferredLanguage)}</span>
                  <span className="text-xs text-stone-400">{formatDateTime(obs.observedAt, session.preferredLanguage)}</span>
                </div>
                <p className="text-sm text-stone-700 mt-2">{obs.observationText}</p>
                {obs.activityContext && (
                  <p className="text-xs text-stone-500 mt-1">Context: {obs.activityContext}</p>
                )}
                {obs.workerNotes && (
                  <p className="text-xs text-stone-500 mt-1 italic">Worker note: {obs.workerNotes}</p>
                )}
              </div>
              {obs.followUpRequired && (
                <span className="badge bg-amber-light text-amber-700 flex-shrink-0">Follow-up</span>
              )}
            </div>
          </div>
        ))}
        {profile.observations.length === 0 && (
          <div className="card p-12 text-center">
            <ClipboardList className="w-10 h-10 text-stone-300 mx-auto mb-2" />
            <p className="text-stone-500">No observations recorded yet.</p>
          </div>
        )}
      </div>
    </div>
  );
}

function MilestoneTab({ session, profile }: { session: SessionUser; profile: Profile }) {
  return (
    <div className="space-y-4">
      {profile.milestoneAssessments.map((a) => {
        const def = profile.milestoneDefinitions.find((m) => m.id === a.milestoneId);
        return (
          <div key={a.id} className="card p-4">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <h4 className="font-medium text-stone-800">{def?.title[session.preferredLanguage] ?? def?.title.en ?? "Milestone"}</h4>
                <p className="text-xs text-stone-500 mt-0.5">
                  {domainLabel(def?.domain ?? "COGNITIVE", session.preferredLanguage)} • {def?.minAgeMonths}-{def?.maxAgeMonths} months
                </p>
                {a.notes && <p className="text-sm text-stone-600 mt-2">{a.notes}</p>}
              </div>
              <StatusBadge status={a.status} />
            </div>
          </div>
        );
      })}
      {profile.milestoneAssessments.length === 0 && (
        <div className="card p-12 text-center">
          <CheckSquare className="w-10 h-10 text-stone-300 mx-auto mb-2" />
          <p className="text-stone-500">No milestone assessments yet.</p>
        </div>
      )}
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, string> = {
    MET: "bg-forest/10 text-forest",
    IN_PROGRESS: "bg-blue-100 text-blue-600",
    NEEDS_REVIEW: "bg-amber-light text-amber-700",
    NOT_OBSERVED: "bg-stone-100 text-stone-500",
    NOT_ASSESSED: "bg-stone-100 text-stone-500",
    NOT_APPLICABLE: "bg-stone-100 text-stone-500",
  };
  return <span className={cn("badge", map[status] ?? "bg-stone-100 text-stone-500")}>{status}</span>;
}

function GrowthTab({ session, profile }: { session: SessionUser; profile: Profile }) {
  const data = profile.growth.map((g) => ({
    date: formatDate(g.measuredAt, session.preferredLanguage),
    height: g.heightCm,
    weight: g.weightKg,
  }));
  return (
    <div className="space-y-4">
      <div className="card p-5">
        <h3 className="font-semibold text-stone-800 mb-4">Growth History</h3>
        {data.length > 0 ? (
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={data}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e7e5e4" vertical={false} />
                <XAxis dataKey="date" tick={{ fontSize: 11, fill: "#78716c" }} />
                <YAxis yAxisId="left" tick={{ fontSize: 11, fill: "#78716c" }} />
                <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 11, fill: "#78716c" }} />
                <Tooltip contentStyle={{ borderRadius: 12, border: "1px solid #e7e5e4", fontSize: 12 }} />
                <Legend wrapperStyle={{ fontSize: 12 }} />
                <Line yAxisId="left" type="monotone" dataKey="height" name="Height (cm)" stroke="#2d5a3d" strokeWidth={2} dot={{ r: 4 }} />
                <Line yAxisId="right" type="monotone" dataKey="weight" name="Weight (kg)" stroke="#f59e0b" strokeWidth={2} dot={{ r: 4 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <p className="text-stone-500 text-center py-8">No growth measurements recorded.</p>
        )}
      </div>
    </div>
  );
}

function ReportsTab({ session, profile }: { session: SessionUser; profile: NonNullable<ReturnType<typeof import("@/lib/selectors").getChildProfile>> }) {
  const router = useRouter();
  const [generating, setGenerating] = useState(false);

  async function generate() {
    setGenerating(true);
    try {
      if (await getConfiguredDataMode() === "sqlite") await apiFetch("/api/reports", { method: "POST", body: JSON.stringify({ childId: profile.child.id }) });
      else storeActions.generateReport(session, profile.child.id);
      toast.success("Report generated successfully.");
      // Reports are reactive via the store; no need to manually update state
    } catch (error) { toast.error(error instanceof Error ? error.message : "Could not generate report."); }
    finally {
      setGenerating(false);
    }
  }

  const reports = profile.reports;

  return (
    <div className="space-y-4">
      {session.role !== "PARENT" && (
        <button onClick={generate} disabled={generating} className="btn-primary w-fit">
          {generating ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileText className="w-4 h-4" />}
          Generate Report
        </button>
      )}
      <div className="space-y-3">
        {reports.map((r) => (
          <div key={r.id} className="card p-4">
            <div className="flex items-start justify-between">
              <div>
                <h4 className="font-medium text-stone-800">{r.title}</h4>
                <p className="text-xs text-stone-500 mt-0.5">{r.periodLabel} • {formatDate(r.createdAt, session.preferredLanguage)}</p>
              </div>
            </div>
            <p className="text-sm text-stone-600 mt-2">{r.summary}</p>
          </div>
        ))}
        {reports.length === 0 && (
          <div className="card p-12 text-center">
            <FileText className="w-10 h-10 text-stone-300 mx-auto mb-2" />
            <p className="text-stone-500">No reports generated yet.</p>
          </div>
        )}
      </div>
    </div>
  );
}
