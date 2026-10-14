"use client";

import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts";
import type { SessionUser } from "@/lib/domain";
import { useStoreSelector } from "@/hooks/use-store";
import { getObservationTrends } from "@/lib/selectors";

export function AreaChartCard({ session }: { session: SessionUser }) {
  const data = useStoreSelector((state) => getObservationTrends(state, session, 6));

  const locale = session.preferredLanguage;
  const labels = locale === "hi" ? { observations: "अवलोकन", followUps: "फॉलो-अप" } : locale === "mr" ? { observations: "निरीक्षणे", followUps: "फॉलो-अप" } : { observations: "Observations", followUps: "Follow-ups" };

  return (
    <div className="card p-5">
      <h3 className="font-semibold text-stone-800 mb-4">Observation Trends</h3>
      {data.length === 0 || data.every((d) => d.observations === 0) ? (
        <div className="h-64 flex items-center justify-center text-stone-400">
          No observations recorded yet.
        </div>
      ) : (
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={data} margin={{ top: 5, right: 10, left: -10, bottom: 0 }}>
              <defs>
                <linearGradient id="obs" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#2d5a3d" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#2d5a3d" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="fu" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#f59e0b" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#e7e5e4" vertical={false} />
              <XAxis dataKey="month" tick={{ fontSize: 12, fill: "#78716c" }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 12, fill: "#78716c" }} axisLine={false} tickLine={false} allowDecimals={false} />
              <Tooltip contentStyle={{ borderRadius: 12, border: "1px solid #e7e5e4", fontSize: 12 }} />
              <Legend wrapperStyle={{ fontSize: 12 }} />
              <Area type="monotone" dataKey="observations" name={labels.observations} stroke="#2d5a3d" fill="url(#obs)" strokeWidth={2} />
              <Area type="monotone" dataKey="followUps" name={labels.followUps} stroke="#f59e0b" fill="url(#fu)" strokeWidth={2} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
}
