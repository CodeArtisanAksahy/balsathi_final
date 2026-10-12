import { randomUUID } from "node:crypto";
import { createDemoData } from "./demo-data";
import type { AuditLog, DemoData } from "./domain";

const processGlobal = globalThis as typeof globalThis & {
  __balsathiDemoData?: DemoData;
};

export function getDemoStore(): DemoData {
  processGlobal.__balsathiDemoData ??= createDemoData();
  return processGlobal.__balsathiDemoData;
}

export function resetDemoStore(): void {
  processGlobal.__balsathiDemoData = createDemoData();
}

export function newId(prefix: string): string {
  return `${prefix}-${randomUUID()}`;
}

export function appendAudit(data: DemoData, event: Omit<AuditLog, "id" | "createdAt">): AuditLog {
  const record: AuditLog = {
    id: newId("audit"),
    createdAt: new Date().toISOString(),
    ...event,
  };
  data.auditLogs.push(record);
  return record;
}
