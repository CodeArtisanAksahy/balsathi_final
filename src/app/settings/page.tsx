"use client";

import { useState, useEffect } from "react";
import { Globe, Bell, Shield, Save, Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import type { SessionUser, AppLocale } from "@/lib/domain";
import { appLocales } from "@/lib/domain";
import { localeLabels } from "@/lib/i18n";
import { apiFetch } from "@/lib/fetch";
import { cn } from "@/lib/utils";

export default function SettingsPage() {
  const [session, setSession] = useState<SessionUser | null>(null);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const router = useRouter();

  useEffect(() => {
    apiFetch<SessionUser | null>("/api/auth/session").then((s) => {
      setSession(s);
      if (s) {
        setName(s.name);
        setEmail(s.email);
      }
    });
  }, []);

  if (!session) return null;

  async function changeLocale(locale: AppLocale) {
    await apiFetch("/api/auth/locale", { method: "POST", body: JSON.stringify({ locale }) });
    router.refresh();
  }

  async function save() {
    setSaving(true);
    setSaved(false);
    await new Promise((r) => setTimeout(r, 400));
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <h1 className="text-2xl font-bold text-stone-800">Profile & Settings</h1>

      {/* Profile */}
      <div className="card p-6 space-y-4">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-full bg-forest/15 flex items-center justify-center text-forest font-semibold">
            {session.name.slice(0, 2).toUpperCase()}
          </div>
          <div>
            <h3 className="font-semibold text-stone-800">{session.name}</h3>
            <p className="text-sm text-stone-500 capitalize">{session.role.toLowerCase()} • {session.centerIds[0] ?? "—"}</p>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="label">Full Name</label>
            <input className="input" value={name} onChange={(e) => setName(e.target.value)} />
          </div>
          <div>
            <label className="label">Phone</label>
            <input className="input" value={phone} onChange={(e) => setPhone(e.target.value)} />
          </div>
          <div className="col-span-2">
            <label className="label">Email</label>
            <input className="input" value={email} onChange={(e) => setEmail(e.target.value)} disabled />
          </div>
        </div>
        <div className="flex items-center gap-3">
          <button onClick={save} disabled={saving} className="btn-primary">
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            Save Changes
          </button>
          {saved && <span className="text-sm text-forest">Saved successfully</span>}
        </div>
      </div>

      {/* Language */}
      <div className="card p-6 space-y-4">
        <div className="flex items-center gap-2">
          <Globe className="w-5 h-5 text-forest" />
          <h3 className="font-semibold text-stone-800">Language</h3>
        </div>
        <div className="grid grid-cols-3 gap-2">
          {appLocales.map((loc) => (
            <button
              key={loc}
              onClick={() => changeLocale(loc)}
              className={cn(
                "p-3 rounded-xl border-2 text-left transition",
                session.preferredLanguage === loc
                  ? "border-forest bg-forest/5"
                  : "border-stone-200 hover:border-stone-300",
              )}
            >
              <div className="font-medium text-stone-800">{localeLabels[loc]}</div>
              <div className="text-xs text-stone-400">{loc.toUpperCase()}</div>
            </button>
          ))}
        </div>
      </div>

      {/* Notifications */}
      <div className="card p-6 space-y-4">
        <div className="flex items-center gap-2">
          <Bell className="w-5 h-5 text-forest" />
          <h3 className="font-semibold text-stone-800">Notifications</h3>
        </div>
        {[
          { label: "Follow-up reminders", default: true },
          { label: "Milestone review alerts", default: true },
          { label: "New messages from parents", default: true },
          { label: "Sync status updates", default: false },
        ].map((n) => (
          <ToggleRow key={n.label} label={n.label} defaultChecked={n.default} />
        ))}
      </div>

      {/* Security */}
      <div className="card p-6 space-y-4">
        <div className="flex items-center gap-2">
          <Shield className="w-5 h-5 text-forest" />
          <h3 className="font-semibold text-stone-800">Security</h3>
        </div>
        <button className="btn-secondary w-full text-left justify-start">Change Password</button>
        <button className="btn-secondary w-full text-left justify-start">Two-Factor Authentication</button>
        <button
          onClick={async () => {
            await apiFetch("/api/auth/logout", { method: "POST" });
            router.push("/login");
          }}
          className="btn-secondary w-full text-left justify-start text-risk-red border-risk-red/30 hover:bg-risk-red-light"
        >
          Sign Out
        </button>
      </div>
    </div>
  );
}

function ToggleRow({ label, defaultChecked }: { label: string; defaultChecked: boolean }) {
  const [on, setOn] = useState(defaultChecked);
  return (
    <div className="flex items-center justify-between">
      <span className="text-sm text-stone-700">{label}</span>
      <button
        onClick={() => setOn((v) => !v)}
        className={cn("w-11 h-6 rounded-full transition relative", on ? "bg-forest" : "bg-stone-300")}
      >
        <span className={cn("absolute top-0.5 w-5 h-5 rounded-full bg-white transition-all", on ? "left-[22px]" : "left-0.5")} />
      </button>
    </div>
  );
}
