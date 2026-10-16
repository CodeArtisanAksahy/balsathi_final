import { getSession } from "@/lib/auth";
import { getWorkers } from "@/lib/data";
import { AdminUsers } from "@/components/admin-users";
import { config } from "@/lib/config";
import { listProvisionedUsers } from "@/lib/provisioning-service";
import { requirePermission } from "@/lib/authorization";

export default async function AdminUsersPage() {
  const session = await getSession();
  if (!session) return null;
  requirePermission(session.role, "admin:read");
  const sourceUsers = config.dataMode === "sqlite" ? await listProvisionedUsers(session) : getWorkers(session);
  const users = sourceUsers.map((user: any) => ({ ...user, centerIds: Array.isArray(user.centerIds) ? user.centerIds : user.centerId ? [user.centerId] : [] }));
  return <AdminUsers session={session} users={users} databaseMode={config.dataMode === "sqlite"} />;
}
