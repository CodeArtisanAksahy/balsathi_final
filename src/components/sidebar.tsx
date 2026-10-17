"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Users,
  UserPlus,
  ClipboardList,
  Mic,
  Camera,
  FileText,
  MessageSquare,
  Settings,
  Cloud,
  Baby,
  TrendingUp,
  Activity,
  Heart,
  BookOpen,
  HelpCircle,
  Sparkles,
  Building2,
  ShieldCheck,
  BarChart3,
  Brain,
  Database,
  Bell,
  HeartPulse,
  Server,
  Lock,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { SessionUser } from "@/lib/domain";
import { getMessages } from "@/lib/i18n";

type NavItem = { href: string; label: string; icon: React.ComponentType<{ className?: string }> };

const workerNav: NavItem[] = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/children", label: "Children", icon: Users },
  { href: "/children/new", label: "Add Child", icon: UserPlus },
  { href: "/observations/new", label: "New Observation", icon: ClipboardList },
  { href: "/observations/voice", label: "Voice Observation", icon: Mic },
  { href: "/observations/photo", label: "Photo Observation", icon: Camera },
  { href: "/milestones", label: "Milestones", icon: Activity },
  { href: "/worker/ai-insights", label: "AI Insights", icon: Brain },
  { href: "/reports", label: "Reports", icon: FileText },
  { href: "/messages", label: "Messages", icon: MessageSquare },
  { href: "/assistant", label: "AI Assistant", icon: Sparkles },
  { href: "/offline", label: "Offline & Sync", icon: Cloud },
  { href: "/settings", label: "Settings", icon: Settings },
];

const parentNav: NavItem[] = [
  { href: "/dashboard", label: "Home", icon: LayoutDashboard },
  { href: "/children", label: "My Children", icon: Baby },
  { href: "/milestones", label: "Milestone Journey", icon: Activity },
  { href: "/recommendations", label: "Home Activities", icon: Heart },
  { href: "/growth", label: "Growth", icon: TrendingUp },
  { href: "/messages", label: "Messages", icon: MessageSquare },
  { href: "/reports", label: "Reports", icon: FileText },
  { href: "/parent/health", label: "Health & Nutrition", icon: HeartPulse },
  { href: "/help", label: "Help & Support", icon: HelpCircle },
  { href: "/assistant", label: "AI Assistant", icon: Sparkles },
  { href: "/parent/settings", label: "Settings", icon: Settings },
];

const adminNav: NavItem[] = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/admin/users", label: "Users", icon: Users },
  { href: "/admin/centers", label: "Centers", icon: Building2 },
  { href: "/admin/children", label: "Children", icon: Baby },
  { href: "/admin/analytics", label: "Analytics", icon: BarChart3 },
  { href: "/admin/ai-rules", label: "AI Rules", icon: Brain },
  { href: "/admin/content", label: "Content", icon: BookOpen },
  { href: "/admin/data-quality", label: "Data Quality", icon: Database },
  { href: "/admin/notifications", label: "Notifications", icon: Bell },
  { href: "/admin/audit", label: "Audit Logs", icon: ShieldCheck },
  { href: "/admin/system-health", label: "System Health", icon: Server },
  { href: "/admin/privacy", label: "Privacy", icon: Lock },
  { href: "/reports", label: "Reports", icon: FileText },
  { href: "/assistant", label: "AI Assistant", icon: Sparkles },
  { href: "/admin/settings", label: "Settings", icon: Settings },
];

export function Sidebar({
  session,
  mobileOpen,
  onClose,
}: {
  session: SessionUser;
  mobileOpen: boolean;
  onClose: () => void;
}) {
  const pathname = usePathname();
  const t = getMessages(session.preferredLanguage);
  const nav = session.role === "PARENT" ? parentNav : session.role === "WORKER" ? workerNav : adminNav;

  return (
    <>
      {mobileOpen && (
        <button type="button" aria-label="Close navigation" className="fixed inset-0 z-40 border-0 bg-black/40 p-0 lg:hidden" onClick={onClose} />
      )}
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-50 w-64 bg-white border-r border-stone-200 flex flex-col transition-transform duration-300 lg:translate-x-0",
          mobileOpen ? "translate-x-0" : "-translate-x-full",
        )}
      >
        <div className="flex items-center gap-2.5 px-5 h-16 border-b border-stone-200">
          <div className="w-9 h-9 rounded-xl bg-forest flex items-center justify-center">
            <Sparkles className="w-5 h-5 text-white" />
          </div>
          <div>
            <div className="font-bold text-forest text-lg leading-tight">Balsathi</div>
            <div className="text-[10px] text-stone-500 uppercase tracking-wide">AI Assistant</div>
          </div>
        </div>

        <nav className="flex-1 overflow-y-auto p-3 space-y-1">
          {nav.map((item) => {
            const Icon = item.icon;
            const active = pathname === item.href || pathname.startsWith(item.href + "/");
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={onClose}
                className={cn(
                  "flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors",
                  active
                    ? "bg-forest/10 text-forest"
                    : "text-stone-600 hover:bg-stone-100 hover:text-stone-900",
                )}
              >
                <Icon className="w-4.5 h-4.5 flex-shrink-0" />
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="p-3 border-t border-stone-200">
          <div className="flex items-center gap-3 px-2 py-2">
            <div className="w-9 h-9 rounded-full bg-forest/15 flex items-center justify-center text-forest font-semibold text-sm">
              {session.name.slice(0, 2).toUpperCase()}
            </div>
            <div className="min-w-0">
              <div className="text-sm font-medium text-stone-900 truncate">{session.name}</div>
              <div className="text-xs text-stone-500 capitalize">{session.role.toLowerCase().replace("_", " ")}</div>
            </div>
          </div>
        </div>
      </aside>
    </>
  );
}
