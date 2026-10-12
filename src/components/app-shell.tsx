"use client";

import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Sidebar } from "./sidebar";
import { Header } from "./header";
import type { SessionUser } from "@/lib/domain";
import { ChatWidget } from "./chat-widget";

const publicPaths = ["/", "/login"];

export function AppShell({ session, children }: { session: SessionUser | null; children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [mobileOpen, setMobileOpen] = useState(false);

  const isPublic = publicPaths.includes(pathname);

  useEffect(() => {
    if (!session && !isPublic) {
      router.push("/login");
    }
  }, [session, isPublic, router]);

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
