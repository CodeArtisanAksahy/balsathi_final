import { errorResponse, jsonResponse, readJson } from "@/lib/api";
import { getActorFromSession, requirePermission, requireDatabaseChildAccess } from "@/lib/authorization";
import { createDatabaseObservation, requireDatabaseMode, updateDatabaseObservation } from "@/lib/database-service";
import { prisma } from "@/lib/prisma";
import { observationCreateSchema } from "@/lib/validation";
import { z } from "zod";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  try { requireDatabaseMode(); const session = await getActorFromSession(); requirePermission(session.role, "observations:read"); const { id } = await params; await requireDatabaseChildAccess(session, id); const rows = await prisma.observation.findMany({ where: { childId: id }, include: { assessments: true }, orderBy: { observedAt: "desc" } }); return jsonResponse(rows); }
  catch (error) { return errorResponse(error); }
}

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try { requireDatabaseMode(); const session = await getActorFromSession(); requirePermission(session.role, "observations:create"); const { id } = await params; const body = { ...(await readJson(request) as Record<string, unknown>), childId: id }; const input = observationCreateSchema.parse(body); const saved = await createDatabaseObservation(session, input, request.headers.get("idempotency-key")); return jsonResponse(saved, 201); }
  catch (error) { return errorResponse(error); }
}

const editSchema = z.object({ observationId: z.string().min(1), observationText: z.string().trim().min(5).max(4000).optional(), activityContext: z.string().trim().min(2).max(200).optional(), workerNotes: z.string().trim().max(2000).optional(), reviewStatus: z.enum(["DRAFT", "REVIEW_PENDING", "VERIFIED"]).optional() }).strict();

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try { requireDatabaseMode(); const session = await getActorFromSession(); requirePermission(session.role, "observations:update"); const { id } = await params; await requireDatabaseChildAccess(session, id); const input = editSchema.parse(await readJson(request)); const saved = await updateDatabaseObservation(session, input.observationId, input, request.headers.get("if-match") ?? undefined, id); return jsonResponse(saved, 200, { ETag: saved.updatedAt.toISOString() }); }
  catch (error) { return errorResponse(error); }
}
