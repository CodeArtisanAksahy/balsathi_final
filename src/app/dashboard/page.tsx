import { getSession } from "@/lib/auth";
import { getDashboardData } from "@/lib/data";
import { DashboardContent } from "@/components/dashboard-content";

export default async function DashboardPage() {
  const session = await getSession();
  if (!session) return null;
  // Data is now read from the reactive client store; server data is for initial SSR only.
  const data = getDashboardData(session);
  return <DashboardContent session={session} data={data} />;
}
