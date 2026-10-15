import { errorResponse, jsonResponse, readJson } from "@/lib/api";
import { getActorFromSession, requirePermission } from "@/lib/authorization";
import { addGrowthMeasurement, getGrowthSeries } from "@/lib/data";
import { z } from "zod";
import { config } from "@/lib/config";
import { requireDatabaseChildAccess } from "@/lib/authorization";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const growthSchema = z.object({
  childId: z.string().min(1),
  measuredAt: z.string(),
  heightCm: z.number().positive(),
  weightKg: z.number().positive(),
  headCircumferenceCm: z.number().positive().nullable().optional(),
  notes: z.string().max(500).nullable().optional(),
});

export async function GET(request: Request): Promise<Response> {
  try {
    const session = await getActorFromSession();
    requirePermission(session.role, "children:read");
    const childId = new URL(request.url).searchParams.get("childId");
    if (!childId) return jsonResponse([]);
    if (config.dataMode === "sqlite") { await requireDatabaseChildAccess(session, childId); return jsonResponse(await prisma.growthMeasurement.findMany({ where: { childId }, orderBy: { measuredAt: "asc" } })); }
    const growth = getGrowthSeries(session, childId);
    return jsonResponse(growth);
  } catch (error) {
    return errorResponse(error);
  }
}

export async function POST(request: Request): Promise<Response> {
  try {
    const session = await getActorFromSession();
    requirePermission(session.role, "observations:create");
    const input = growthSchema.parse(await readJson(request));
    if (config.dataMode === "sqlite") {
      const child = await requireDatabaseChildAccess(session, input.childId);
      if (new Date(input.measuredAt).getTime() > Date.now() + 300_000) throw new Error("Measurement date cannot be in the future.");
      const saved = await prisma.$transaction(async (tx) => { const row = await tx.growthMeasurement.create({ data: { childId: child.id, measuredAt: new Date(input.measuredAt), heightCm: input.heightCm, weightKg: input.weightKg, headCircumferenceCm: input.headCircumferenceCm ?? null, notes: input.notes ?? null, measurementSource: "WORKER_ENTRY", measuredById: session.id, verificationStatus: "UNREVIEWED" } }); await tx.auditLog.create({ data: { actorId: session.id, action: "growth.recorded", entityType: "GrowthMeasurement", entityId: row.id, scopeCenterId: child.centerId, metadata: { verificationStatus: row.verificationStatus } } }); return row; });
      return jsonResponse(saved, 201);
    }
    const measurement = addGrowthMeasurement(session, {
      ...input,
      headCircumferenceCm: input.headCircumferenceCm ?? null,
      notes: input.notes ?? null,
    });
    return jsonResponse(measurement, 201);
  } catch (error) {
    return errorResponse(error);
  }
}
