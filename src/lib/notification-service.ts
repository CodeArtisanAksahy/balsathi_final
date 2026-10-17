import { randomUUID } from "node:crypto";
import type { Prisma } from "@prisma/client";

type Transaction = Prisma.TransactionClient;

export async function notifyChildStakeholders(tx: Transaction, input: {
  actorId: string;
  childId: string;
  centerId: string;
  type: string;
  title: string;
  body: string;
}) {
  const [links, administrators] = await Promise.all([
    tx.childGuardian.findMany({ where: { childId: input.childId }, select: { guardian: { select: { linkedUserId: true } } } }),
    tx.user.findMany({ where: { active: true, role: { in: ["CENTER_ADMIN", "DISTRICT_ADMIN"] } }, select: { id: true, role: true, centerIds: true } }),
  ]);
  const candidateIds = new Set<string>();
  for (const link of links) if (link.guardian.linkedUserId) candidateIds.add(link.guardian.linkedUserId);
  for (const administrator of administrators) {
    const assignedCenters = Array.isArray(administrator.centerIds) ? administrator.centerIds : [];
    if (administrator.role === "DISTRICT_ADMIN" || assignedCenters.includes(input.centerId)) candidateIds.add(administrator.id);
  }
  const activeRecipients = candidateIds.size ? await tx.user.findMany({ where: { id: { in: [...candidateIds] }, active: true }, select: { id: true } }) : [];
  const recipientIds = new Set(activeRecipients.map((recipient) => recipient.id));
  recipientIds.delete(input.actorId);
  if (recipientIds.size === 0) return;
  await tx.notification.createMany({
    data: [...recipientIds].map((recipientId) => ({
      id: randomUUID(), recipientId, childId: input.childId,
      type: input.type, title: input.title, body: input.body,
    })),
  });
}

export async function notifyUser(tx: Transaction, input: {
  recipientId: string;
  childId?: string | null;
  type: string;
  title: string;
  body: string;
}) {
  await tx.notification.create({
    data: {
      id: randomUUID(), recipientId: input.recipientId, childId: input.childId ?? null,
      type: input.type, title: input.title, body: input.body,
    },
  });
}
