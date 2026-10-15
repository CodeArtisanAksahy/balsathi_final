"use client";

import Link from "next/link";
import {
  Users,
  ClipboardList,
  AlertTriangle,
  Mic,
  Camera,
  CheckSquare,
  TrendingUp,
  FileText,
  Baby,
  Building2,
  UserCheck,
  UserPlus,
} from "lucide-react";
import type { SessionUser } from "@/lib/domain";
import { domainLabel, getMessages } from "@/lib/i18n";
import { formatDateTime, ageLabel } from "@/lib/utils";
import { DomainTree } from "./domain-tree";
import { AreaChartCard } from "./area-chart-card";
import { useStoreSelector } from "@/hooks/use-store";
import { getDashboardData, getChildRisks } from "@/lib/selectors";

type DashboardData = Awaited<ReturnType<typeof import("@/lib/data").getDashboardData>>;

const statCards = [
  { key: "totalChildren", sub: "In your scope", icon: Users, color: "bg-forest/10 text-forest" },
  { key: "observationsThisWeek", sub: "Recorded this week", icon: ClipboardList, color: "bg-purple-100 text-purple-600" },
  { key: "followUpChildren", sub: "Children with open follow-ups", icon: AlertTriangle, color: "bg-amber-100 text-amber-600" },
];

export function DashboardContent({ session, data: _initialData }: { session: SessionUser; data?: DashboardData }) {
  const t = getMessages(session.preferredLanguage);
  const isParent = session.role === "PARENT";
  const isAdmin = session.role === "CENTER_ADMIN" || session.role === "DISTRICT_ADMIN";

  // Read live data from the reactive store
  const data = useStoreSelector((state) => getDashboardData(state, session));
  // Also get child names for attention list
  const attentionChildren = useStoreSelector((state) => {
    const children = getDashboardData(state, session).attentionChildren;
    return children.slice(0, 3);
  });

  const quickActions = isParent
    ? [
        { label: "Progress", icon: TrendingUp, href: "/children", color: "bg-forest/10 text-forest" },
        { label: "Milestones", icon: CheckSquare, href: "/milestones", color: "bg-purple-100 text-purple-600" },
        { label: "Activities", icon: Baby, href: "/recommendations", color: "bg-amber-100 text-amber-600" },
        { label: "Messages", icon: ClipboardList, href: "/messages", color: "bg-blue-100 text-blue-600" },
        { label: "Reports", icon: FileText, href: "/reports", color: "bg-rose-100 text-rose-600" },
      ]
    : [
        { label: "Voice Observation", icon: Mic, href: "/observations/voice", color: "bg-forest/10 text-forest" },
        { label: "Add Photo", icon: Camera, href: "/observations/photo", color: "bg-purple-100 text-purple-600" },
        { label: "Milestone Check", icon: CheckSquare, href: "/children", color: "bg-amber-100 text-amber-600" },
        { label: "Growth Entry", icon: TrendingUp, href: "/children", color: "bg-blue-100 text-blue-600" },
        { label: "Reports", icon: FileText, href: "/reports", color: "bg-rose-100 text-rose-600" },
      ];

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-stone-800">
          Namaste, {session.name.split(" ")[0]}! 👋
        </h2>
        <p className="text-stone-500 text-sm mt-1">Every observation today shapes a better tomorrow.</p>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {statCards.map((card) => {
          const Icon = card.icon;
          const value = isAdmin && card.key === "totalChildren" ? (data as any).totalChildren : (data as any)[card.key] ?? 0;
          return (
            <div key={card.key} className="card p-4 card-hover">
              <div className="flex items-start justify-between">
                <div className={`w-11 h-11 rounded-xl ${card.color} flex items-center justify-center`}>
                  <Icon className="w-5 h-5" />
                </div>
              </div>
              <div className="mt-3">
                <div className="text-2xl font-bold text-stone-800">{value}</div>
              <div className="text-xs text-stone-500">{card.sub}</div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Admin extra stats */}
      {isAdmin && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            { label: "Total Centers", value: (data as any).totalCenters ?? 0, icon: Building2, color: "bg-sage-light text-forest" },
            { label: "Active Workers", value: (data as any).activeWorkers ?? 0, icon: UserCheck, color: "bg-blue-100 text-blue-600" },
            { label: "Registered Parents", value: (data as any).registeredParents ?? 0, icon: Users, color: "bg-purple-100 text-purple-600" },
            { label: "Pending Review", value: (data as any).pendingReview ?? 0, icon: AlertTriangle, color: "bg-amber-100 text-amber-600" },
          ].map((s) => {
            const Icon = s.icon;
            return (
              <div key={s.label} className="card p-4 card-hover">
                <div className={`w-10 h-10 rounded-xl ${s.color} flex items-center justify-center mb-2`}>
                  <Icon className="w-5 h-5" />
                </div>
                <div className="text-2xl font-bold text-stone-800">{s.value}</div>
                <div className="text-xs text-stone-500">{s.label}</div>
              </div>
            );
          })}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Development overview */}
        <div className="card p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-stone-800">Development Overview</h3>
            <span className="text-xs text-stone-400">Domain-wise</span>
          </div>
          <DomainTree domainOverview={data.domainOverview} locale={session.preferredLanguage} />
        </div>

        {/* Children needing attention */}
        <div className="card p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-stone-800">
              {isParent ? "Recent Updates" : "Children Needing Attention"}
            </h3>
            <Link href="/children" className="text-xs text-forest font-medium hover:underline">View All</Link>
          </div>
          <div className="space-y-3">
            {(data.attentionChildren.length > 0 ? data.attentionChildren.slice(0, 3) : data.recentObservations.slice(0, 3).map((o) => ({ child: (o as any).child, risks: [] }))).map((item: any, i: number) => (
              <Link key={i} href={`/children/${item.child?.id ?? "#"}`} className="flex items-center gap-3 p-2.5 rounded-xl hover:bg-stone-50 transition">
                <div className="w-10 h-10 rounded-full bg-forest/15 flex items-center justify-center text-forest font-semibold text-sm flex-shrink-0">
                  {item.child?.fullName?.slice(0, 2).toUpperCase() ?? "??"}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="text-sm font-medium text-stone-800 truncate">{item.child?.fullName ?? "Unknown"}</div>
                  <div className="text-xs text-stone-500 truncate">
                    {item.child ? ageLabel(item.child.dateOfBirth) : ""}
                    {item.risks?.length ? ` • ${item.risks[0]?.title ?? "Follow-up"}` : ""}
                  </div>
                </div>
                {item.risks?.length > 0 && (
                  <span className="badge bg-amber-light text-amber-700">{item.risks[0]?.level ?? "MODERATE"}</span>
                )}
              </Link>
            ))}
            {data.attentionChildren.length === 0 && data.recentObservations.length === 0 && (
              <p className="text-sm text-stone-400 text-center py-4">No records yet.</p>
            )}
          </div>
        </div>
      </div>

      {/* Recent observations */}
      <div className="card p-5">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold text-stone-800">Recently Recorded Observations</h3>
          <Link href="/observations/new" className="text-xs text-forest font-medium hover:underline">+ New</Link>
        </div>
        <div className="space-y-2">
          {data.recentObservations.slice(0, 4).map((obs: any) => (
            <div key={obs.id} className="flex items-start gap-3 p-3 rounded-xl bg-stone-50/60">
              <div className={`w-2 h-2 rounded-full mt-1.5 flex-shrink-0 ${obs.followUpRequired ? "bg-amber-500" : "bg-forest"}`} />
              <div className="min-w-0 flex-1">
                <div className="text-sm text-stone-700 line-clamp-1">{obs.observationText}</div>
                <div className="text-xs text-stone-400 mt-0.5">
                  {domainLabel(obs.domain, session.preferredLanguage)} • {formatDateTime(obs.observedAt, session.preferredLanguage)}
                </div>
              </div>
            </div>
          ))}
          {data.recentObservations.length === 0 && (
            <p className="text-sm text-stone-400 text-center py-4">No observations yet.</p>
          )}
        </div>
      </div>

      {/* Quick actions */}
      <div className="card p-5">
        <h3 className="font-semibold text-stone-800 mb-4">Quick Actions</h3>
        <div className="grid grid-cols-5 gap-3">
          {quickActions.map((action) => {
            const Icon = action.icon;
            return (
              <Link key={action.label} href={action.href} className="flex flex-col items-center gap-2 p-3 rounded-xl hover:bg-stone-50 transition">
                <div className={`w-12 h-12 rounded-2xl ${action.color} flex items-center justify-center`}>
                  <Icon className="w-6 h-6" />
                </div>
                <span className="text-xs text-stone-600 text-center font-medium">{action.label}</span>
              </Link>
            );
          })}
        </div>
      </div>

      {/* Upcoming milestone reviews */}
      {data.upcomingMilestoneReviews.length > 0 && (
        <div className="card p-5">
          <h3 className="font-semibold text-stone-800 mb-4">Upcoming Milestone Reviews</h3>
          <div className="space-y-2">
            {data.upcomingMilestoneReviews.slice(0, 3).map((a: any) => (
              <div key={a.id} className="flex items-center justify-between p-3 rounded-xl bg-stone-50/60">
                <div>
                  <div className="text-sm font-medium text-stone-700">Milestone assessment</div>
                  <div className="text-xs text-stone-400">{formatDateTime(a.assessedAt, session.preferredLanguage)}</div>
                </div>
                <span className={`badge ${a.status === "NEEDS_REVIEW" ? "bg-amber-light text-amber-700" : "bg-blue-100 text-blue-600"}`}>
                  {a.status}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Analytics chart for admin/worker */}
      {!isParent && <AreaChartCard session={session} />}
    </div>
  );
}
