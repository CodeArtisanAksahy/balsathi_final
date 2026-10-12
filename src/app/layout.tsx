import type { Metadata } from "next";
import "./globals.css";
import { getSession } from "@/lib/auth";
import { AppShell } from "@/components/app-shell";

export const metadata: Metadata = {
  title: "Balsathi AI",
  description: "Nurturing Every Child's Development Through AI",
};

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getSession();
  return (
    <html lang={session?.preferredLanguage ?? "en"}>
      <body>
        <AppShell session={session}>{children}</AppShell>
      </body>
    </html>
  );
}
