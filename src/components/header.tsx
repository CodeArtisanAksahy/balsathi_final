"use client";

import { useRouter } from "next/navigation";
import { Menu, Bell, Globe, LogOut } from "lucide-react";
import { useState } from "react";
import type { SessionUser } from "@/lib/domain";
import { appLocales } from "@/lib/domain";
import { localeLabels } from "@/lib/i18n";
import { cn } from "@/lib/utils";

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

          <button className="relative p-2 rounded-xl text-stone-600 hover:bg-stone-200 transition">
            <Bell className="w-5 h-5" />
            <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-amber-500 rounded-full" />
          </button>

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
