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
import { domainLabel } from "@/lib/i18n";
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
  const motherName = profile.guardians?.find((link: any) => link.relationship === "MOTHER")?.guardian?.name;
  const photoPath = child.profilePhotoPath;
  const photoUrl = photoPath?.startsWith("/api/upload/")
    ? photoPath
    : photoPath?.startsWith("uploads/")
      ? `/api/upload/${encodeURIComponent(photoPath)}`
      : null;

  return (
    <div className="space-y-3 pb-6">
      <Link href="/children" aria-label="Back to children" className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-[#e9e5d9] bg-white text-stone-600 transition hover:bg-[#f6f4ed]">
        <ArrowLeft className="h-4 w-4" />
      </Link>

      {/* Header */}
      <section className="card border-[#e9e5d9] bg-[#fffefa] p-3.5 sm:p-4">
        <div className="flex items-center gap-3 sm:gap-4">
          <div className="flex h-[76px] w-[76px] shrink-0 items-center justify-center overflow-hidden rounded-2xl bg-[#e8f1e6] text-2xl font-bold text-[#426c46] sm:h-20 sm:w-20">
            {photoUrl ? <img src={photoUrl} alt={`${child.fullName}`} className="h-full w-full object-cover" /> : child.fullName.slice(0, 2).toUpperCase()}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <h1 className="truncate text-base font-bold text-stone-800 sm:text-lg">{child.fullName}</h1>
                <p className="mt-0.5 text-xs text-stone-600">{child.gender === "UNSPECIFIED" ? "" : `${child.gender.charAt(0)}${child.gender.slice(1).toLowerCase()} · `}{ageLabel(child.dateOfBirth)}</p>
                <p className="mt-0.5 truncate text-[11px] text-stone-500">{profile.center?.name ?? "Center not assigned"}</p>
                <p className="truncate text-[11px] text-stone-500">{motherName ? `Mother: ${motherName}` : profile.assignedWorker?.name ? `Worker: ${profile.assignedWorker.name}` : "Guardian details unavailable"}</p>
              </div>
              {hasRisk && <span className="badge shrink-0 bg-[#fde8e5] text-[#b64037]"><AlertTriangle className="h-3 w-3" /> At Risk</span>}
            </div>
          </div>
        </div>
      </section>

      {/* Tabs */}
      <nav aria-label="Child profile sections" className="flex w-full justify-between overflow-x-auto border-b border-[#e9e5d9] bg-[#fffefa] px-1">
        {tabs.map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={cn(
              "shrink-0 border-b-2 px-2.5 py-2.5 text-[10px] font-medium whitespace-nowrap transition sm:px-4 sm:text-xs",
              activeTab === tab ? "border-[#4e8054] text-[#3c6843]" : "border-transparent text-stone-500 hover:text-stone-700",
            )}
          >
            {tab}
          </button>
        ))}
      </nav>

      {/* Tab content */}
      {activeTab === "Overview" && (
        <div className="space-y-3">
          <div className="card border-[#e9e5d9] bg-[#fffefa] p-3.5 sm:p-4">
            <h3 className="mb-1 font-semibold text-stone-800">Development Overview</h3>
            <p className="mb-1 text-[10px] text-stone-400">Milestone progress by developmental domain</p>
            <div className="h-64 sm:h-72">
              <ResponsiveContainer width="100%" height="100%">
                <RadarChart data={radarData}>
                  <PolarGrid stroke="#e5dfeb" />
                  <PolarAngleAxis dataKey="domain" tick={{ fontSize: 11, fill: "#645c6d" }} />
                  <PolarRadiusAxis angle={30} domain={[0, 100]} tick={{ fontSize: 9, fill: "#aaa2ad" }} axisLine={false} />
                  <Radar name="Milestone progress" dataKey="value" stroke="#8a67ad" fill="#b59ad2" fillOpacity={0.34} strokeWidth={2} />
                </RadarChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2.5 min-[500px]:grid-cols-4">
            <InfoCard icon={Calendar} label="DOB" value={formatDate(child.dateOfBirth, session.preferredLanguage)} color="bg-[#fbe9e8] text-[#bb5b55]" />
            <InfoCard icon={Activity} label="Age" value={ageLabel(child.dateOfBirth)} color="bg-[#e8f1e6] text-[#426c46]" />
            <InfoCard icon={Scale} label="Weight" value={`${profile.growth.at(-1)?.weightKg ?? "—"} kg`} color="bg-[#fff0df] text-[#b96d27]" />
            <InfoCard icon={Ruler} label="Height" value={`${profile.growth.at(-1)?.heightCm ?? "—"} cm`} color="bg-[#e6f2f8] text-[#347ea6]" />
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
    <div className="card border-[#e9e5d9] bg-[#fffefa] p-3">
      <div className="mb-2 flex items-center gap-2">
        <span className={`flex h-7 w-7 items-center justify-center rounded-lg ${color}`}><Icon className="h-4 w-4" /></span>
        <div className="text-[10px] text-stone-500">{label}</div>
      </div>
      <div className="text-sm font-semibold text-stone-800 sm:text-base">{value}</div>
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
    MET: "bg-[#e8f1e6] text-[#426c46]",
    IN_PROGRESS: "bg-[#e6f2f8] text-[#347ea6]",
    NEEDS_REVIEW: "bg-[#fff0df] text-[#a86120]",
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
