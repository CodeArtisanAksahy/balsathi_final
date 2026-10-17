"use client";

import { useRouter } from "next/navigation";
import { Menu, Bell, Globe, LogOut } from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import type { SessionUser } from "@/lib/domain";
import { appLocales } from "@/lib/domain";
import { localeLabels } from "@/lib/i18n";
import { cn } from "@/lib/utils";
import { apiFetch } from "@/lib/fetch";

export function Header({ session, onMenuClick }: { session: SessionUser; onMenuClick: () => void }) {
  const router = useRouter();
  const [langOpen, setLangOpen] = useState(false);

  async function handleLogout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
    router.refresh();
  }

  async function switchLocale(locale: string) {
    await fetch("/api/auth/locale", { method: "POST", body: JSON.stringify({ locale }) });
    setLangOpen(false);
    router.refresh();
  }

  return (
    <header className="sticky top-0 z-30 bg-cream/90 backdrop-blur border-b border-stone-200">
      <div className="flex items-center justify-between h-16 px-4 sm:px-6">
        <div className="flex items-center gap-3">
          <button onClick={onMenuClick} className="lg:hidden p-2 rounded-lg hover:bg-stone-200">
            <Menu className="w-5 h-5" />
          </button>
          <div className="hidden sm:block">
            <h1 className="text-lg font-semibold text-stone-800">
              {session.role === "PARENT" ? "Parent Home" : session.role === "WORKER" ? "Worker Dashboard" : "Admin Panel"}
            </h1>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <div className="relative">
            <button
              onClick={() => setLangOpen((v) => !v)}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm text-stone-600 hover:bg-stone-200 transition"
            >
              <Globe className="w-4 h-4" />
              <span className="hidden sm:inline">{localeLabels[session.preferredLanguage]}</span>
            </button>
            {langOpen && (
              <div className="absolute right-0 mt-2 w-36 bg-white rounded-xl border border-stone-200 shadow-lg py-1 z-50">
                {appLocales.map((loc) => (
                  <button
                    key={loc}
                    onClick={() => switchLocale(loc)}
                    className={cn(
                      "w-full text-left px-3 py-2 text-sm hover:bg-stone-100",
                      loc === session.preferredLanguage ? "text-forest font-medium" : "text-stone-600",
                    )}
                  >
                    {localeLabels[loc]}
                  </button>
                ))}
              </div>
            )}
          </div>

          <NotificationBell />

          <button
            onClick={handleLogout}
            className="p-2 rounded-xl text-stone-600 hover:bg-stone-200 transition"
            title="Sign out"
          >
            <LogOut className="w-5 h-5" />
          </button>
        </div>
      </div>
    </header>
  );
}

function NotificationBell() {
  const [unreadCount, setUnreadCount] = useState(0);
  const refresh = useCallback(async () => {
    try {
      const result = await apiFetch<{ unreadCount: number }>("/api/notifications");
      setUnreadCount(result.unreadCount);
    } catch { setUnreadCount(0); }
  }, []);
  useEffect(() => {
    void refresh();
    const timer = window.setInterval(() => { if (document.visibilityState === "visible") void refresh(); }, 10_000);
    const focus = () => void refresh();
    window.addEventListener("focus", focus);
    return () => { window.clearInterval(timer); window.removeEventListener("focus", focus); };
  }, [refresh]);
  return (
    <Link href="/notifications" aria-label={unreadCount ? `Notifications, ${unreadCount} unread` : "Notifications"} className="relative rounded-xl p-2 text-stone-600 transition hover:bg-stone-200">
      <Bell className="h-5 w-5" />
      {unreadCount > 0 && <span className="absolute -right-1 -top-1 min-w-4 rounded-full bg-amber-500 px-1 text-center text-[10px] font-bold leading-4 text-white">{unreadCount > 99 ? "99+" : unreadCount}</span>}
    </Link>
  );
}
