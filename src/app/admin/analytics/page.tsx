import { getSession } from "@/lib/auth";
import { getSystemStats } from "@/lib/data";
import { AdminAnalytics } from "@/components/admin-analytics";

export default async function AdminAnalyticsPage() {
  const session = await getSession();
  if (!session) return null;
  const stats = getSystemStats(session);
  return <AdminAnalytics session={session} stats={stats} />;
}
