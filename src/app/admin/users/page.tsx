import { getSession } from "@/lib/auth";
import { getWorkers } from "@/lib/data";
import { AdminUsers } from "@/components/admin-users";

export default async function AdminUsersPage() {
  const session = await getSession();
  if (!session) return null;
  const users = getWorkers(session);
  return <AdminUsers session={session} users={users} />;
}
