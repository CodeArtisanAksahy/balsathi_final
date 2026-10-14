"use client";

import { useState } from "react";
import {
  Bell, Save, ToggleLeft, ToggleRight, Mail, MessageSquare,
  AlertTriangle, CheckCircle2,
} from "lucide-react";
import { cn } from "@/lib/utils";

const notificationSettings = [
  { id: "obs-created", title: "Observation created", desc: "Notify parents when a new observation is recorded for their child.", channels: ["app", "email"], enabled: true },
  { id: "risk-flagged", title: "Risk flag raised", desc: "Notify assigned worker and center admin when a follow-up flag is created.", channels: ["app", "email"], enabled: true },
  { id: "milestone-due", title: "Milestone review due", desc: "Remind workers when milestone reviews are scheduled.", channels: ["app"], enabled: true },
  { id: "report-ready", title: "Report generated", desc: "Notify parents and workers when a progress report is available.", channels: ["app", "email"], enabled: false },
  { id: "message-received", title: "New message", desc: "Notify when a new message is received from the other party.", channels: ["app", "email"], enabled: true },
  { id: "sync-failed", title: "Sync failure", desc: "Alert workers when offline data fails to sync.", channels: ["app"], enabled: true },
];

const recentNotifications = [
  { id: 1, type: "info", title: "New observation recorded", desc: "Anita Patil recorded an observation for Rohan Kumar.", time: "5 min ago", read: false },
  { id: 2, type: "warning", title: "Follow-up flag created", desc: "Aarohi Kale has a new follow-up flag requiring review.", time: "1 hour ago", read: false },
  { id: 3, type: "info", title: "Report generated", desc: "Sia Pawar's progress report is ready for review.", time: "3 hours ago", read: true },
  { id: 4, type: "success", title: "Sync completed", desc: "All offline observations have been synced successfully.", time: "1 day ago", read: true },
];

export default function AdminNotificationsPage() {
  const [settings, setSettings] = useState(notificationSettings);
  const [saved, setSaved] = useState(false);

  function toggle(id: string) {
    setSettings((prev) => prev.map((s) => (s.id === id ? { ...s, enabled: !s.enabled } : s)));
  }

  function save() {
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <div className="w-8 h-8 rounded-lg bg-amber-100 flex items-center justify-center">
              <Bell className="w-4 h-4 text-amber-600" />
            </div>
            <h1 className="text-2xl font-bold text-stone-800">Notifications</h1>
          </div>
          <p className="text-stone-500 text-sm">Manage notification preferences and view recent alerts.</p>
        </div>
        <button onClick={save} className="btn-primary">
          <Save className="w-4 h-4" /> Save Settings
        </button>
      </div>

      {saved && (
        <div className="p-3 rounded-xl bg-forest/10 text-forest text-sm font-medium">
          Notification settings saved.
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Notification settings */}
        <div className="card p-5">
          <h3 className="font-semibold text-stone-800 mb-4">Notification Preferences</h3>
          <div className="space-y-4">
            {settings.map((s) => (
              <div key={s.id} className="flex items-start justify-between gap-3 pb-4 border-b border-stone-100 last:border-0 last:pb-0">
                <div className="flex-1 min-w-0">
                  <h4 className="font-medium text-stone-800 text-sm">{s.title}</h4>
                  <p className="text-xs text-stone-500 mt-0.5">{s.desc}</p>
                  <div className="flex gap-2 mt-1.5">
                    {s.channels.map((ch) => (
                      <span key={ch} className="badge bg-stone-100 text-stone-500 text-[10px]">
                        {ch === "app" ? <Bell className="w-3 h-3 mr-1" /> : <Mail className="w-3 h-3 mr-1" />}
                        {ch}
                      </span>
                    ))}
                  </div>
                </div>
                <button
                  onClick={() => toggle(s.id)}
                  className={cn("flex-shrink-0 mt-1", s.enabled ? "text-forest" : "text-stone-400")}
                >
                  {s.enabled ? <ToggleRight className="w-9 h-9" /> : <ToggleLeft className="w-9 h-9" />}
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* Recent notifications */}
        <div className="card p-5">
          <h3 className="font-semibold text-stone-800 mb-4">Recent Notifications</h3>
          <div className="space-y-3">
            {recentNotifications.map((n) => (
              <div
                key={n.id}
                className={cn(
                  "p-3 rounded-xl border",
                  n.read ? "bg-stone-50 border-stone-100" : "bg-amber-50/50 border-amber-100",
                )}
              >
                <div className="flex items-start gap-2">
                  {n.type === "warning" ? (
                    <AlertTriangle className="w-4 h-4 text-amber-500 flex-shrink-0 mt-0.5" />
                  ) : n.type === "success" ? (
                    <CheckCircle2 className="w-4 h-4 text-forest flex-shrink-0 mt-0.5" />
                  ) : (
                    <MessageSquare className="w-4 h-4 text-blue-500 flex-shrink-0 mt-0.5" />
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-stone-800">{n.title}</p>
                    <p className="text-xs text-stone-500 mt-0.5">{n.desc}</p>
                  </div>
                  <span className="text-[10px] text-stone-400 flex-shrink-0">{n.time}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
