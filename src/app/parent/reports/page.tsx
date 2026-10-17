import { getSession } from "@/lib/auth";
import { ReportsView } from "@/components/reports-view";

export default async function ParentReportsPage() {
  const session = await getSession();
  if (!session) return null;
  return <ReportsView session={session} />;
}
