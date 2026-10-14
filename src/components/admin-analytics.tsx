"use client";

import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend,
} from "recharts";
import { Activity, Baby, AlertTriangle, TrendingUp } from "lucide-react";
import type { SessionUser } from "@/lib/domain";
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

  const totalObservations = observations.length;
  const atRisk = risks.filter((r) => r.level === "HIGH").length;
  const thisWeek = observations.filter((o) => {
    const t = new Date(o.observedAt).getTime();
    return t >= WEEK_AGO_CUTOFF;
  }).length;

  const domainData = analytics.domainData.map((d) => ({
    domain: d.domain.charAt(0) + d.domain.slice(1).toLowerCase(),
    value: d.value,
  }));

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-stone-800">System Analytics</h1>

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
          <h3 className="font-semibold text-stone-800 mb-4">Observations by Domain</h3>
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
        </div>

        <div className="card p-5">
          <h3 className="font-semibold text-stone-800 mb-4">Risk Distribution</h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={analytics.riskData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} label>
                  {analytics.riskData.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                </Pie>
                <Tooltip contentStyle={{ borderRadius: 12, border: "1px solid #e7e5e4", fontSize: 12 }} />
                <Legend wrapperStyle={{ fontSize: 12 }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      <div className="card p-5">
        <h3 className="font-semibold text-stone-800 mb-4">Observation Volume (Monthly)</h3>
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={analytics.trendData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e7e5e4" vertical={false} />
              <XAxis dataKey="month" tick={{ fontSize: 11, fill: "#78716c" }} />
              <YAxis tick={{ fontSize: 11, fill: "#78716c" }} />
              <Tooltip contentStyle={{ borderRadius: 12, border: "1px solid #e7e5e4", fontSize: 12 }} />
              <Bar dataKey="observations" name="Observations" fill="#4ade80" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
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
