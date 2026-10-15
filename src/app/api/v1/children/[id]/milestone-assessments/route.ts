import { errorResponse, jsonResponse, readJson } from "@/lib/api";
import { ApiError, getActorFromSession, requirePermission, requireDatabaseChildAccess } from "@/lib/authorization";
import { prisma } from "@/lib/prisma";
import { requireDatabaseMode } from "@/lib/database-service";
import { z } from "zod";
import { assessmentStatuses } from "@/lib/domain";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
const schema = z.object({ milestoneId: z.string().min(1), status: z.enum(assessmentStatuses), notes: z.string().max(600).default(""), assessedAt: z.iso.datetime().optional() });

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  try { requireDatabaseMode(); const session = await getActorFromSession(); requirePermission(session.role, "milestones:read"); const { id } = await params; await requireDatabaseChildAccess(session, id); const rows = await prisma.milestoneAssessment.findMany({ where: { childId: id }, include: { milestone: true }, orderBy: { assessedAt: "desc" } }); return jsonResponse(rows); }
  catch (error) { return errorResponse(error); }
}

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    requireDatabaseMode();
    const session = await getActorFromSession();
    requirePermission(session.role, "milestones:create");
    const { id } = await params;
    const child = await requireDatabaseChildAccess(session, id);
    const input = schema.parse(await readJson(request));
    const assessedAt = input.assessedAt ? new Date(input.assessedAt) : new Date();
    if (assessedAt > new Date(Date.now() + 300_000) || assessedAt < child.dateOfBirth) {
      throw new ApiError(422, "INVALID_ASSESSED_AT", "Assessment date must be between the child's date of birth and the present.");
    }
    const saved = await prisma.$transaction(async (tx) => {
      const record = await tx.milestoneAssessment.create({ data: { id: crypto.randomUUID(), childId: id, milestoneId: input.milestoneId, assessedById: session.id, assessedAt, status: input.status, notes: input.notes } });
      await tx.auditLog.create({ data: { actorId: session.id, action: "milestone.assessed", entityType: "MilestoneAssessment", entityId: record.id, scopeCenterId: child.centerId, metadata: { status: input.status } } });
      return record;
    });
    return jsonResponse(saved, 201);
  }
  catch (error) { return errorResponse(error); }
}
