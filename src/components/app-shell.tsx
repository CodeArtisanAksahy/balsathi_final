"use client";

import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { Sidebar } from "./sidebar";
import { Header } from "./header";
import type { SessionUser } from "@/lib/domain";
import { ChatWidget } from "./chat-widget";
import { getConfiguredDataMode } from "@/lib/fetch";
import { clientStore } from "@/lib/client-store";
import Link from "next/link";
import { ChartNoAxesColumn, Hand, House, MessageSquare, MoreHorizontal } from "lucide-react";
import { useStoreSelector } from "@/hooks/use-store";
import { getAuthorizedChildren } from "@/lib/selectors";

const publicPaths = ["/", "/login", "/create-account"];

export function AppShell({ session, children }: { session: SessionUser | null; children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [storeReady, setStoreReady] = useState(false);
  const [storeError, setStoreError] = useState("");
  const [bootstrapAttempt, setBootstrapAttempt] = useState(0);
  const storeHasLoaded = useRef(false);

  const isPublic = publicPaths.includes(pathname);

  useEffect(() => {
    if (!session && !isPublic) {
      router.push("/login");
    }
  }, [session, isPublic, router]);

  useEffect(() => {
    if (!session || isPublic) return;
    let cancelled = false;
    void getConfiguredDataMode().then(async (mode) => {
      if (mode === "demo") { storeHasLoaded.current = true; setStoreReady(true); return; }
      const response = await fetch("/api/bootstrap", { cache: "no-store" });
      if (!response.ok) { const body = await response.json().catch(() => ({})); throw new Error(body.error?.message ?? "Unable to load database records."); }
      if (cancelled) return;
      const payload = await response.json();
      if (!payload.data?.state) throw new Error("The database did not return an application data snapshot.");
      if (!cancelled) clientStore.replace(payload.data.state);
      if (!cancelled) { storeHasLoaded.current = true; setStoreError(""); setStoreReady(true); }
    }).catch((error) => { if (!cancelled && !storeHasLoaded.current) { setStoreError(error instanceof Error ? error.message : "Unable to load records."); setStoreReady(true); } });
    return () => { cancelled = true; };
  }, [session, isPublic, bootstrapAttempt]);

  if (isPublic) {
    return <div className="min-h-screen">{children}</div>;
  }

  if (!session) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-cream">
        <div className="text-stone-500">Loading…</div>
      </div>
    );
  }

  if (!storeReady) {
    return <div className="min-h-screen flex items-center justify-center bg-cream text-stone-500">Loading records…</div>;
  }
  if (storeError) {
    return <div className="min-h-screen flex items-center justify-center bg-cream"><div className="card p-6 max-w-md"><h1 className="font-semibold text-stone-800">Records unavailable</h1><p className="text-sm text-stone-600 mt-2">{storeError}</p><button className="btn-secondary mt-4" onClick={() => { setStoreError(""); setStoreReady(false); setBootstrapAttempt((attempt) => attempt + 1); }}>Retry</button></div></div>;
  }

  return (
    <div className="min-h-screen bg-cream">
      <Sidebar session={session} mobileOpen={mobileOpen} onClose={() => setMobileOpen(false)} />
      <div className="lg:pl-64">
        <Header session={session} onMenuClick={() => setMobileOpen(true)} />
        <main className={`p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto ${session.role === "PARENT" ? "pb-24 sm:pb-8" : ""}`}>{children}</main>
      </div>
      {session.role === "PARENT" && <ParentMobileNav session={session} pathname={pathname} />}
      <ChatWidget session={session} />
    </div>
  );
}

function ParentMobileNav({ session, pathname }: { session: SessionUser; pathname: string }) {
  const child = useStoreSelector((state) => getAuthorizedChildren(state, session)[0]);
  const items = [
    { label: "Home", href: "/dashboard", icon: House },
    { label: "Progress", href: child ? `/growth?childId=${child.id}` : "/children", icon: ChartNoAxesColumn },
    { label: "Activities", href: "/parent/activities", icon: Hand },
    { label: "Messages", href: "/parent/messages", icon: MessageSquare },
    { label: "More", href: "/parent/more", icon: MoreHorizontal },
  ];
  return <nav aria-label="Parent navigation" className="fixed inset-x-0 bottom-0 z-30 grid grid-cols-5 border-t border-[#e8e3d8] bg-[#fffdf8]/95 px-2 pb-[max(env(safe-area-inset-bottom),0.4rem)] pt-2 backdrop-blur lg:hidden">{items.map(({ label, href, icon: Icon }) => {
    const active = label === "Home" ? pathname === "/dashboard" : label === "Progress" ? pathname === "/growth" || pathname.includes("/progress") || pathname === "/parent/reports" : label === "More" ? ["/parent/more", "/parent/settings", "/parent/health", "/help", "/notifications"].includes(pathname) : pathname === href || pathname.startsWith(`${href}/`);
    return <Link key={label} href={href} className={`flex flex-col items-center gap-1 rounded-xl py-1 text-[10px] ${active ? "bg-[#eaf3e8] font-semibold text-[#386d43]" : "text-stone-500"}`}><Icon className="h-5 w-5" />{label}</Link>;
  })}</nav>;
}
