"use client";

import { useState } from "react";
import { FileText, Download, Loader2, Plus } from "lucide-react";
import type { SessionUser } from "@/lib/domain";
import { formatDate } from "@/lib/utils";
import { apiFetch, getConfiguredDataMode } from "@/lib/fetch";
import { useStoreSelector } from "@/hooks/use-store";
import { getAuthorizedChildren } from "@/lib/selectors";
import { storeActions } from "@/lib/store-actions";
import { toast } from "sonner";

export function ReportsView({ session }: { session: SessionUser }) {
  const [generating, setGenerating] = useState(false);
  const [childId, setChildId] = useState("");

  const children = useStoreSelector((state) => getAuthorizedChildren(state, session));
  const childIds = new Set(children.map((c) => c.id));
  const reports = useStoreSelector((state) =>
    state.reports
      .filter((r) => r.childId && childIds.has(r.childId))
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
  );

  async function generate() {
    if (!childId) return;
    setGenerating(true);
    try {
      if (await getConfiguredDataMode() === "sqlite") await apiFetch("/api/reports", { method: "POST", body: JSON.stringify({ childId }) });
      else storeActions.generateReport(session, childId);
      toast.success("Report generated successfully.");
    } catch (error) { toast.error(error instanceof Error ? error.message : "Could not generate report."); }
    finally {
      setGenerating(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-stone-800">Reports</h1>
        {session.role !== "PARENT" && (
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
        )}
      </div>

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
              <button className="btn-secondary flex-shrink-0">
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
