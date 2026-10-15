import { errorResponse, jsonResponse, readJson } from "@/lib/api";
import { getActorFromSession, requirePermission } from "@/lib/authorization";
import { requireDatabaseMode, getDatabaseChildProfile, childScopeWhere } from "@/lib/database-service";
import { prisma } from "@/lib/prisma";
import { z } from "zod";
import { calendarDateSchema } from "@/lib/validation";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const patchSchema = z.object({ fullName: z.string().trim().min(2).max(120).optional(), dateOfBirth: calendarDateSchema.optional(), gender: z.enum(["FEMALE", "MALE", "OTHER", "UNSPECIFIED"]).optional(), primaryLanguage: z.enum(["en", "hi", "mr"]).optional() }).strict();

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  try { requireDatabaseMode(); const session = await getActorFromSession(); requirePermission(session.role, "children:read"); const { id } = await params; return jsonResponse(await getDatabaseChildProfile(session, id)); }
  catch (error) { return errorResponse(error); }
}

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    requireDatabaseMode();
    const session = await getActorFromSession();
    requirePermission(session.role, "children:update");
    const { id } = await params;
    const child = await prisma.child.findFirst({ where: { id, ...childScopeWhere(session) } });
    if (!child) return jsonResponse({ error: { code: "CHILD_NOT_FOUND", message: "Child record not found." } }, 404);
    const version = request.headers.get("if-match");
    if (version && version !== child.updatedAt.toISOString()) return jsonResponse({ error: { code: "VERSION_CONFLICT", message: "Child record changed; reload before saving." } }, 412);
    const input = patchSchema.parse(await readJson(request));
    const updated = await prisma.$transaction(async (tx) => {
      const result = await tx.child.update({ where: { id }, data: { ...input, ...(input.dateOfBirth ? { dateOfBirth: new Date(`${input.dateOfBirth}T00:00:00.000Z`) } : {}) } });
      await tx.auditLog.create({ data: { actorId: session.id, action: "child.updated", entityType: "Child", entityId: id, scopeCenterId: child.centerId, metadata: { fields: Object.keys(input) } } });
      return result;
    });
    return jsonResponse(updated, 200, { ETag: updated.updatedAt.toISOString() });
  } catch (error) { return errorResponse(error); }
}

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    requireDatabaseMode(); const session = await getActorFromSession(); requirePermission(session.role, "children:update"); const { id } = await params;
    const child = await prisma.child.findFirst({ where: { id, ...childScopeWhere(session) } });
    if (!child) return jsonResponse({ error: { code: "CHILD_NOT_FOUND", message: "Child record not found." } }, 404);
    const archived = await prisma.$transaction(async (tx) => {
      const result = await tx.child.update({ where: { id }, data: { active: false } });
      await tx.auditLog.create({ data: { actorId: session.id, action: "child.archived", entityType: "Child", entityId: id, scopeCenterId: child.centerId, metadata: {} } });
      return result;
    });
    return jsonResponse(archived);
  } catch (error) { return errorResponse(error); }
}
