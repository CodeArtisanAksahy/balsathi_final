"use client";

import {
  Database, CheckCircle2, AlertTriangle, XCircle, TrendingUp,
  FileText, Users, Baby, Activity,
} from "lucide-react";
import { cn } from "@/lib/utils";

const qualityMetrics = [
  { label: "Observations with notes", value: 92, status: "good" as const, icon: FileText },
  { label: "Children with recent obs (30d)", value: 78, status: "good" as const, icon: Activity },
  { label: "Growth measurements recorded", value: 65, status: "warning" as const, icon: TrendingUp },
  { label: "Guardian consent verified", value: 88, status: "good" as const, icon: CheckCircle2 },
  { label: "Milestone assessments completed", value: 54, status: "warning" as const, icon: Baby },
  { label: "Duplicate child records", value: 0, status: "good" as const, icon: Users },
];

const recentIssues = [
  { id: 1, type: "warning", title: "Child BAL-0004 missing consent", desc: "Guardian consent is pending for Reyansh Kumar.", time: "2 hours ago" },
  { id: 2, type: "warning", title: "No growth data for 2 children", desc: "BAL-0003 and BAL-0004 have no growth measurements.", time: "1 day ago" },
  { id: 3, type: "info", title: "3 observations pending review", desc: "Observations from this week need worker verification.", time: "3 hours ago" },
];

export default function AdminDataQualityPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2 mb-1">
        <div className="w-8 h-8 rounded-lg bg-blue-100 flex items-center justify-center">
          <Database className="w-4 h-4 text-blue-600" />
        </div>
        <h1 className="text-2xl font-bold text-stone-800">Data Quality</h1>
      </div>
      <p className="text-stone-500 text-sm">
        Monitor data completeness and quality across all centers.
      </p>

      {/* Quality score */}
      <div className="card p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold text-stone-800">Overall Data Quality Score</h3>
          <span className="text-3xl font-bold text-forest">79%</span>
        </div>
        <div className="w-full bg-stone-100 rounded-full h-3">
          <div className="bg-forest h-3 rounded-full" style={{ width: "79%" }} />
        </div>
        <p className="text-xs text-stone-400 mt-2">Based on 6 quality metrics across 2 centers</p>
      </div>

      {/* Metrics grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {qualityMetrics.map((m) => {
          const Icon = m.icon;
          return (
            <div key={m.label} className="card p-4">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <Icon className="w-4 h-4 text-stone-400" />
                  <span className="text-sm text-stone-600">{m.label}</span>
                </div>
                <StatusIcon status={m.status} />
              </div>
              <div className="flex items-end justify-between">
                <span className="text-2xl font-bold text-stone-800">{m.value}%</span>
              </div>
              <div className="w-full bg-stone-100 rounded-full h-1.5 mt-2">
                <div
                  className={cn("h-1.5 rounded-full", m.status === "good" ? "bg-forest" : "bg-amber-500")}
                  style={{ width: `${m.value}%` }}
                />
              </div>
            </div>
          );
        })}
      </div>

      {/* Recent issues */}
      <div className="card p-5">
        <h3 className="font-semibold text-stone-800 mb-4">Recent Data Quality Issues</h3>
        <div className="space-y-3">
          {recentIssues.map((issue) => (
            <div key={issue.id} className="flex items-start gap-3 p-3 rounded-xl bg-stone-50">
              {issue.type === "warning" ? (
                <AlertTriangle className="w-5 h-5 text-amber-500 flex-shrink-0 mt-0.5" />
              ) : (
                <CheckCircle2 className="w-5 h-5 text-blue-500 flex-shrink-0 mt-0.5" />
              )}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-stone-800">{issue.title}</p>
                <p className="text-xs text-stone-500 mt-0.5">{issue.desc}</p>
              </div>
              <span className="text-xs text-stone-400 flex-shrink-0">{issue.time}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function StatusIcon({ status }: { status: "good" | "warning" }) {
  if (status === "good") return <CheckCircle2 className="w-4 h-4 text-forest" />;
  return <AlertTriangle className="w-4 h-4 text-amber-500" />;
}
