import { getSession } from "@/lib/auth";
import { getAuditLogs } from "@/lib/data";
import { AuditLogs } from "@/components/audit-logs";

export default async function AdminAuditPage() {
  const session = await getSession();
  if (!session) return null;
  const logs = getAuditLogs(session);
  return <AuditLogs session={session} logs={logs} />;
}
