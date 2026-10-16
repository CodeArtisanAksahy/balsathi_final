import { getSession } from "@/lib/auth";
import { getCenters } from "@/lib/data";
import { AdminCenters } from "@/components/admin-centers";
import { config } from "@/lib/config";
import { listProvisionedCenters } from "@/lib/provisioning-service";
import { requirePermission } from "@/lib/authorization";

export default async function AdminCentersPage() {
  const session = await getSession();
  if (!session) return null;
  requirePermission(session.role, "admin:read");
  const sourceCenters = config.dataMode === "sqlite" ? await listProvisionedCenters(session) : getCenters(session);
  const centers = sourceCenters.map((center: any) => ({ ...center, createdAt: typeof center.createdAt === "string" ? center.createdAt : center.createdAt.toISOString(), updatedAt: typeof center.updatedAt === "string" ? center.updatedAt : center.updatedAt.toISOString() }));
  return <AdminCenters session={session} centers={centers} databaseMode={config.dataMode === "sqlite"} />;
}
