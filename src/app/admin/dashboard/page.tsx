import { getSession } from "@/lib/auth";
import { requirePermission } from "@/lib/authorization";
import { config } from "@/lib/config";
import { AdminDashboard } from "@/components/admin-dashboard";

export default async function AdminDashboardPage() {
  const session = await getSession();
  if (!session) return null;
  requirePermission(session.role, "admin:read");
  return <AdminDashboard session={session} databaseMode={config.dataMode === "sqlite"} />;
}
