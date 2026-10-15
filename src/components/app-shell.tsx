"use client";

import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Sidebar } from "./sidebar";
import { Header } from "./header";
import type { SessionUser } from "@/lib/domain";
import { ChatWidget } from "./chat-widget";
import { getConfiguredDataMode } from "@/lib/fetch";
import { clientStore } from "@/lib/client-store";

const publicPaths = ["/", "/login"];

export function AppShell({ session, children }: { session: SessionUser | null; children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [storeReady, setStoreReady] = useState(false);
  const [storeError, setStoreError] = useState("");
  const [bootstrapAttempt, setBootstrapAttempt] = useState(0);

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
      if (mode !== "sqlite") { setStoreReady(true); return; }
      const response = await fetch("/api/bootstrap", { cache: "no-store" });
      if (!response.ok) { const body = await response.json().catch(() => ({})); throw new Error(body.error?.message ?? "Unable to load database records."); }
      if (cancelled) return;
      const payload = await response.json();
      if (!payload.data?.state) throw new Error("The database did not return an application data snapshot.");
      if (!cancelled) clientStore.replace(payload.data.state);
      if (!cancelled) setStoreReady(true);
    }).catch((error) => { if (!cancelled) { setStoreError(error instanceof Error ? error.message : "Unable to load records."); setStoreReady(true); } });
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
        <main className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto">{children}</main>
      </div>
      <ChatWidget session={session} />
    </div>
  );
}
