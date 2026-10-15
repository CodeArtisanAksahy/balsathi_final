import { errorResponse, jsonResponse } from "@/lib/api";
import { getActorFromSession, requirePermission } from "@/lib/authorization";
import { getChildProfile } from "@/lib/data";
import { config } from "@/lib/config";
import { childScopeWhere, getDatabaseChildProfile, updateDatabaseChild } from "@/lib/postgres-service";
import { prisma } from "@/lib/prisma";
import { readJson } from "@/lib/api";
import { z } from "zod";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
): Promise<Response> {
  try {
    const session = await getActorFromSession();
    requirePermission(session.role, "children:read");
    const { id } = await params;
    if (config.dataMode === "postgres") return jsonResponse(await getDatabaseChildProfile(session, id));
    const profile = getChildProfile(session, id);
    return jsonResponse(profile);
  } catch (error) {
    return errorResponse(error);
  }
}

const updateSchema = z.object({ fullName: z.string().trim().min(2).max(120).optional(), dateOfBirth: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(), gender: z.enum(["FEMALE", "MALE", "OTHER", "UNSPECIFIED"]).optional(), primaryLanguage: z.enum(["en", "hi", "mr"]).optional() }).strict();

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }): Promise<Response> {
  try {
    if (config.dataMode !== "postgres") return jsonResponse({ error: { code: "NOT_SUPPORTED", message: "Use the demo application workflow." } }, 409);
    const session = await getActorFromSession(); requirePermission(session.role, "children:update"); const { id } = await params;
    const input = updateSchema.parse(await readJson(request));
    const saved = await updateDatabaseChild(session, id, input, request.headers.get("if-match") ?? undefined);
    return jsonResponse(saved, 200, { ETag: saved.updatedAt.toISOString() });
  } catch (error) { return errorResponse(error); }
}

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }): Promise<Response> {
  try {
    if (config.dataMode !== "postgres") return jsonResponse({ error: { code: "NOT_SUPPORTED", message: "Use the demo application workflow." } }, 409);
    const session = await getActorFromSession(); requirePermission(session.role, "children:update"); const { id } = await params;
    const current = await prisma.child.findFirst({ where: { id, ...childScopeWhere(session) } }); if (!current) return jsonResponse({ error: { code: "CHILD_NOT_FOUND", message: "Child record not found." } }, 404);
    const saved = await prisma.$transaction(async (tx) => { const row = await tx.child.update({ where: { id }, data: { active: false } }); await tx.auditLog.create({ data: { actorId: session.id, action: "child.archived", entityType: "Child", entityId: id, scopeCenterId: current.centerId, metadata: {} } }); return row; });
    return jsonResponse(saved);
  } catch (error) { return errorResponse(error); }
}
