import { errorResponse, jsonResponse, readJson } from "@/lib/api";
import { getActorFromSession, requirePermission, requireDatabaseChildAccess } from "@/lib/authorization";
import { prisma } from "@/lib/prisma";
import { requirePostgresMode } from "@/lib/postgres-service";
import { z } from "zod";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
const schema = z.object({ measuredAt: z.iso.datetime(), heightCm: z.number().min(30).max(220), weightKg: z.number().min(1).max(180), headCircumferenceCm: z.number().min(15).max(80).nullable().optional(), notes: z.string().max(500).nullable().optional(), measurementSource: z.string().max(80).default("WORKER_ENTRY") });

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  try { requirePostgresMode(); const session = await getActorFromSession(); requirePermission(session.role, "children:read"); const { id } = await params; await requireDatabaseChildAccess(session, id); const rows = await prisma.growthMeasurement.findMany({ where: { childId: id }, orderBy: { measuredAt: "asc" } }); return jsonResponse(rows); }
  catch (error) { return errorResponse(error); }
}

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try { requirePostgresMode(); const session = await getActorFromSession(); requirePermission(session.role, "observations:create"); const { id } = await params; const child = await requireDatabaseChildAccess(session, id); const input = schema.parse(await readJson(request)); if (new Date(input.measuredAt).getTime() > Date.now() + 5 * 60_000) throw new Error("Measurement date cannot be in the future."); const saved = await prisma.$transaction(async (tx) => { const record = await tx.growthMeasurement.create({ data: { id: crypto.randomUUID(), childId: id, measuredAt: new Date(input.measuredAt), heightCm: input.heightCm, weightKg: input.weightKg, headCircumferenceCm: input.headCircumferenceCm ?? null, notes: input.notes ?? null, measurementSource: input.measurementSource, measuredById: session.id, verificationStatus: "UNREVIEWED" } }); await tx.auditLog.create({ data: { actorId: session.id, action: "growth.recorded", entityType: "GrowthMeasurement", entityId: record.id, scopeCenterId: child.centerId, metadata: { verificationStatus: record.verificationStatus } } }); return record; }); return jsonResponse(saved, 201); }
  catch (error) { return errorResponse(error); }
}
