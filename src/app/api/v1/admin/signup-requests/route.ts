import { randomUUID } from "node:crypto";
import { z } from "zod";
import { errorResponse, jsonResponse, readJson } from "@/lib/api";
import { getActorFromSession, requirePermission } from "@/lib/authorization";
import { ApiError } from "@/lib/authorization";
import { requireDatabaseMode } from "@/lib/database-service";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

async function visibleRequests(actor: Awaited<ReturnType<typeof getActorFromSession>>) {
  const requests = await prisma.signupRequest.findMany({ where: { status: "PENDING" }, orderBy: { createdAt: "desc" }, take: 100 });
  if (actor.role === "DISTRICT_ADMIN") return requests;
  if (actor.role !== "CENTER_ADMIN") throw new ApiError(403, "FORBIDDEN", "Your role cannot review signup requests.");

  const centers = await prisma.center.findMany({ where: { id: { in: actor.centerIds }, active: true }, select: { name: true, code: true } });
  const centerKeys = new Set(centers.flatMap((center) => [center.name.trim().toLocaleLowerCase(), center.code.trim().toLocaleLowerCase()]));
  const children = await prisma.child.findMany({ where: { centerId: { in: actor.centerIds }, active: true }, select: { id: true, fullName: true, internalId: true } });
  const childKeys = new Set(children.flatMap((child) => [child.id, child.internalId, child.fullName].map((value) => value.trim().toLocaleLowerCase())));
  return requests.filter((request) => request.role === "WORKER"
    ? !!request.centerName && centerKeys.has(request.centerName.trim().toLocaleLowerCase())
    : !!request.childReference && childKeys.has(request.childReference.trim().toLocaleLowerCase()));
}

export async function GET(): Promise<Response> {
  try {
    requireDatabaseMode();
    const actor = await getActorFromSession();
    requirePermission(actor.role, "admin:read");
    const requests = await visibleRequests(actor);
    return jsonResponse(requests.map((request) => ({ ...request, createdAt: request.createdAt.toISOString() })));
  } catch (error) {
    return errorResponse(error);
  }
}

export async function PATCH(request: Request): Promise<Response> {
  try {
    requireDatabaseMode();
    const actor = await getActorFromSession();
    requirePermission(actor.role, "accounts:manage");
    const { id } = z.object({ id: z.string().min(1) }).parse(await readJson(request));
    const visible = await visibleRequests(actor);
    if (!visible.some((item) => item.id === id)) throw new ApiError(404, "REQUEST_NOT_FOUND", "Signup request not found.");
    const saved = await prisma.$transaction(async (tx) => {
      const row = await tx.signupRequest.update({ where: { id }, data: { status: "REVIEWED" } });
      await tx.auditLog.create({ data: { id: randomUUID(), actorId: actor.id, action: "signup_request.reviewed", entityType: "SignupRequest", entityId: id, metadata: { role: row.role } } });
      return row;
    });
    return jsonResponse({ id: saved.id, status: saved.status });
  } catch (error) {
    return errorResponse(error);
  }
}
