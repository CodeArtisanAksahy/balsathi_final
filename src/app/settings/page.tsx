"use client";

import { useEffect, useState } from "react";
import { Globe, Bell, Shield, LogOut } from "lucide-react";
import { useRouter } from "next/navigation";
import type { SessionUser, AppLocale } from "@/lib/domain";
import { appLocales } from "@/lib/domain";
import { localeLabels } from "@/lib/i18n";
import { apiFetch } from "@/lib/fetch";
import { cn } from "@/lib/utils";

export default function SettingsPage() {
  const [session, setSession] = useState<SessionUser | null>(null);
  const [error, setError] = useState("");
  const router = useRouter();

  useEffect(() => {
    apiFetch<SessionUser | null>("/api/auth/session")
      .then(setSession)
      .catch((loadError) => setError(loadError instanceof Error ? loadError.message : "Unable to load account settings."));
  }, []);

  async function changeLocale(locale: AppLocale) {
    setError("");
    try {
      await apiFetch("/api/auth/locale", { method: "POST", body: JSON.stringify({ locale }) });
      router.refresh();
    } catch (changeError) {
      setError(changeError instanceof Error ? changeError.message : "Unable to update language.");
    }
  }

  async function signOut() {
    setError("");
    try {
      await apiFetch("/api/auth/logout", { method: "POST" });
      router.push("/login");
      router.refresh();
    } catch (logoutError) {
      setError(logoutError instanceof Error ? logoutError.message : "Unable to sign out.");
    }
  }

  if (!session) return <div role={error ? "alert" : "status"} className="text-sm text-stone-600">{error || "Loading settings…"}</div>;

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <h1 className="text-2xl font-bold text-stone-800">Settings</h1>
      {error && <div role="alert" className="rounded-xl bg-risk-red-light p-3 text-sm text-risk-red">{error}</div>}
      <div className="card p-6 space-y-3">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-full bg-forest/15 flex items-center justify-center text-forest font-semibold">{session.name.slice(0, 2).toUpperCase()}</div>
          <div><h3 className="font-semibold text-stone-800">{session.name}</h3><p className="text-sm text-stone-500">{session.email} · {session.role.replaceAll("_", " ")}</p></div>
        </div>
        <p className="text-sm text-stone-500">Profile changes are managed by your administrator.</p>
      </div>
      <div className="card p-6 space-y-4">
        <div className="flex items-center gap-2"><Globe className="w-5 h-5 text-forest" /><h3 className="font-semibold text-stone-800">Language</h3></div>
        <div className="grid grid-cols-3 gap-2">{appLocales.map((locale) => (
          <button key={locale} onClick={() => changeLocale(locale)} aria-pressed={session.preferredLanguage === locale} className={cn("p-3 rounded-xl border-2 text-left transition", session.preferredLanguage === locale ? "border-forest bg-forest/5" : "border-stone-200 hover:border-stone-300")}>
            <div className="font-medium text-stone-800">{localeLabels[locale]}</div><div className="text-xs text-stone-400">{locale.toUpperCase()}</div>
          </button>
        ))}</div>
      </div>
      <div className="card p-6 space-y-2"><div className="flex items-center gap-2"><Bell className="w-5 h-5 text-forest" /><h3 className="font-semibold text-stone-800">Notifications</h3></div><p className="text-sm text-stone-600">Notification preferences and delivery are not configured for this deployment.</p></div>
      <div className="card p-6 space-y-3"><div className="flex items-center gap-2"><Shield className="w-5 h-5 text-forest" /><h3 className="font-semibold text-stone-800">Security</h3></div><p className="text-sm text-stone-600">Password changes and two-factor authentication are unavailable. Contact your administrator to update account access.</p><button onClick={signOut} className="btn-secondary w-full text-left justify-start text-risk-red border-risk-red/30 hover:bg-risk-red-light"><LogOut className="w-4 h-4" /> Sign Out</button></div>
    </div>
  );
}
