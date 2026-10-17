import { getSession } from "@/lib/auth";
import { getAuditLogs } from "@/lib/data";
import { AuditLogs } from "@/components/audit-logs";
import { config } from "@/lib/config";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/authorization";
import type { AuditLog } from "@/lib/domain";

export default async function AdminAuditPage() {
  const session = await getSession();
  if (!session) return null;
  requirePermission(session.role, "admin:read");
  const logs = config.dataMode === "sqlite"
    ? await prisma.auditLog.findMany({ where: { scopeCenterId: { in: session.centerIds } }, orderBy: { createdAt: "desc" }, take: 500 }).then((rows) => rows.map((row) => ({ ...row, createdAt: row.createdAt.toISOString(), metadata: (row.metadata && typeof row.metadata === "object" && !Array.isArray(row.metadata) ? row.metadata : {}) as AuditLog["metadata"] })))
    : getAuditLogs(session);
  return <AuditLogs session={session} logs={logs} />;
}
