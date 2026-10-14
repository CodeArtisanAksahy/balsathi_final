import { getSession } from "@/lib/auth";
import { AdminAnalytics } from "@/components/admin-analytics";

export default async function AdminAnalyticsPage() {
  const session = await getSession();
  if (!session) return null;
  return <AdminAnalytics session={session} />;
}
