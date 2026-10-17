"use client";

import type { AppLocale, DevelopmentDomain } from "@/lib/domain";
import { domainLabel } from "@/lib/i18n";
import { Activity, Lightbulb, MessageCircle, Users, Heart } from "lucide-react";

const domainMeta: Record<DevelopmentDomain, { icon: React.ComponentType<{ className?: string }>; bg: string; text: string; bar: string }> = {
  PHYSICAL: { icon: Activity, bg: "bg-[#e8f1e6]", text: "text-[#426c46]", bar: "bg-[#79a86c]" },
  COGNITIVE: { icon: Lightbulb, bg: "bg-[#fff0df]", text: "text-[#b96d27]", bar: "bg-[#e6a34e]" },
  LANGUAGE: { icon: MessageCircle, bg: "bg-[#f0e9fa]", text: "text-[#8256b1]", bar: "bg-[#a485ce]" },
  SOCIAL: { icon: Users, bg: "bg-[#e6f2f8]", text: "text-[#347ea6]", bar: "bg-[#6da9c8]" },
  EMOTIONAL: { icon: Heart, bg: "bg-[#fbe9e8]", text: "text-[#bb5b55]", bar: "bg-[#d9827a]" },
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
              <div className="h-2 overflow-hidden rounded-full bg-[#f0eee8]">
                <div className={`h-full rounded-full ${meta.bar}`} style={{ width: `${pct}%` }} />
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
