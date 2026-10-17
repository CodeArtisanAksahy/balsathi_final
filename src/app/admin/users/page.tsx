import { getSession } from "@/lib/auth";
import { getWorkers, getCenters } from "@/lib/data";
import { AdminUsers } from "@/components/admin-users";
import { config } from "@/lib/config";
import { listProvisionedUsers, listProvisionedCenters } from "@/lib/provisioning-service";
import { requirePermission } from "@/lib/authorization";

export default async function AdminUsersPage() {
  const session = await getSession();
  if (!session) return null;
  requirePermission(session.role, "admin:read");
  const [sourceUsers, sourceCenters] = config.dataMode === "sqlite"
    ? await Promise.all([listProvisionedUsers(session), listProvisionedCenters(session)])
    : [getWorkers(session), getCenters(session)];
  const users = sourceUsers.map((user: any) => ({ ...user, centerIds: Array.isArray(user.centerIds) ? user.centerIds : user.centerId ? [user.centerId] : [] }));
  const centerNames = Object.fromEntries(sourceCenters.map((center: any) => [center.id, center.name]));
  return <AdminUsers session={session} users={users} centerNames={centerNames} databaseMode={config.dataMode === "sqlite"} />;
}
