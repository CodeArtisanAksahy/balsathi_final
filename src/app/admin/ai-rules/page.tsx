"use client";

import { useState } from "react";
import {
  Brain, Save, ToggleLeft, ToggleRight, Info, AlertTriangle,
} from "lucide-react";
import { cn } from "@/lib/utils";

const aiRules = [
  { id: "risk-followup", title: "Follow-up flag triggers risk assessment", enabled: true, desc: "When an observation is marked for follow-up, create a MODERATE risk assessment automatically." },
  { id: "milestone-review", title: "Milestone needs-review alerts", enabled: true, desc: "Send a notification when a milestone assessment is marked as NEEDS_REVIEW." },
  { id: "growth-anomaly", title: "Growth anomaly detection", enabled: false, desc: "Flag growth measurements that fall outside expected ranges for age and sex. (Illustrative only)" },
  { id: "recommendation-gen", title: "AI recommendation generation", enabled: true, desc: "Generate activity recommendations based on observation patterns and milestone status." },
  { id: "parent-approval", title: "Require worker approval for parent-facing recommendations", enabled: true, desc: "Recommendations must be approved by a worker before appearing in the parent app." },
  { id: "auto-summary", title: "Auto-generate observation summaries", enabled: true, desc: "Create brief AI summaries of observations for quick review. (Demo mode uses templates)" },
];

export default function AdminAiRulesPage() {
  const [rules, setRules] = useState(aiRules);
  const [saved, setSaved] = useState(false);

  function toggle(id: string) {
    setRules((prev) => prev.map((r) => (r.id === id ? { ...r, enabled: !r.enabled } : r)));
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
            <div className="w-8 h-8 rounded-lg bg-purple-100 flex items-center justify-center">
              <Brain className="w-4 h-4 text-purple-600" />
            </div>
            <h1 className="text-2xl font-bold text-stone-800">AI Rules &amp; Configuration</h1>
          </div>
          <p className="text-stone-500 text-sm">
            Configure the rule-based AI behavior. These settings control how observations, milestones, and risks are processed.
          </p>
        </div>
        <button onClick={save} className="btn-primary">
          <Save className="w-4 h-4" /> Save Rules
        </button>
      </div>

      <div className="flex items-start gap-3 p-4 rounded-xl bg-amber-50 border border-amber-200">
        <Info className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
        <p className="text-sm text-amber-800">
          AI rules in this demo use rule-based logic. A configured LLM provider can enhance responses, but all risk flags and recommendations are grounded in recorded observations.
        </p>
      </div>

      {saved && (
        <div className="p-3 rounded-xl bg-forest/10 text-forest text-sm font-medium">
          Rules saved successfully.
        </div>
      )}

      <div className="space-y-3">
        {rules.map((rule) => (
          <div key={rule.id} className="card p-5">
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1 min-w-0">
                <h3 className="font-semibold text-stone-800">{rule.title}</h3>
                <p className="text-sm text-stone-500 mt-1">{rule.desc}</p>
              </div>
              <button
                onClick={() => toggle(rule.id)}
                className={cn("flex-shrink-0", rule.enabled ? "text-forest" : "text-stone-400")}
              >
                {rule.enabled ? <ToggleRight className="w-10 h-10" /> : <ToggleLeft className="w-10 h-10" />}
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
