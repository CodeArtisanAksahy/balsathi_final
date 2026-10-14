"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip } from "recharts";
import type { SessionUser, GrowthMeasurement, Child } from "@/lib/domain";
import { formatDate } from "@/lib/utils";
import { cn } from "@/lib/utils";
import { useStoreSelector } from "@/hooks/use-store";
import { getAuthorizedChildren, getChildGrowth } from "@/lib/selectors";

export function GrowthComparison({
  session,
  selectedChildId,
}: {
  session: SessionUser;
  selectedChildId?: string;
}) {
  const router = useRouter();
  const children = useStoreSelector((state) => getAuthorizedChildren(state, session));
  const childId = selectedChildId ?? children[0]?.id ?? "";
  const [metric, setMetric] = useState<"height" | "weight">("weight");

  function selectChild(id: string) {
    router.push(`/growth?childId=${id}`);
  }

  const selectedChild = children.find((c) => c.id === childId) ?? null;
  const growth = useStoreSelector((state) =>
    childId ? getChildGrowth(state, childId) : [],
  );

  if (children.length === 0) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-bold text-stone-800">Growth Comparison</h1>
        <div className="card p-12 text-center text-stone-500">No children available.</div>
      </div>
    );
  }

  if (!selectedChild) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-bold text-stone-800">Growth Comparison</h1>
        <ChildSelector children={children} selectedId={childId} onSelect={selectChild} />
        <div className="card p-12 text-center text-stone-500">Select a child to view growth data.</div>
      </div>
    );
  }

  function bmiFor(g: GrowthMeasurement): number | null {
    if (!g.heightCm || g.heightCm <= 0) return null;
    const heightM = g.heightCm / 100;
    return g.weightKg / (heightM * heightM);
  }

  const data = growth.map((g) => ({
    date: formatDate(g.measuredAt, session.preferredLanguage),
    value: metric === "height" ? g.heightCm : g.weightKg,
    bmi: bmiFor(g),
  }));

  const last = growth[growth.length - 1];

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-stone-800">Growth Comparison</h1>

      <ChildSelector children={children} selectedId={childId} onSelect={selectChild} />

      {/* Current measurements */}
      {last && (
        <div className="grid grid-cols-3 gap-4">
          <div className="card p-4">
            <div className="text-xs text-stone-500">Weight</div>
            <div className="text-2xl font-bold text-stone-800">{last.weightKg} kg</div>
            <div className="text-xs text-stone-400">{formatDate(last.measuredAt, session.preferredLanguage)}</div>
          </div>
          <div className="card p-4">
            <div className="text-xs text-stone-500">Height</div>
            <div className="text-2xl font-bold text-stone-800">{last.heightCm} cm</div>
            <div className="text-xs text-stone-400">{formatDate(last.measuredAt, session.preferredLanguage)}</div>
          </div>
          <div className="card p-4">
            <div className="text-xs text-stone-500">BMI</div>
            <div className="text-2xl font-bold text-stone-800">{bmiFor(last)?.toFixed(1) ?? "—"}</div>
            <div className="text-xs text-stone-400">kg/m²</div>
          </div>
        </div>
      )}

      {/* Metric toggle */}
      <div className="flex gap-2">
        <button onClick={() => setMetric("weight")} className={cn("btn-secondary", metric === "weight" && "!bg-forest !text-white")}>Weight (kg)</button>
        <button onClick={() => setMetric("height")} className={cn("btn-secondary", metric === "height" && "!bg-forest !text-white")}>Height (cm)</button>
      </div>

      {/* Chart */}
      <div className="card p-5">
        <h3 className="font-semibold text-stone-800 mb-4">{metric === "weight" ? "Weight" : "Height"} Over Time</h3>
        {data.length > 0 ? (
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={data}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e7e5e4" vertical={false} />
                <XAxis dataKey="date" tick={{ fontSize: 11, fill: "#78716c" }} />
                <YAxis tick={{ fontSize: 11, fill: "#78716c" }} />
                <Tooltip contentStyle={{ borderRadius: 12, border: "1px solid #e7e5e4", fontSize: 12 }} />
                <Line type="monotone" dataKey="value" stroke="#2d5a3d" strokeWidth={2.5} dot={{ r: 5, fill: "#2d5a3d" }} name={metric === "weight" ? "Weight (kg)" : "Height (cm)"} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <p className="text-center text-stone-400 py-12">No growth measurements recorded yet.</p>
        )}
      </div>

      {/* Measurement history */}
      <div className="card p-5">
        <h3 className="font-semibold text-stone-800 mb-4">Measurement History</h3>
        {growth.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-stone-100 text-stone-500 text-left">
                  <th className="pb-2 font-medium">Date</th>
                  <th className="pb-2 font-medium">Weight (kg)</th>
                  <th className="pb-2 font-medium">Height (cm)</th>
                  <th className="pb-2 font-medium">BMI</th>
                </tr>
              </thead>
              <tbody>
                {growth.map((g, i) => (
                  <tr key={i} className="border-b border-stone-50">
                    <td className="py-2 text-stone-700">{formatDate(g.measuredAt, session.preferredLanguage)}</td>
                    <td className="py-2 text-stone-700">{g.weightKg}</td>
                    <td className="py-2 text-stone-700">{g.heightCm}</td>
                    <td className="py-2 text-stone-700">{bmiFor(g)?.toFixed(1) ?? "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="text-center text-stone-400 py-6">No measurements recorded.</p>
        )}
      </div>
    </div>
  );
}

function ChildSelector({ children, selectedId, onSelect }: { children: Child[]; selectedId: string; onSelect: (id: string) => void }) {
  return (
    <div className="flex gap-2 overflow-x-auto pb-2">
      {children.map((c) => (
        <button
          key={c.id}
          onClick={() => onSelect(c.id)}
          className={cn(
            "px-4 py-2 rounded-xl text-sm font-medium whitespace-nowrap transition",
            selectedId === c.id ? "bg-forest text-white" : "bg-stone-100 text-stone-600 hover:bg-stone-200",
          )}
        >
          {c.fullName}
        </button>
      ))}
    </div>
  );
}
