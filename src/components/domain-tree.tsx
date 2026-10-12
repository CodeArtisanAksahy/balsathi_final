"use client";

import type { AppLocale, DevelopmentDomain } from "@/lib/domain";
import { domainLabel } from "@/lib/i18n";
import { Activity, Lightbulb, MessageCircle, Users, Heart } from "lucide-react";

const domainMeta: Record<DevelopmentDomain, { icon: React.ComponentType<{ className?: string }>; bg: string; text: string }> = {
  PHYSICAL: { icon: Activity, bg: "bg-forest/15", text: "text-forest" },
  COGNITIVE: { icon: Lightbulb, bg: "bg-amber-100", text: "text-amber-600" },
  LANGUAGE: { icon: MessageCircle, bg: "bg-purple-100", text: "text-purple-600" },
  SOCIAL: { icon: Users, bg: "bg-blue-100", text: "text-blue-600" },
  EMOTIONAL: { icon: Heart, bg: "bg-rose-100", text: "text-rose-600" },
};

export function DomainTree({
  domainOverview,
  locale,
}: {
  domainOverview: Array<{ domain: DevelopmentDomain; count: number }>;
  locale: AppLocale;
}) {
  const maxCount = Math.max(...domainOverview.map((d) => d.count), 1);
  const total = domainOverview.reduce((sum, d) => sum + d.count, 0);

  return (
    <div className="space-y-3">
      {domainOverview.map((d) => {
        const meta = domainMeta[d.domain];
        const Icon = meta.icon;
        const pct = total > 0 ? Math.round((d.count / total) * 100) : 0;
        return (
          <div key={d.domain} className="flex items-center gap-3">
            <div className={`w-9 h-9 rounded-xl ${meta.bg} flex items-center justify-center flex-shrink-0`}>
              <Icon className={`w-4.5 h-4.5 ${meta.text}`} />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between mb-1">
                <span className="text-sm text-stone-700">{domainLabel(d.domain, locale)}</span>
                <span className="text-sm font-medium text-stone-800">{pct}%</span>
              </div>
              <div className="h-2 bg-stone-100 rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full ${meta.bg.replace("/15", "").replace("bg-", "bg-")}`}
                  style={{ width: `${pct}%` }}
                />
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
