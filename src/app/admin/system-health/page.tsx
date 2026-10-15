"use client";

import { useState } from "react";
import {
  Server, Database, Shield, AlertTriangle, RefreshCw,
} from "lucide-react";
import { cn } from "@/lib/utils";

const services = [
  { id: "api", name: "API Server", status: "unknown", latency: "Not checked" },
  { id: "db", name: "Database", status: "unknown", latency: "Not checked" },
  { id: "auth", name: "Authentication", status: "unknown", latency: "Not checked" },
  { id: "storage", name: "File Storage", status: "unknown", latency: "Not checked" },
  { id: "llm", name: "AI Service", status: "unknown", latency: "Not checked" },
  { id: "sync", name: "Offline Sync", status: "degraded", latency: "Unavailable" },
];

export default function AdminSystemHealthPage() {
  const [refreshing, setRefreshing] = useState(false);
  const [lastUpdate, setLastUpdate] = useState<string | null>(null);
  const [apiStatus, setApiStatus] = useState("Not checked");
  const [apiError, setApiError] = useState("");

  async function refresh() {
    setRefreshing(true);
    setApiError("");
    try {
      const startedAt = performance.now();
      const response = await fetch("/api/health", { cache: "no-store" });
      if (!response.ok) throw new Error(`Health endpoint returned ${response.status}.`);
      await response.json();
      setApiStatus(`${Math.round(performance.now() - startedAt)}ms (liveness only)`);
      setLastUpdate(new Date().toLocaleTimeString());
    } catch (error) {
      setApiStatus("Unreachable");
      setApiError(error instanceof Error ? error.message : "Health check failed.");
    } finally {
      setRefreshing(false);
    }
  }

  const serviceRows = services.map((service) => service.id === "api"
    ? { ...service, status: apiError ? "degraded" : apiStatus === "Not checked" ? "unknown" : "healthy", latency: apiStatus }
    : service);

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <div className="w-8 h-8 rounded-lg bg-emerald-100 flex items-center justify-center">
              <Server className="w-4 h-4 text-emerald-600" />
            </div>
            <h1 className="text-2xl font-bold text-stone-800">System Health</h1>
          </div>
          <p className="text-stone-500 text-sm">
            Monitor the health and performance of all system services.
          </p>
        </div>
        <button onClick={refresh} disabled={refreshing} className="btn-secondary">
          <RefreshCw className={cn("w-4 h-4", refreshing && "animate-spin")} /> Refresh
        </button>
      </div>

      <p className="text-xs text-stone-400">Last API check: {lastUpdate ?? "Never"}</p>
      {apiError && <p role="alert" className="text-sm text-risk-red">{apiError}</p>}

      <div role="status" className="card border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
        Live service telemetry is not configured. Values on this page are not production health measurements.
      </div>

      {/* Service status */}
      <div className="card p-5">
        <h3 className="font-semibold text-stone-800 mb-4">Service Status</h3>
        <div className="space-y-2">
          {serviceRows.map((svc) => (
            <div key={svc.id} className="flex items-center justify-between p-3 rounded-xl bg-stone-50">
              <div className="flex items-center gap-3">
                <StatusDot status={svc.status} />
                <div>
                  <p className="font-medium text-stone-800 text-sm">{svc.name}</p>
                  <p className="text-xs text-stone-500">Response: {svc.latency}</p>
                </div>
              </div>
              <span className={cn(
                "badge text-xs",
                svc.status === "healthy" ? "bg-forest/10 text-forest" : svc.status === "unknown" ? "bg-stone-200 text-stone-600" : "bg-amber-100 text-amber-700",
              )}>
                {svc.status === "healthy" ? "Reachable" : svc.status === "unknown" ? "Not measured" : "Unavailable"}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* AI service note */}
      <div className="flex items-start gap-3 p-4 rounded-xl bg-amber-50 border border-amber-200">
        <AlertTriangle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
        <div>
          <p className="text-sm font-medium text-amber-800">AI Service Configuration</p>
          <p className="text-xs text-amber-700 mt-0.5">
            The health page does not probe an AI provider. The assistant uses rule-based templates unless a supported provider is configured.
          </p>
        </div>
      </div>

      {/* Health indicators */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="card p-5">
          <div className="flex items-center gap-2 mb-4">
            <Database className="w-5 h-5 text-blue-600" />
            <h3 className="font-semibold text-stone-800">Database</h3>
          </div>
          <div className="space-y-3 text-sm">
            <Row label="Connection" value="Not measured" />
            <Row label="API liveness" value={apiStatus} />
            <Row label="Mode" value="Not measured" />
            <Row label="Records" value="Not measured" />
            <Row label="Last Backup" value="Not configured" />
          </div>
        </div>
        <div className="card p-5">
          <div className="flex items-center gap-2 mb-4">
            <Shield className="w-5 h-5 text-purple-600" />
            <h3 className="font-semibold text-stone-800">Security</h3>
          </div>
          <div className="space-y-3 text-sm">
            <Row label="SSL/TLS" value="Deployment managed" />
            <Row label="Auth Method" value="Configured per deployment" />
            <Row label="Rate Limiting" value="Not measured" />
            <Row label="Active Sessions" value="Not measured" />
          </div>
        </div>
      </div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-stone-500">{label}</span>
      <span className="font-medium text-stone-800">{value}</span>
    </div>
  );
}

function StatusDot({ status }: { status: string }) {
  if (status === "healthy") return <span className="w-2.5 h-2.5 rounded-full bg-forest" />;
  if (status === "unknown") return <span className="w-2.5 h-2.5 rounded-full bg-stone-400" />;
  return <span className="w-2.5 h-2.5 rounded-full bg-amber-500" />;
}
