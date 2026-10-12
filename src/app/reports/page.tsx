import { getSession } from "@/lib/auth";
import { getChildrenReports } from "@/lib/data";
import { ReportsView } from "@/components/reports-view";

export default async function ReportsPage() {
  const session = await getSession();
  if (!session) return null;
  const reports = getChildrenReports(session);
  return <ReportsView session={session} reports={reports} />;
}
