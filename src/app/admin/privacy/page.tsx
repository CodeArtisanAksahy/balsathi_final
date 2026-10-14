"use client";

import { useState } from "react";
import {
  Shield, Eye, Database, UserCheck, Lock, Save, ToggleLeft, ToggleRight,
} from "lucide-react";
import { cn } from "@/lib/utils";

const privacySettings = [
  { id: "consent-required", title: "Require guardian consent", desc: "Workers must obtain consent before capturing photos or recordings.", enabled: true },
  { id: "data-retention", title: "Data retention period", desc: "Retain child records for 7 years after enrollment ends.", enabled: true },
  { id: "parent-access", title: "Parent data access", desc: "Allow parents to view their child's observations and reports.", enabled: true },
  { id: "audit-logging", title: "Audit logging", desc: "Log all data access and modification actions for compliance.", enabled: true },
  { id: "data-minimization", title: "Data minimization", desc: "Only collect data necessary for developmental monitoring.", enabled: true },
  { id: "anonymized-reports", title: "Anonymized analytics", desc: "Use anonymized data for aggregate analytics and reporting.", enabled: true },
];

export default function AdminPrivacyPage() {
  const [settings, setSettings] = useState(privacySettings);
  const [saved, setSaved] = useState(false);

  function toggle(id: string) {
    setSettings((prev) => prev.map((s) => (s.id === id ? { ...s, enabled: !s.enabled } : s)));
  }

  function save() {
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  return (
    <div className="space-y-6 max-w-4xl">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <div className="w-8 h-8 rounded-lg bg-rose-100 flex items-center justify-center">
              <Shield className="w-4 h-4 text-rose-600" />
            </div>
            <h1 className="text-2xl font-bold text-stone-800">Privacy &amp; Data Protection</h1>
          </div>
          <p className="text-stone-500 text-sm">
            Configure privacy settings and data protection policies.
          </p>
        </div>
        <button onClick={save} className="btn-primary">
          <Save className="w-4 h-4" /> Save
        </button>
      </div>

      {saved && (
        <div className="p-3 rounded-xl bg-forest/10 text-forest text-sm font-medium">
          Privacy settings saved.
        </div>
      )}

      {/* Privacy overview */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="card p-4">
          <Eye className="w-8 h-8 text-forest mb-2" />
          <h3 className="font-semibold text-stone-800">Transparency</h3>
          <p className="text-sm text-stone-500 mt-1">Parents can view all data collected about their child.</p>
        </div>
        <div className="card p-4">
          <Database className="w-8 h-8 text-blue-600 mb-2" />
          <h3 className="font-semibold text-stone-800">Data Minimization</h3>
          <p className="text-sm text-stone-500 mt-1">Only necessary developmental data is collected and stored.</p>
        </div>
        <div className="card p-4">
          <Lock className="w-8 h-8 text-amber-600 mb-2" />
          <h3 className="font-semibold text-stone-800">Security</h3>
          <p className="text-sm text-stone-500 mt-1">Data is encrypted in transit and access is role-controlled.</p>
        </div>
      </div>

      {/* Settings */}
      <div className="space-y-3">
        {settings.map((s) => (
          <div key={s.id} className="card p-5">
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1 min-w-0">
                <h3 className="font-semibold text-stone-800">{s.title}</h3>
                <p className="text-sm text-stone-500 mt-1">{s.desc}</p>
              </div>
              <button
                onClick={() => toggle(s.id)}
                className={cn("flex-shrink-0", s.enabled ? "text-forest" : "text-stone-400")}
              >
                {s.enabled ? <ToggleRight className="w-10 h-10" /> : <ToggleLeft className="w-10 h-10" />}
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Consent status */}
      <div className="card p-5">
        <h3 className="font-semibold text-stone-800 mb-4">Consent Status Overview</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="text-center p-3 rounded-xl bg-forest/5">
            <div className="text-2xl font-bold text-forest">3</div>
            <div className="text-xs text-stone-500 mt-1">Approved</div>
          </div>
          <div className="text-center p-3 rounded-xl bg-amber-50">
            <div className="text-2xl font-bold text-amber-600">1</div>
            <div className="text-xs text-stone-500 mt-1">Pending</div>
          </div>
          <div className="text-center p-3 rounded-xl bg-stone-50">
            <div className="text-2xl font-bold text-stone-600">0</div>
            <div className="text-xs text-stone-500 mt-1">Denied</div>
          </div>
          <div className="text-center p-3 rounded-xl bg-blue-50">
            <div className="text-2xl font-bold text-blue-600">4</div>
            <div className="text-xs text-stone-500 mt-1">Total</div>
          </div>
        </div>
      </div>
    </div>
  );
}
