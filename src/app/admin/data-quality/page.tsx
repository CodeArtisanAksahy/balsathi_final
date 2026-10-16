import { AlertTriangle, CheckCircle2, Database, FileText, Baby, Activity, TrendingUp } from "lucide-react";
import { getSession } from "@/lib/auth";
import { requirePermission } from "@/lib/authorization";
import { config } from "@/lib/config";
import { prisma } from "@/lib/prisma";

function percent(numerator: number, denominator: number) {
  return denominator ? Math.round((numerator / denominator) * 100) : null;
}

export default async function AdminDataQualityPage() {
  const session = await getSession();
  if (!session) return null;
  requirePermission(session.role, "admin:read");
  if (config.dataMode !== "sqlite") {
    return <Unavailable />;
  }

  const children = await prisma.child.findMany({
    where: { active: true, ...(session.role === "DISTRICT_ADMIN" ? {} : { centerId: { in: session.centerIds } }) },
    select: { id: true, consentStatus: true },
  });
  const childIds = children.map((child) => child.id);
  const [observations, growth, assessments] = childIds.length ? await Promise.all([
    prisma.observation.findMany({ where: { childId: { in: childIds } }, select: { childId: true, workerNotes: true, reviewStatus: true, observedAt: true } }),
    prisma.growthMeasurement.findMany({ where: { childId: { in: childIds } }, select: { childId: true } }),
    prisma.milestoneAssessment.findMany({ where: { childId: { in: childIds } }, select: { status: true } }),
  ]) : [[], [], []];
  const recentCutoff = new Date();
  recentCutoff.setDate(recentCutoff.getDate() - 30);
  const recentlyObserved = new Set(observations.filter((row) => row.observedAt >= recentCutoff).map((row) => row.childId));
  const growthChildren = new Set(growth.map((row) => row.childId));
  const consentPending = children.filter((child) => child.consentStatus !== "APPROVED").length;
  const noRecentObservation = children.filter((child) => !recentlyObserved.has(child.id)).length;
  const noGrowth = children.filter((child) => !growthChildren.has(child.id)).length;
  const pendingReview = observations.filter((row) => row.reviewStatus === "REVIEW_PENDING").length;
  const metrics = [
    { label: "Observations with worker notes", value: percent(observations.filter((row) => row.workerNotes.trim().length > 0).length, observations.length), detail: `${observations.filter((row) => row.workerNotes.trim().length > 0).length} of ${observations.length} observations`, icon: FileText },
    { label: "Children observed in the last 30 days", value: percent(recentlyObserved.size, children.length), detail: `${recentlyObserved.size} of ${children.length} active children`, icon: Activity },
    { label: "Children with growth records", value: percent(growthChildren.size, children.length), detail: `${growthChildren.size} of ${children.length} active children`, icon: TrendingUp },
    { label: "Guardian consent recorded as approved", value: percent(children.length - consentPending, children.length), detail: `${children.length - consentPending} of ${children.length} active children`, icon: CheckCircle2 },
    { label: "Milestone assessments marked met", value: percent(assessments.filter((row) => row.status === "MET").length, assessments.length), detail: `${assessments.filter((row) => row.status === "MET").length} of ${assessments.length} assessments`, icon: Baby },
  ];
  const issues = [
    ...(consentPending ? [`${consentPending} active children have consent not recorded as approved.`] : []),
    ...(noRecentObservation ? [`${noRecentObservation} active children have no observation in the last 30 days.`] : []),
    ...(noGrowth ? [`${noGrowth} active children have no growth measurement.`] : []),
    ...(pendingReview ? [`${pendingReview} observations are awaiting review.`] : []),
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2 mb-1">
        <div className="w-8 h-8 rounded-lg bg-blue-100 flex items-center justify-center"><Database className="w-4 h-4 text-blue-600" /></div>
        <h1 className="text-2xl font-bold text-stone-800">Data Quality</h1>
      </div>
      <p className="text-stone-500 text-sm">Current completeness checks for records in your authorized center scope. These are operational indicators, not clinical or compliance conclusions.</p>

      <section className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4" aria-label="Current data quality checks">
        {metrics.map(({ label, value, detail, icon: Icon }) => (
          <article key={label} className="card p-4">
            <div className="flex items-center gap-2 text-sm text-stone-600"><Icon className="w-4 h-4 text-stone-400" />{label}</div>
            <div className="mt-3 text-2xl font-bold text-stone-800">{value === null ? "—" : `${value}%`}</div>
            <p className="mt-1 text-xs text-stone-500">{detail}</p>
          </article>
        ))}
      </section>

      <section className="card p-5" aria-labelledby="data-quality-issues">
        <h2 id="data-quality-issues" className="font-semibold text-stone-800 mb-4">Current follow-up checks</h2>
        {issues.length ? <ul className="space-y-3">{issues.map((issue) => <li key={issue} className="flex items-start gap-2 text-sm text-stone-600"><AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-500" />{issue}</li>)}</ul> : <p className="text-sm text-stone-500">No outstanding completeness checks for the current records.</p>}
        {children.length === 0 && <p className="mt-3 text-sm text-stone-500">No active child records are available in this scope yet.</p>}
      </section>
    </div>
  );
}

function Unavailable() {
  return <div className="card p-8 text-sm text-stone-600">Data quality metrics require SQLite records and are unavailable in demo mode.</div>;
}
