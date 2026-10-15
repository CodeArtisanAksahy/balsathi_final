"use client";

import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend,
} from "recharts";
import { Activity, Baby, AlertTriangle, TrendingUp, BrainCircuit, RefreshCw, AlertCircle } from "lucide-react";
import type { SessionUser } from "@/lib/domain";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useStoreSelector } from "@/hooks/use-store";
import { getAnalyticsData, getAuthorizedChildren } from "@/lib/selectors";
import { apiFetch, getConfiguredDataMode } from "@/lib/fetch";

// Compute the week-ago cutoff at module scope to avoid calling Date.now() during render.
const WEEK_AGO_CUTOFF = Date.now() - 1000 * 60 * 60 * 24 * 7;

interface ForecastRow {
  id: string;
  modelVersion: string;
  predictionValue: {
    predicted_count: number;
    month: string;
    model_version: string;
    input_data_cutoff: string;
    prediction_type: string;
    note: string;
  };
  generatedAt: string;
  inputDataCutoff: string;
  explanation: { evaluation?: Record<string, any> };
}

interface ForecastPayload {
  history: Array<{ month: string; count: number }>;
  forecasts: ForecastRow[];
  evaluation: Record<string, any> | null;
  historyMonths: number;
}

type ForecastState =
  | { status: "idle" }
  | { status: "loading" }
  | { status: "ok"; data: ForecastPayload }
  | { status: "error"; message: string }
  | { status: "unavailable" }; // demo mode – endpoint not supported

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
  const [forecast, setForecast] = useState<ForecastState>({ status: "idle" });
  const [generating, setGenerating] = useState(false);
  const [forecastStale, setForecastStale] = useState(false);

  const isAdmin = session.role === "CENTER_ADMIN" || session.role === "DISTRICT_ADMIN";

  // ── Fetch stored forecasts on mount (SQLite mode only) ─────────────────
  const refreshForecast = useCallback(async (cancelled?: () => boolean) => {
    try {
      const mode = await getConfiguredDataMode();
      if (mode === "demo") { setForecast({ status: "unavailable" }); return; }
      setForecast({ status: "loading" });
      const data = await apiFetch<ForecastPayload>("/api/v1/analytics/forecast");
      if (!cancelled?.()) setForecast({ status: "ok", data });
    } catch (err) {
      if (!cancelled?.()) setForecast({ status: "error", message: err instanceof Error ? err.message : "Failed to load forecasts." });
    }
  }, []);

  useEffect(() => {
    if (!isAdmin) return;
    let cancelled = false;
    void refreshForecast(() => cancelled);
    const onObservationUpdate = () => { setForecastStale(true); void refreshForecast(); };
    window.addEventListener("balsathi:observations-updated", onObservationUpdate);
    return () => { cancelled = true; window.removeEventListener("balsathi:observations-updated", onObservationUpdate); };
  }, [isAdmin, refreshForecast]);

  // ── Generate a new forecast via POST ────────────────────────────────────
  const runForecast = useCallback(async () => {
    setGenerating(true);
    try {
      await apiFetch("/api/v1/analytics/forecast", { method: "POST" });
      await refreshForecast();
      setForecastStale(false);
    } catch (err) {
      setForecast({ status: "error", message: err instanceof Error ? err.message : "Forecast generation failed." });
    } finally {
      setGenerating(false);
    }
  }, [refreshForecast]);

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

  // The API's database aggregation is the source of actual monthly values in SQLite mode.
  const trendData = useMemo(() => {
    const map = new Map<string, { month: string; observations?: number; forecast?: number }>();
    const history = forecast.status === "ok" ? forecast.data.history : [];
    for (const { month, count } of history) {
      if ((!fromDate || month >= fromDate.slice(0, 7)) && (!toDate || month <= toDate.slice(0, 7))) map.set(month, { month, observations: count });
    }
    if (forecast.status === "ok" && forecast.data.forecasts.length > 0) {
      const latest = forecast.data.forecasts[0];
      const pv = latest.predictionValue;
      if (pv?.month && typeof pv.predicted_count === "number") {
        const existing = map.get(pv.month);
        map.set(pv.month, { month: pv.month, forecast: Math.round(pv.predicted_count), observations: existing?.observations });
      }
    }
    return [...map.values()].sort((a, b) => a.month.localeCompare(b.month));
  }, [forecast, fromDate, toDate]);

  const filteredRiskData = analytics.riskData.map((item) => ({ ...item, value: item.name === "No Risk" ? Math.max(0, children.length - filteredRisks.filter((risk) => risk.reviewRequired).length) : item.name === "At Risk" ? filteredRisks.filter((risk) => risk.level === "HIGH" && risk.reviewRequired).length : filteredRisks.filter((risk) => risk.level === "MODERATE" && risk.reviewRequired).length }));

  // Metadata from the latest forecast row
  const latestForecast = forecast.status === "ok" && forecast.data.forecasts.length > 0 ? forecast.data.forecasts[0] : null;
  const evaluation = forecast.status === "ok" ? forecast.data.evaluation ?? latestForecast?.explanation?.evaluation ?? null : null;
  const latestMonth = forecast.status === "ok" ? forecast.data.history.at(-1)?.month : undefined;

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

      {/* Observation Volume + Forecast Chart */}
      <div className="card p-5">
        <div className="flex items-start justify-between gap-4 mb-1 flex-wrap">
          <div>
            <h3 className="font-semibold text-stone-800">Observation Volume (Monthly)</h3>
            <p className="text-xs text-stone-400 mt-0.5">
              Source: observation records
              {latestForecast && (
                <> · <span className="text-amber-600 font-medium">Forecast</span> for {latestForecast.predictionValue?.month} by model {latestForecast.modelVersion} (generated {new Date(latestForecast.generatedAt).toLocaleDateString()})</>
              )}
              {forecastStale && latestMonth && <> · Actuals now extend through {latestMonth}; the saved forecast is unchanged until you run it again.</>}
            </p>
          </div>
          {/* Run Forecast button – only in SQLite mode for admins */}
          {isAdmin && forecast.status !== "unavailable" && (
            <button
              id="run-forecast-btn"
              onClick={runForecast}
              disabled={generating || forecast.status === "loading"}
              className="btn-secondary flex items-center gap-1.5 text-xs shrink-0"
              title="Run ML forecast for next month's aggregate observation volume"
            >
              {generating ? (
                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <BrainCircuit className="w-3.5 h-3.5" />
              )}
              {generating ? "Generating…" : "Run Forecast"}
            </button>
          )}
        </div>

        {/* Forecast error banner */}
        {forecast.status === "error" && (
          <div className="flex items-center gap-2 text-xs text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2 mb-3">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{forecast.status === "error" ? forecast.message : ""}</span>
          </div>
        )}

        {/* Legend */}
        <div className="flex items-center gap-4 text-xs text-stone-500 mb-3">
          <span className="flex items-center gap-1.5"><span className="inline-block w-3 h-3 rounded-sm bg-[#4ade80]" />Historical</span>
          <span className="flex items-center gap-1.5"><span className="inline-block w-3 h-3 rounded-sm bg-[#f59e0b]" />Forecast (ML)</span>
        </div>

        {forecast.status === "loading" ? (
          <div role="status" className="h-64 flex items-center justify-center text-stone-400">Loading monthly database history and forecasts…</div>
        ) : forecast.status === "error" ? (
          <div role="alert" className="h-64 flex items-center justify-center text-risk-red">Unable to load forecast data: {forecast.message}</div>
        ) : trendData.length === 0 ? (
          <div className="h-64 flex items-center justify-center text-stone-400">No monthly history or forecast is available for this scope.</div>
        ) : (
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={trendData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e7e5e4" vertical={false} />
                <XAxis dataKey="month" tick={{ fontSize: 11, fill: "#78716c" }} />
                <YAxis tick={{ fontSize: 11, fill: "#78716c" }} />
                <Tooltip
                  contentStyle={{ borderRadius: 12, border: "1px solid #e7e5e4", fontSize: 12 }}
                  formatter={(value, name) =>
                    name === "forecast"
                      ? [`${value} (predicted)`, "Forecast (ML)"]
                      : [value, "Observations"]
                  }
                />
                <Bar dataKey="observations" name="Historical actuals" fill="#4ade80" radius={[6, 6, 0, 0]} />
                <Bar dataKey="forecast" name="Forecast (ML; not actuals)" fill="#f59e0b" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}

        {forecast.status === "ok" && (
          <ul className="sr-only" aria-label="Monthly observation series">
            {trendData.map((row) => <li key={row.month} data-month={row.month} data-historical={row.observations ?? ""} data-forecast={row.forecast ?? ""}>{row.month}: {row.observations === undefined ? "no actual" : `historical actual ${row.observations}`}; {row.forecast === undefined ? "no forecast" : `forecast ${row.forecast}`}</li>)}
          </ul>
        )}

        {/* Forecast metadata footer */}
        {latestForecast && (
          <p className="text-xs text-stone-400 mt-2">
            Model: <span className="font-mono">{latestForecast.modelVersion}</span> ·
            Input data cutoff: <span className="font-mono">{latestForecast.inputDataCutoff.slice(0, 10)}</span> ·
            Predicted count: <span className="font-semibold text-amber-600">{Math.round(latestForecast.predictionValue?.predicted_count ?? 0)}</span>
            · Uncertainty interval: unavailable
          </p>
        )}
        {evaluation && <p className="text-xs text-stone-400 mt-1">Last evaluation: {String(evaluation.trained_at ?? evaluation.evaluated_at ?? "date unavailable")} · cutoff {String(evaluation.data_cutoff ?? evaluation.metrics?.dataset_cutoff ?? "unavailable")} · holdout {String(evaluation.metrics?.test_start ?? "?")} to {String(evaluation.metrics?.test_end ?? "?")} · MAE {String(evaluation.metrics?.candidate_mae ?? "unavailable")} · RMSE {String(evaluation.metrics?.candidate_rmse ?? "unavailable")}</p>}
        {forecast.status === "unavailable" && (
          <p className="text-xs text-stone-400 mt-2 italic">Forecast panel requires DATA_MODE=sqlite and an admin account.</p>
        )}
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
