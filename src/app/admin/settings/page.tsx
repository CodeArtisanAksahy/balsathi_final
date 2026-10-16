"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Settings as SettingsIcon, Globe, Shield, Database,
} from "lucide-react";
import type { SessionUser, AppLocale } from "@/lib/domain";
import { appLocales } from "@/lib/domain";
import { localeLabels } from "@/lib/i18n";
import { apiFetch, getConfiguredDataMode } from "@/lib/fetch";
import { cn } from "@/lib/utils";

export default function AdminSettingsPage() {
  const [session, setSession] = useState<SessionUser | null>(null);
  const [dataMode, setDataMode] = useState<"demo" | "sqlite">("demo");
  const [error, setError] = useState("");
  const router = useRouter();

  useEffect(() => {
    let mounted = true;
    Promise.all([apiFetch<SessionUser | null>("/api/auth/session"), getConfiguredDataMode()]).then(([currentSession, mode]) => {
      if (!mounted) return;
      setSession(currentSession);
      setDataMode(mode === "sqlite" ? "sqlite" : "demo");
    }).catch((loadError) => { if (mounted) setError(loadError instanceof Error ? loadError.message : "Unable to load settings."); });
    return () => { mounted = false; };
  }, []);

  if (!session) return null;

  async function changeLocale(locale: AppLocale) {
    setError("");
    try {
      await apiFetch("/api/auth/locale", { method: "POST", body: JSON.stringify({ locale }) });
      router.refresh();
    } catch (changeError) {
      setError(changeError instanceof Error ? changeError.message : "Unable to update language.");
    }
  }

  return (
    <div className="space-y-6 max-w-3xl">
      <div className="flex items-center gap-2 mb-1">
        <div className="w-8 h-8 rounded-lg bg-forest/10 flex items-center justify-center">
          <SettingsIcon className="w-4 h-4 text-forest" />
        </div>
        <h1 className="text-2xl font-bold text-stone-800">System Settings</h1>
      </div>
      <p className="text-stone-500 text-sm">Configure system-wide settings and preferences.</p>
      {error && <div role="alert" className="rounded-xl bg-risk-red-light p-3 text-sm text-risk-red">{error}</div>}

      {/* Data mode */}
      <div className="card p-6 space-y-4">
        <div className="flex items-center gap-2">
          <Database className="w-5 h-5 text-forest" />
          <h3 className="font-semibold text-stone-800">Data Mode</h3>
        </div>
        <div className="p-3 rounded-xl bg-amber-50 border border-amber-200">
          <p className="text-sm text-amber-800">
            <span className="font-medium">{dataMode === "sqlite" ? "SQLite mode active" : "Demo mode active"}</span> — {dataMode === "sqlite" ? "Records are stored in the local SQLite database." : "Demo data is stored in-memory and resets on server restart."}
            {dataMode === "demo" && <> Set <code className="px-1 bg-amber-100 rounded">DATA_MODE=sqlite</code> to use the local SQLite database.</>}
          </p>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className={`p-3 rounded-xl border-2 ${dataMode === "demo" ? "border-forest bg-forest/5" : "border-stone-200"}`}>
            <p className={`text-sm font-medium ${dataMode === "demo" ? "text-forest" : "text-stone-500"}`}>Demo (in-memory)</p>
            <p className="text-xs text-stone-500 mt-0.5">{dataMode === "demo" ? "Current mode" : "Available"}</p>
          </div>
          <div className={`p-3 rounded-xl border-2 ${dataMode === "sqlite" ? "border-forest bg-forest/5" : "border-stone-200"}`}>
            <p className={`text-sm font-medium ${dataMode === "sqlite" ? "text-forest" : "text-stone-500"}`}>SQLite</p>
            <p className="text-xs text-stone-400 mt-0.5">{dataMode === "sqlite" ? "Current mode" : "Requires a writable local database file"}</p>
          </div>
        </div>
      </div>

      {/* Language */}
      <div className="card p-6 space-y-4">
        <div className="flex items-center gap-2">
          <Globe className="w-5 h-5 text-forest" />
          <h3 className="font-semibold text-stone-800">Account Language</h3>
        </div>
        <div className="grid grid-cols-3 gap-2">
          {appLocales.map((loc) => (
            <button
              key={loc}
              onClick={() => changeLocale(loc)}
              className={cn(
                "p-3 rounded-xl border-2 text-left transition",
                session.preferredLanguage === loc ? "border-forest bg-forest/5" : "border-stone-200 hover:border-stone-300",
              )}
            >
              <div className="font-medium text-stone-800">{localeLabels[loc]}</div>
              <div className="text-xs text-stone-400">{loc.toUpperCase()}</div>
            </button>
          ))}
        </div>
      </div>

      {/* Security */}
      <div className="card p-6 space-y-4">
        <div className="flex items-center gap-2">
          <Shield className="w-5 h-5 text-forest" />
          <h3 className="font-semibold text-stone-800">Security</h3>
        </div>
        <div className="space-y-3">
          <div className="flex items-center justify-between p-3 rounded-xl bg-stone-50">
            <div>
              <p className="text-sm font-medium text-stone-800">Session Timeout</p>
              <p className="text-xs text-stone-500">Controlled by the deployment session lifetime setting; not editable here.</p>
            </div>
          </div>
          <div className="flex items-center justify-between p-3 rounded-xl bg-stone-50">
            <div>
              <p className="text-sm font-medium text-stone-800">Password Policy</p>
              <p className="text-xs text-stone-500">Provisioned account passwords require at least 12 characters.</p>
            </div>
          </div>
          <div className="flex items-center justify-between p-3 rounded-xl bg-stone-50">
            <div>
              <p className="text-sm font-medium text-stone-800">Authentication</p>
              <p className="text-xs text-stone-500">SQLite accounts use bcrypt hashes and signed HTTP-only session cookies with durable revocation records. Demo mode is not production authentication.</p>
            </div>
          </div>
        </div>
      </div>

      <p className="text-xs text-stone-500">Only the language preference can be changed from this page. Runtime and security settings must be managed through deployment configuration.</p>
    </div>
  );
}
