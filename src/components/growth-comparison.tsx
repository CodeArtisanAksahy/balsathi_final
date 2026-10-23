"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip } from "recharts";
import type { SessionUser, GrowthMeasurement, Child } from "@/lib/domain";
import { formatDate } from "@/lib/utils";
import { cn } from "@/lib/utils";
import { useStoreSelector } from "@/hooks/use-store";
import { getAuthorizedChildren, getChildGrowth } from "@/lib/selectors";
import { storeActions } from "@/lib/store-actions";
import { toast } from "sonner";
import { apiFetch, getConfiguredDataMode } from "@/lib/fetch";

export function GrowthComparison({
  session,
  selectedChildId,
  initialChildren = [],
  sqliteMode = false,
}: {
  session: SessionUser;
  selectedChildId?: string;
  initialChildren?: Pick<Child, "id" | "fullName" | "dateOfBirth">[];
  sqliteMode?: boolean;
}) {
  const router = useRouter();
  const demoChildren = useStoreSelector((state) => getAuthorizedChildren(state, session));
  const children = sqliteMode ? initialChildren : demoChildren;
  const childId = (selectedChildId && children.some((child) => child.id === selectedChildId)
    ? selectedChildId
    : children[0]?.id) ?? "";
  const [metric, setMetric] = useState<"height" | "weight">("weight");
  const [measuredAt, setMeasuredAt] = useState(() => {
    const today = new Date();
    today.setMinutes(today.getMinutes() - today.getTimezoneOffset());
    return today.toISOString().slice(0, 10);
  });
  const [weightKg, setWeightKg] = useState("");
  const [heightCm, setHeightCm] = useState("");
  const [saving, setSaving] = useState(false);

  function selectChild(id: string) {
    router.push(`/growth?childId=${id}`);
  }

  const selectedChild = children.find((c) => c.id === childId) ?? null;
  const todayInputValue = (() => {
    const today = new Date();
    today.setMinutes(today.getMinutes() - today.getTimezoneOffset());
    return today.toISOString().slice(0, 10);
  })();
  const demoGrowth = useStoreSelector((state) => childId ? getChildGrowth(state, childId) : []);
  const [databaseGrowth, setDatabaseGrowth] = useState<GrowthMeasurement[]>([]);
  const [loadError, setLoadError] = useState("");
  useEffect(() => {
    if (!sqliteMode || !childId) return;
    let cancelled = false;
    setLoadError("");
    apiFetch<GrowthMeasurement[]>(`/api/growth?childId=${encodeURIComponent(childId)}`)
      .then((rows) => { if (!cancelled) setDatabaseGrowth(rows); })
      .catch((error) => { if (!cancelled) setLoadError(error instanceof Error ? error.message : "Could not load growth measurements."); });
    return () => { cancelled = true; };
  }, [sqliteMode, childId]);
  const growth = sqliteMode ? databaseGrowth : demoGrowth;
  const parentNotice = session.role === "PARENT" ? (
    <div role="status" className="rounded-xl border border-blue-200 bg-blue-50 p-4 text-sm text-blue-900">
      You can view recorded height and weight here. An Anganwadi worker records official measurements for your child.
    </div>
  ) : null;

  if (children.length === 0) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-bold text-stone-800">Growth Comparison</h1>
        {parentNotice}
        <div className="card p-12 text-center text-stone-500">No children available.</div>
      </div>
    );
  }

  if (!selectedChild) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-bold text-stone-800">Growth Comparison</h1>
        {parentNotice}
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

  async function saveMeasurement(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    const payload = { childId, measuredAt: new Date(`${measuredAt}T12:00:00`).toISOString(), heightCm: Number(heightCm), weightKg: Number(weightKg), headCircumferenceCm: null, notes: null };
    try {
      if (await getConfiguredDataMode() === "sqlite") {
        const saved = await apiFetch<GrowthMeasurement>("/api/growth", { method: "POST", body: JSON.stringify(payload) });
        setDatabaseGrowth((current) => [...current, saved].sort((left, right) => left.measuredAt.localeCompare(right.measuredAt)));
      } else {
        storeActions.addGrowthMeasurement(session, payload);
      }
      toast.success("Growth measurement saved.");
      setMeasuredAt(""); setHeightCm(""); setWeightKg("");
    } catch (error) { toast.error(error instanceof Error ? error.message : "Could not save measurement."); }
    finally { setSaving(false); }
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

      {parentNotice}

      <ChildSelector children={children} selectedId={childId} onSelect={selectChild} />

      {session.role !== "PARENT" && <form onSubmit={saveMeasurement} className="card p-4 grid grid-cols-1 sm:grid-cols-4 gap-3">
        <input className="input" type="date" min={selectedChild?.dateOfBirth.slice(0, 10)} max={todayInputValue} value={measuredAt} onChange={(event) => setMeasuredAt(event.target.value)} required aria-label="Measurement date" />
        <input className="input" type="number" min="1" max="180" step="0.1" placeholder="Weight (kg)" value={weightKg} onChange={(event) => setWeightKg(event.target.value)} required />
        <input className="input" type="number" min="30" max="220" step="0.1" placeholder="Height (cm)" value={heightCm} onChange={(event) => setHeightCm(event.target.value)} required />
        <button className="btn-primary" type="submit" disabled={saving}>{saving ? "Saving…" : "Save measurement"}</button>
      </form>}

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
      {loadError && <div role="alert" className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800">{loadError}</div>}
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

function ChildSelector({ children, selectedId, onSelect }: { children: Array<Pick<Child, "id" | "fullName">>; selectedId: string; onSelect: (id: string) => void }) {
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
