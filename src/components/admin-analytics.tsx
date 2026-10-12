"use client";

import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend,
} from "recharts";
import { Activity, Users, Baby, AlertTriangle, TrendingUp } from "lucide-react";
import type { SessionUser } from "@/lib/domain";

export function AdminAnalytics({ session, stats }: { session: SessionUser; stats: any }) {
  const domainData = [
    { domain: "Physical", value: stats?.byDomain?.PHYSICAL ?? 4 },
    { domain: "Cognitive", value: stats?.byDomain?.COGNITIVE ?? 6 },
    { domain: "Language", value: stats?.byDomain?.LANGUAGE ?? 8 },
    { domain: "Social", value: stats?.byDomain?.SOCIAL ?? 3 },
    { domain: "Emotional", value: stats?.byDomain?.EMOTIONAL ?? 2 },
  ];

  const riskData = [
    { name: "No Risk", value: stats?.noRisk ?? 3, color: "#2d5a3d" },
    { name: "Needs Review", value: stats?.needsReview ?? 2, color: "#f59e0b" },
    { name: "At Risk", value: stats?.atRisk ?? 1, color: "#dc2626" },
  ];

  const trendData = [
    { day: "Mon", obs: 5 }, { day: "Tue", obs: 8 }, { day: "Wed", obs: 6 },
    { day: "Thu", obs: 12 }, { day: "Fri", obs: 9 }, { day: "Sat", obs: 4 }, { day: "Sun", obs: 2 },
  ];

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-stone-800">System Analytics</h1>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Stat icon={Baby} label="Total Children" value={stats?.totalChildren ?? 4} color="bg-forest/10 text-forest" />
        <Stat icon={Activity} label="Observations" value={stats?.totalObservations ?? 6} color="bg-blue-100 text-blue-600" />
        <Stat icon={AlertTriangle} label="At Risk" value={stats?.atRisk ?? 1} color="bg-risk-red-light text-risk-red" />
        <Stat icon={TrendingUp} label="This Week" value={stats?.thisWeek ?? 3} color="bg-purple-100 text-purple-600" />
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
                <Pie data={riskData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} label>
                  {riskData.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                </Pie>
                <Tooltip contentStyle={{ borderRadius: 12, border: "1px solid #e7e5e4", fontSize: 12 }} />
                <Legend wrapperStyle={{ fontSize: 12 }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      <div className="card p-5">
        <h3 className="font-semibold text-stone-800 mb-4">Observation Volume (This Week)</h3>
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={trendData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e7e5e4" vertical={false} />
              <XAxis dataKey="day" tick={{ fontSize: 11, fill: "#78716c" }} />
              <YAxis tick={{ fontSize: 11, fill: "#78716c" }} />
              <Tooltip contentStyle={{ borderRadius: 12, border: "1px solid #e7e5e4", fontSize: 12 }} />
              <Bar dataKey="obs" name="Observations" fill="#4ade80" radius={[6, 6, 0, 0]} />
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
