import { errorResponse, jsonResponse, readJson } from "@/lib/api";
import { getActorFromSession, requirePermission } from "@/lib/authorization";
import { config } from "@/lib/config";
import { prisma } from "@/lib/prisma";
import { childScopeWhere } from "@/lib/postgres-service";
import { z } from "zod";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
const updateSchema = z.object({ id: z.string().min(1), status: z.enum(["OPEN", "IN_PROGRESS", "RESOLVED", "CANCELLED"]), resolutionNotes: z.string().max(2000).default("") });

export async function GET() {
  try {
    const session = await getActorFromSession(); requirePermission(session.role, "followups:read");
    if (config.dataMode !== "postgres") return jsonResponse({ error: { code: "POSTGRES_MODE_REQUIRED", message: "Follow-up API requires PostgreSQL mode." } }, 409);
    const records = await prisma.followUp.findMany({ where: { child: childScopeWhere(session) }, include: { child: { select: { id: true, fullName: true, internalId: true } }, observation: { select: { id: true, observedAt: true, domain: true } } }, orderBy: [{ dueDate: "asc" }, { createdAt: "desc" }] });
    return jsonResponse(records);
  } catch (error) { return errorResponse(error); }
}

export async function PATCH(request: Request) {
  try {
    const session = await getActorFromSession(); requirePermission(session.role, "followups:update");
    if (config.dataMode !== "postgres") return jsonResponse({ error: { code: "POSTGRES_MODE_REQUIRED", message: "Follow-up API requires PostgreSQL mode." } }, 409);
    const input = updateSchema.parse(await readJson(request));
    const current = await prisma.followUp.findFirst({ where: { id: input.id, child: childScopeWhere(session) }, include: { child: true } });
    if (!current) return jsonResponse({ error: { code: "FOLLOW_UP_NOT_FOUND", message: "Follow-up not found." } }, 404);
    const updated = await prisma.$transaction(async (tx) => { const row = await tx.followUp.update({ where: { id: input.id }, data: { status: input.status, resolutionNotes: input.resolutionNotes } }); await tx.auditLog.create({ data: { actorId: session.id, action: "followup.updated", entityType: "FollowUp", entityId: row.id, scopeCenterId: current.child.centerId, metadata: { status: input.status } } }); return row; });
    return jsonResponse(updated);
  } catch (error) { return errorResponse(error); }
}
