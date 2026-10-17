import { getSession } from "@/lib/auth";
import { NotificationsView } from "@/components/notifications-view";

export default async function NotificationsPage() {
  const session = await getSession();
  if (!session) return null;
  return <NotificationsView session={session} />;
}
