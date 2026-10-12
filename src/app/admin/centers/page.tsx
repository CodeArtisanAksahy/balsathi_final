import { getSession } from "@/lib/auth";
import { getCenters } from "@/lib/data";
import { AdminCenters } from "@/components/admin-centers";

export default async function AdminCentersPage() {
  const session = await getSession();
  if (!session) return null;
  const centers = getCenters(session);
  return <AdminCenters session={session} centers={centers} />;
}
