"use client";

import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend,
} from "recharts";
import { Activity, Baby, AlertTriangle, TrendingUp } from "lucide-react";
import type { SessionUser } from "@/lib/domain";
import { useMemo, useState } from "react";
import { useStoreSelector } from "@/hooks/use-store";
import { getAnalyticsData, getAuthorizedChildren } from "@/lib/selectors";

// Compute the week-ago cutoff at module scope to avoid calling Date.now() during render.
const WEEK_AGO_CUTOFF = Date.now() - 1000 * 60 * 60 * 24 * 7;

export function AdminAnalytics({ session }: { session: SessionUser }) {
  const analytics = useStoreSelector((state) => getAnalyticsData(state, session));
  const children = useStoreSelector((state) => getAuthorizedChildren(state, session));
  const childIds = new Set(children.map((c) => c.id));
  const observations = useStoreSelector((state) =>
    state.observations.filter((o) => childIds.has(o.childId)),
  );
  const risks = useStoreSelector((state) =>
    state.riskAssessments.filter((r) => childIds.has(r.childId)),
  );

  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const filteredObservations = useMemo(() => observations.filter((observation) => {
    const day = observation.observedAt.slice(0, 10);
    return (!fromDate || day >= fromDate) && (!toDate || day <= toDate);
  }), [observations, fromDate, toDate]);
  const filteredRisks = useMemo(() => risks.filter((risk) => {
    const day = risk.createdAt.slice(0, 10);
    return (!fromDate || day >= fromDate) && (!toDate || day <= toDate);
  }), [risks, fromDate, toDate]);

  const totalObservations = filteredObservations.length;
  const atRisk = filteredRisks.filter((r) => r.level === "HIGH").length;
  const thisWeek = filteredObservations.filter((o) => {
    const t = new Date(o.observedAt).getTime();
    return t >= WEEK_AGO_CUTOFF;
  }).length;

  const domainData = ["PHYSICAL", "COGNITIVE", "LANGUAGE", "SOCIAL", "EMOTIONAL"].map((domain) => ({
    domain: domain.charAt(0) + domain.slice(1).toLowerCase(),
    value: filteredObservations.filter((observation) => observation.domain === domain).length,
  }));
  const trendData = [...filteredObservations.reduce((groups, observation) => {
    const month = observation.observedAt.slice(0, 7);
    groups.set(month, (groups.get(month) ?? 0) + 1);
    return groups;
  }, new Map<string, number>())].sort(([a], [b]) => a.localeCompare(b)).map(([month, count]) => ({ month, observations: count }));
  const filteredRiskData = analytics.riskData.map((item) => ({ ...item, value: item.name === "No Risk" ? Math.max(0, children.length - filteredRisks.filter((risk) => risk.reviewRequired).length) : item.name === "At Risk" ? filteredRisks.filter((risk) => risk.level === "HIGH" && risk.reviewRequired).length : filteredRisks.filter((risk) => risk.level === "MODERATE" && risk.reviewRequired).length }));

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-stone-800">System Analytics</h1>

      <div className="card p-4 flex flex-wrap items-end gap-3">
        <label className="text-xs text-stone-500">From<input type="date" className="input mt-1" value={fromDate} onChange={(event) => setFromDate(event.target.value)} /></label>
        <label className="text-xs text-stone-500">To<input type="date" className="input mt-1" value={toDate} onChange={(event) => setToDate(event.target.value)} /></label>
        {(fromDate || toDate) && <button className="btn-secondary" onClick={() => { setFromDate(""); setToDate(""); }}>Clear dates</button>}
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Stat icon={Baby} label="Total Children" value={children.length} color="bg-forest/10 text-forest" />
        <Stat icon={Activity} label="Observations" value={totalObservations} color="bg-blue-100 text-blue-600" />
        <Stat icon={AlertTriangle} label="At Risk" value={atRisk} color="bg-risk-red-light text-risk-red" />
        <Stat icon={TrendingUp} label="This Week" value={thisWeek} color="bg-purple-100 text-purple-600" />
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="card p-5">
          <h3 className="font-semibold text-stone-800 mb-1">Observations by Domain</h3>
          <p className="text-xs text-stone-400 mb-4">Source: recorded observation records • Values update when records change.</p>
          {totalObservations === 0 ? <div className="h-64 flex items-center justify-center text-stone-400">No observation data available.</div> :
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={domainData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e7e5e4" vertical={false} />
                <XAxis dataKey="domain" tick={{ fontSize: 11, fill: "#78716c" }} />
                <YAxis tick={{ fontSize: 11, fill: "#78716c" }} />
                <Tooltip contentStyle={{ borderRadius: 12, border: "1px solid #e7e5e4", fontSize: 12 }} />
                <Bar dataKey="value" fill="#2d5a3d" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
          }
        </div>

        <div className="card p-5">
          <h3 className="font-semibold text-stone-800 mb-1">Risk Distribution</h3>
          <p className="text-xs text-stone-400 mb-4">Source: follow-up risk records • Values update when records change.</p>
          {filteredRisks.length === 0 ? <div className="h-64 flex items-center justify-center text-stone-400">No risk assessment data available for this period.</div> :
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={filteredRiskData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} label>
                  {filteredRiskData.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                </Pie>
                <Tooltip contentStyle={{ borderRadius: 12, border: "1px solid #e7e5e4", fontSize: 12 }} />
                <Legend wrapperStyle={{ fontSize: 12 }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
          }
        </div>
      </div>

      <div className="card p-5">
        <h3 className="font-semibold text-stone-800 mb-1">Observation Volume (Monthly)</h3>
        <p className="text-xs text-stone-400 mb-4">Source: observation records • Values update when records change.</p>
        {totalObservations === 0 ? <div className="h-64 flex items-center justify-center text-stone-400">No observations recorded for this period.</div> :
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
              <BarChart data={trendData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e7e5e4" vertical={false} />
              <XAxis dataKey="month" tick={{ fontSize: 11, fill: "#78716c" }} />
              <YAxis tick={{ fontSize: 11, fill: "#78716c" }} />
              <Tooltip contentStyle={{ borderRadius: 12, border: "1px solid #e7e5e4", fontSize: 12 }} />
              <Bar dataKey="observations" name="Observations" fill="#4ade80" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
        }
      </div>
    </div>
  );
}

function Stat({ icon: Icon, label, value, color }: { icon: any; label: string; value: number; color: string }) {
  return (
    <div className="card p-4">
      <div className={`w-10 h-10 rounded-xl flex items-center justify-center mb-2 ${color}`}>
        <Icon className="w-5 h-5" />
      </div>
      <div className="text-2xl font-bold text-stone-800">{value}</div>
      <div className="text-xs text-stone-500">{label}</div>
    </div>
  );
}
