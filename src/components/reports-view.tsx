"use client";

import { useEffect, useState } from "react";
import { FileText, Download, Loader2, Plus } from "lucide-react";
import type { ReportRecord, SessionUser } from "@/lib/domain";
import { formatDate } from "@/lib/utils";
import { apiFetch, getConfiguredDataMode } from "@/lib/fetch";
import { useStoreSelector } from "@/hooks/use-store";
import { getAuthorizedChildren } from "@/lib/selectors";
import { storeActions } from "@/lib/store-actions";
import { toast } from "sonner";
import Link from "next/link";

type ParentChildSnapshot = {
  id: string;
  fullName: string;
  observations: { id: string }[];
  assessments: { id: string; status: string }[];
  risks: { id: string; reviewRequired: boolean }[];
};

export function ReportsView({ session }: { session: SessionUser }) {
  const [generating, setGenerating] = useState(false);
  const [childId, setChildId] = useState("");
  const [databaseMode, setDatabaseMode] = useState(false);
  const [databaseReports, setDatabaseReports] = useState<ReportRecord[]>([]);
  const [reloadVersion, setReloadVersion] = useState(0);
  const [loadError, setLoadError] = useState("");
  const [parentSnapshot, setParentSnapshot] = useState<ParentChildSnapshot | null>(null);

  const children = useStoreSelector((state) => getAuthorizedChildren(state, session));
  const childIds = new Set(children.map((c) => c.id));
  const storeReports = useStoreSelector((state) =>
    state.reports
      .filter((r) => r.childId && childIds.has(r.childId))
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
  );
  useEffect(() => {
    let cancelled = false;
    let refreshTimer: number | undefined;
    const refreshReports = async () => {
      try {
        const rows = await apiFetch<ReportRecord[]>("/api/reports");
        if (!cancelled) { setDatabaseReports(rows); setLoadError(""); }
      } catch (error) {
        if (!cancelled) setLoadError(error instanceof Error ? error.message : "Could not refresh reports.");
      }
    };
    void getConfiguredDataMode().then((mode) => {
      if (cancelled || mode !== "sqlite") return;
      setDatabaseMode(true);
      void refreshReports();
      refreshTimer = window.setInterval(() => {
        if (document.visibilityState === "visible") void refreshReports();
      }, 5_000);
    }).catch((error) => {
      if (!cancelled) setLoadError(error instanceof Error ? error.message : "Could not load reports.");
    });
    return () => { cancelled = true; if (refreshTimer !== undefined) window.clearInterval(refreshTimer); };
  }, [reloadVersion]);
  const reports = databaseMode ? databaseReports : storeReports;
  const selectedChild = children.find((child) => child.id === childId) ?? children[0];
  const storeObservations = useStoreSelector((state) => state.observations.filter((observation) => observation.childId === selectedChild?.id));
  const storeMilestones = useStoreSelector((state) => state.milestoneAssessments.filter((row) => row.childId === selectedChild?.id));
  const storeRisks = useStoreSelector((state) => state.riskAssessments.filter((row) => row.childId === selectedChild?.id && row.reviewRequired));
  const useServerSnapshot = session.role === "PARENT" && databaseMode && parentSnapshot?.id === selectedChild?.id;
  const childObservations = useServerSnapshot ? parentSnapshot.observations : storeObservations;
  const childMilestones = useServerSnapshot ? parentSnapshot.assessments : storeMilestones;
  const childRisks = useServerSnapshot ? parentSnapshot.risks.filter((risk) => risk.reviewRequired) : storeRisks;
  const assessed = childMilestones.filter((row) => !["NOT_OBSERVED", "NOT_ASSESSED", "NOT_APPLICABLE"].includes(row.status));
  const progress = assessed.length ? Math.round(assessed.filter((row) => row.status === "MET").length / assessed.length * 100) : null;

  function downloadReport(report: ReportRecord) {
    const escapeHtml = (value: string) => value.replace(/[&<>"']/g, (character) => ({
      "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
    })[character] ?? character);
    const generated = new Date(report.createdAt).toLocaleString();
    const html = `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${escapeHtml(report.title)}</title>
<style>body{font:16px/1.6 system-ui,-apple-system,sans-serif;color:#292524;max-width:760px;margin:48px auto;padding:0 24px}h1{font-size:28px;margin-bottom:4px}.meta{color:#78716c;font-size:14px}.summary{white-space:pre-wrap;border-top:1px solid #e7e5e4;margin-top:24px;padding-top:20px}@media print{body{margin:20mm auto}}</style></head>
<body><h1>${escapeHtml(report.title)}</h1><div class="meta">Period: ${escapeHtml(report.periodLabel)}</div><div class="meta">Generated: ${escapeHtml(generated)}</div><main class="summary">${escapeHtml(report.summary)}</main></body></html>`;
    const blob = new Blob([html], { type: "text/html;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    const safeName = report.title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "child";
    anchor.href = url;
    anchor.download = `balsathi-report-${safeName}-${report.createdAt.slice(0, 10)}.html`;
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
    toast.success("Report downloaded to your device.");
  }

  useEffect(() => {
    if (!childId && children.length > 0) setChildId(children[0].id);
  }, [childId, children]);

  useEffect(() => {
    if (session.role !== "PARENT" || !selectedChild?.id || !databaseMode) return;
    let cancelled = false;
    const refreshChild = async () => {
      try {
        const snapshot = await apiFetch<ParentChildSnapshot>(`/api/children/${encodeURIComponent(selectedChild.id)}`);
        if (!cancelled) { setParentSnapshot(snapshot); setLoadError(""); }
      } catch (error) {
        if (!cancelled) setLoadError(error instanceof Error ? error.message : "Child records could not be refreshed.");
      }
    };
    void refreshChild();
    const timer = window.setInterval(() => { if (document.visibilityState === "visible") void refreshChild(); }, 10_000);
    const onFocus = () => void refreshChild();
    window.addEventListener("focus", onFocus);
    return () => { cancelled = true; window.clearInterval(timer); window.removeEventListener("focus", onFocus); };
  }, [databaseMode, selectedChild?.id, session.role]);

  async function generate() {
    if (!childId) return;
    setGenerating(true);
    try {
      if (await getConfiguredDataMode() === "sqlite") await apiFetch("/api/reports", { method: "POST", body: JSON.stringify({ childId }) });
      else storeActions.generateReport(session, childId);
      setReloadVersion((version) => version + 1);
      toast.success("Report generated successfully.");
    } catch (error) { toast.error(error instanceof Error ? error.message : "Could not generate report."); }
    finally {
      setGenerating(false);
    }
  }

  if (session.role === "PARENT") return <div className="mx-auto max-w-2xl space-y-4 pb-6">
    <header className="flex items-center justify-between"><div><h1 className="text-xl font-bold text-stone-800">Progress Report</h1><p className="text-sm text-stone-500">Based on saved records</p></div></header>
    {!selectedChild ? <div className="card p-8 text-center text-stone-500">No linked child record is available.</div> : <>
      <section className="card flex items-center gap-3 p-4"><div className="grid h-14 w-14 place-items-center rounded-2xl bg-[#eaf3e8] text-xl font-bold text-[#386d43]">{selectedChild.fullName.split(/\s+/).map((part) => part[0]).slice(0, 2).join("")}</div><div><h2 className="font-semibold text-stone-800">{parentSnapshot?.id === selectedChild.id ? parentSnapshot.fullName : selectedChild.fullName}</h2><p className="text-sm text-stone-500">Current child record</p><p className="mt-1 text-xs text-stone-400">{reports[0] ? `Latest report: ${reports[0].periodLabel}` : "Report period: current records"}</p></div></section>
      <section className="rounded-3xl bg-[#eff6eb] p-6 text-center"><p className="text-sm font-semibold text-stone-600">Overall Progress</p>{progress === null ? <><p className="mt-2 text-xl font-semibold text-stone-600">Not enough assessments</p><p className="mt-1 text-xs text-stone-500">A progress percentage appears after milestone assessments are recorded.</p></> : <><p className="mt-1 text-4xl font-bold text-[#287441]">{progress}%</p><p className="mt-1 text-sm text-[#386d43]">Recorded milestones marked achieved</p></>}</section>
      <section className="card grid grid-cols-3 divide-x divide-stone-100 p-4 text-center"> <Metric label="Observations" value={childObservations.length} /><Metric label="Milestones" value={`${childMilestones.filter((row) => row.status === "MET").length}/${childMilestones.length}`} /><Metric label="Follow-ups" value={childRisks.length} /></section>
      <Link href="/growth" className="btn-secondary flex justify-center">View progress details</Link>
    </>}
    {loadError && <div role="alert" className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-800">{loadError}</div>}
    <section className="space-y-3"><h2 className="font-semibold text-stone-800">Saved reports</h2>{reports.map((report) => <article key={report.id} className="card flex items-center justify-between gap-3 p-4"><div className="min-w-0"><h3 className="font-medium text-stone-800">{report.title}</h3><p className="text-xs text-stone-500">{report.periodLabel} · {formatDate(report.createdAt, session.preferredLanguage)}</p></div><button className="btn-secondary" onClick={() => downloadReport(report)} aria-label={`Download ${report.title}`}><Download className="h-4 w-4" /></button></article>)}{reports.length === 0 && <p className="card p-5 text-center text-sm text-stone-500">No saved report yet.</p>}</section>
    {reports[0] && <button className="btn-primary w-full justify-center" onClick={() => downloadReport(reports[0])}><Download className="h-4 w-4" />Download Full Report</button>}
  </div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-stone-800">Reports</h1>
          <div className="flex gap-2">
            <select className="input" value={childId} onChange={(e) => setChildId(e.target.value)}>
              <option value="">Select child…</option>
              {children.map((c) => <option key={c.id} value={c.id}>{c.fullName}</option>)}
            </select>
            <button onClick={generate} disabled={generating || !childId} className="btn-primary">
              {generating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
              Generate
            </button>
          </div>
      </div>

      {loadError && <div role="alert" className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-800">{loadError}</div>}

      <div className="space-y-3">
        {reports.map((r) => (
          <div key={r.id} className="card p-5">
            <div className="flex items-start justify-between">
              <div className="min-w-0">
                <h3 className="font-semibold text-stone-800">{r.title}</h3>
                <p className="text-sm text-stone-500 mt-0.5">
                  Period: {r.periodLabel} • Generated {formatDate(r.createdAt, session.preferredLanguage)}
                </p>
                <p className="text-sm text-stone-600 mt-3">{r.summary}</p>
              </div>
              <button className="btn-secondary flex-shrink-0" onClick={() => downloadReport(r)} aria-label={`Download ${r.title}`} title="Download report as HTML">
                <Download className="w-4 h-4" />
              </button>
            </div>
          </div>
        ))}
        {reports.length === 0 && (
          <div className="card p-12 text-center">
            <FileText className="w-12 h-12 text-stone-300 mx-auto mb-3" />
            <p className="text-stone-500">No reports yet. Generate one for a child above.</p>
          </div>
        )}
      </div>
    </div>
  );
}

function Metric({ label, value }: { label: string; value: string | number }) {
  return <div className="px-2"><p className="text-xs text-stone-500">{label}</p><p className="mt-1 text-lg font-semibold text-stone-800">{value}</p></div>;
}
