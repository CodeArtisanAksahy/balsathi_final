"use client";

import { useState, useEffect } from "react";
import {
  Activity, Server, Database, Cloud, Shield, Clock, CheckCircle2,
  AlertTriangle, XCircle, RefreshCw,
} from "lucide-react";
import { cn } from "@/lib/utils";

const services = [
  { id: "api", name: "API Server", status: "healthy", latency: "42ms" },
  { id: "db", name: "Database", status: "healthy", latency: "12ms" },
  { id: "auth", name: "Authentication", status: "healthy", latency: "18ms" },
  { id: "storage", name: "File Storage", status: "healthy", latency: "35ms" },
  { id: "llm", name: "AI Service", status: "degraded", latency: "—" },
  { id: "sync", name: "Offline Sync", status: "healthy", latency: "28ms" },
];

const systemStats = [
  { label: "Uptime", value: "99.8%", icon: Clock, color: "text-forest" },
  { label: "Requests/min", value: "142", icon: Activity, color: "text-blue-600" },
  { label: "Active Users", value: "7", icon: CheckCircle2, color: "text-purple-600" },
  { label: "Errors (24h)", value: "3", icon: AlertTriangle, color: "text-amber-600" },
];

export default function AdminSystemHealthPage() {
  const [refreshing, setRefreshing] = useState(false);
  const [lastUpdate, setLastUpdate] = useState(new Date());

  function refresh() {
    setRefreshing(true);
    setTimeout(() => {
      setRefreshing(false);
      setLastUpdate(new Date());
    }, 800);
  }

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

      <p className="text-xs text-stone-400">Last updated: {lastUpdate.toLocaleTimeString()}</p>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {systemStats.map((s) => {
          const Icon = s.icon;
          return (
            <div key={s.label} className="card p-4">
              <Icon className={cn("w-6 h-6 mb-2", s.color)} />
              <div className="text-2xl font-bold text-stone-800">{s.value}</div>
              <div className="text-xs text-stone-500">{s.label}</div>
            </div>
          );
        })}
      </div>

      {/* Service status */}
      <div className="card p-5">
        <h3 className="font-semibold text-stone-800 mb-4">Service Status</h3>
        <div className="space-y-2">
          {services.map((svc) => (
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
                svc.status === "healthy" ? "bg-forest/10 text-forest" : "bg-amber-100 text-amber-700",
              )}>
                {svc.status === "healthy" ? "Operational" : "Degraded"}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* AI service note */}
      <div className="flex items-start gap-3 p-4 rounded-xl bg-amber-50 border border-amber-200">
        <AlertTriangle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
        <div>
          <p className="text-sm font-medium text-amber-800">AI Service in Demo Mode</p>
          <p className="text-xs text-amber-700 mt-0.5">
            No LLM provider is configured. The AI service uses rule-based templates and mock responses.
            Set an AI provider API key to enable full AI functionality.
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
            <Row label="Connection" value="In-Memory Store" />
            <Row label="Mode" value="Demo" />
            <Row label="Records" value="~450" />
            <Row label="Last Backup" value="Not configured" />
          </div>
        </div>
        <div className="card p-5">
          <div className="flex items-center gap-2 mb-4">
            <Shield className="w-5 h-5 text-purple-600" />
            <h3 className="font-semibold text-stone-800">Security</h3>
          </div>
          <div className="space-y-3 text-sm">
            <Row label="SSL/TLS" value="Active" />
            <Row label="Auth Method" value="JWT + bcrypt" />
            <Row label="Rate Limiting" value="Enabled" />
            <Row label="Active Sessions" value="12" />
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
  if (status === "healthy") {
    return <span className="w-2.5 h-2.5 rounded-full bg-forest animate-pulse" />;
  }
  return <span className="w-2.5 h-2.5 rounded-full bg-amber-500" />;
}
