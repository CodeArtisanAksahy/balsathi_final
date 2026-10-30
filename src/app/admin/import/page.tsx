import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { requirePermission } from "@/lib/authorization";
import { ChildImport } from "@/components/child-import";

export default async function ChildImportPage() {
  const session = await getSession(); if (!session) return null;
  requirePermission(session.role, "admin:write");
  if (session.role !== "DISTRICT_ADMIN") redirect("/admin/dashboard");
  return <ChildImport />;
}
