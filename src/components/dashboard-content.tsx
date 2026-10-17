"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import {
  Users, ClipboardList, AlertTriangle, Mic, Camera, CheckSquare,
  TrendingUp, FileText, Baby, Wifi, WifiOff,
} from "lucide-react";
import type { SessionUser } from "@/lib/domain";
import { ageLabel } from "@/lib/utils";
import { DomainTree } from "./domain-tree";
import { useStoreSelector } from "@/hooks/use-store";
import { getDashboardData, getRecentObservationChildren } from "@/lib/selectors";
import { DevelopmentJourney } from "./development-journey";
import { ParentDashboard } from "./parent-dashboard";

type DashboardData = Awaited<ReturnType<typeof import("@/lib/data").getDashboardData>>;

export function DashboardContent({ session, data: _initialData }: { session: SessionUser; data?: DashboardData }) {
  const isParent = session.role === "PARENT";
  const [isOnline, setIsOnline] = useState<boolean | null>(null);

  useEffect(() => {
    const updateConnection = () => setIsOnline(navigator.onLine);
    updateConnection();
    window.addEventListener("online", updateConnection);
    window.addEventListener("offline", updateConnection);
    return () => {
      window.removeEventListener("online", updateConnection);
      window.removeEventListener("offline", updateConnection);
    };
  }, []);

  // All counts and child details come from the caller's authorized store scope.
  const data = useStoreSelector((state) => getDashboardData(state, session));
  const recentObservationChildren = useStoreSelector((state) => getRecentObservationChildren(state, session));

  const quickActions = isParent
    ? [
        { label: "Progress", icon: TrendingUp, href: "/children", color: "bg-[#e8f1e6] text-[#426c46]" },
        { label: "Milestones", icon: CheckSquare, href: "/milestones", color: "bg-[#f0e9fa] text-[#8256b1]" },
        { label: "Activities", icon: Baby, href: "/recommendations", color: "bg-[#fff0df] text-[#c8792b]" },
        { label: "Messages", icon: ClipboardList, href: "/messages", color: "bg-[#e6f2f8] text-[#347ea6]" },
        { label: "Reports", icon: FileText, href: "/reports", color: "bg-[#fbe9e8] text-[#bb5b55]" },
      ]
    : [
        { label: "Voice Observation", icon: Mic, href: "/observations/voice", color: "bg-[#e8f1e6] text-[#426c46]" },
        { label: "Add Photo", icon: Camera, href: "/observations/photo", color: "bg-[#f0e9fa] text-[#8256b1]" },
        { label: "Milestone Check", icon: CheckSquare, href: "/milestones", color: "bg-[#fff0df] text-[#c8792b]" },
        { label: "Growth Entry", icon: TrendingUp, href: "/growth", color: "bg-[#e6f2f8] text-[#347ea6]" },
        { label: "View Reports", icon: FileText, href: "/reports", color: "bg-[#fbe9e8] text-[#bb5b55]" },
      ];

  const cards = [
    { label: isParent ? "My Children" : "Total Children", value: data.totalChildren, sub: "Registered", icon: Users, color: "bg-[#e8f1e6] text-[#426c46]", tint: "bg-[#fcfdfb]" },
    { label: "Observations", value: data.observationsThisWeek, sub: "This week", icon: ClipboardList, color: "bg-[#f0e9fa] text-[#8256b1]", tint: "bg-[#fdfbff]" },
    { label: isParent ? "Follow-ups" : "At Risk", value: data.followUpChildren, sub: "Needs attention", icon: AlertTriangle, color: "bg-[#fff0df] text-[#c8792b]", tint: "bg-[#fffdfa]" },
    { label: "Offline Status", value: isOnline === null ? "Checking" : isOnline ? "Online" : "Offline", sub: "Network", icon: isOnline === false ? WifiOff : Wifi, color: isOnline === false ? "bg-[#fff0df] text-[#c8792b]" : "bg-[#e6f2f8] text-[#347ea6]", tint: "bg-[#fbfdfe]" },
  ];
  const displayedChildren = isParent && data.attentionChildren.length === 0
    ? recentObservationChildren
    : data.attentionChildren;

  if (isParent) return <ParentDashboard session={session} />;

  return (
    <div className="space-y-5 pb-6">
      <header className="pt-1">
        <h2 className="text-2xl font-bold text-stone-800">Namaste, {session.name.split(" ")[0]}! <span aria-hidden="true">👋</span></h2>
        <p className="mt-1 text-sm text-stone-500">Every observation today shapes a better tomorrow.</p>
      </header>

      <section aria-label="Dashboard summary" className="grid grid-cols-2 gap-2.5 min-[390px]:grid-cols-4 sm:gap-3">
        {cards.map(({ label, value, sub, icon: Icon, color, tint }) => (
          <div key={label} className={`card card-hover min-w-0 border-[#e9e5d9] p-2 sm:p-3 ${tint}`}>
            <div className="flex items-center gap-2">
              <span className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full ${color}`}><Icon className="h-4 w-4" /></span>
              <div className="min-w-0">
                <span className="block text-[9px] font-medium leading-tight text-stone-500 sm:text-[11px]">{label}</span>
                <div className="mt-0.5 text-lg font-bold leading-tight text-stone-800 sm:text-2xl">{value}</div>
                <p className="text-[9px] leading-tight text-stone-500 sm:text-[10px]">{sub}</p>
              </div>
            </div>
          </div>
        ))}
      </section>

      <DevelopmentJourney session={session} />

      <section aria-label="Development and follow-ups" className="grid grid-cols-1 gap-3 min-[390px]:grid-cols-2 sm:gap-4">
        <div className="card p-4 sm:p-5">
          <div className="mb-4 flex items-center justify-between gap-3">
            <div><h3 className="font-semibold text-stone-800">Development Overview</h3><p className="text-[10px] text-stone-400">Domain-wise</p></div>
          </div>
          <div className="grid grid-cols-[minmax(76px,0.7fr)_minmax(0,1.5fr)] items-center gap-3 sm:gap-5">
            <div className="flex justify-center" aria-hidden="true">
              <svg viewBox="0 0 120 160" className="h-36 w-full max-w-28" role="presentation">
                <path d="M60 146V75m0 34L32 82m28 42 30-34M60 91 48 56m12 25 20-34" fill="none" stroke="#8b6b42" strokeLinecap="round" strokeWidth="5" />
                <circle cx="60" cy="40" r="18" fill="#a7c78c" /><circle cx="37" cy="59" r="17" fill="#bdd69f" /><circle cx="83" cy="60" r="18" fill="#9fbe7d" />
                <circle cx="32" cy="82" r="13" fill="#f7bd86" /><circle cx="91" cy="83" r="13" fill="#f5d276" /><circle cx="48" cy="55" r="11" fill="#c9b4e6" /><circle cx="80" cy="48" r="11" fill="#aad4df" />
                <circle cx="60" cy="40" r="4" fill="#547d3b" /><circle cx="32" cy="82" r="4" fill="#d87d63" /><circle cx="91" cy="83" r="4" fill="#ddaa36" />
                <path d="M22 147h76" stroke="#c9d9bb" strokeLinecap="round" strokeWidth="5" />
              </svg>
            </div>
            <DomainTree domainOverview={data.domainOverview} locale={session.preferredLanguage} />
          </div>
        </div>

        <div className="card p-4 sm:p-5">
          <div className="mb-3 flex items-center justify-between gap-3">
            <div><h3 className="font-semibold text-stone-800">{isParent ? "Recent Updates" : "Children Needing Attention"}</h3><p className="text-[11px] text-stone-400">{isParent ? "Recent activity for your linked children" : "Children in your authorized scope"}</p></div>
            <Link href="/children" className="shrink-0 text-xs font-medium text-forest hover:underline">View All</Link>
          </div>
          {displayedChildren.length > 0 ? <div className="divide-y divide-stone-100">
            {displayedChildren.slice(0, 4).map((item, i) => (
              <Link key={item.child?.id ?? i} href={item.child?.id ? `/children/${item.child.id}` : "/children"} className="flex items-center gap-3 py-3 transition hover:bg-stone-50">
                <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-sm font-semibold ${["bg-[#e8f1e6] text-[#426c46]", "bg-[#f0e9fa] text-[#8256b1]", "bg-[#fff0df] text-[#a86120]", "bg-[#e6f2f8] text-[#347ea6]"][i % 4]}`}>{item.child?.fullName?.slice(0, 2).toUpperCase() ?? "??"}</div>
                <div className="min-w-0 flex-1"><div className="truncate text-sm font-medium text-stone-800">{item.child?.fullName ?? "Child"}</div><div className="truncate text-xs text-stone-500">{item.child ? ageLabel(item.child.dateOfBirth) : ""}{item.risks?.length ? ` • ${item.risks[0]?.title ?? "Follow-up"}` : isParent ? " • Recent observation" : " • Follow-up review"}</div></div>
                {item.risks?.length > 0 && <span className={`badge shrink-0 ${item.risks[0]?.level === "HIGH" ? "bg-[#fde8e5] text-[#b64037]" : item.risks[0]?.level === "LOW" ? "bg-[#e8f1e6] text-[#426c46]" : "bg-[#fff0df] text-[#a86120]"}`}>{item.risks[0]?.level ?? "MODERATE"}</span>}
              </Link>
            ))}
          </div> : <p className="py-8 text-center text-sm text-stone-400">{isParent ? "No recent updates yet." : "No children currently need attention."}</p>}
        </div>
      </section>

      <section className="card p-4 sm:p-5">
        <h3 className="mb-3 font-semibold text-stone-800">Quick Actions</h3>
        <div className="grid grid-cols-5 gap-1 sm:gap-3">
          {quickActions.map(({ label, icon: Icon, href, color }) => (
            <Link key={label} href={href} className="flex min-w-0 flex-col items-center gap-2 rounded-xl p-2 text-center transition hover:bg-stone-50 sm:p-3">
              <span className={`flex h-11 w-11 items-center justify-center rounded-2xl ${color}`}><Icon className="h-5 w-5" /></span>
              <span className="text-[10px] font-medium leading-tight text-stone-600 sm:text-xs">{label}</span>
            </Link>
          ))}
        </div>
      </section>

    </div>
  );
}
