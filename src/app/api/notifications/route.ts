import { z } from "zod";
import { ApiError, getActorFromSession } from "@/lib/authorization";
import { errorResponse, jsonResponse, readJson } from "@/lib/api";
import { requireDatabaseMode } from "@/lib/database-service";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    requireDatabaseMode();
    const session = await getActorFromSession();
    const [items, unreadCount] = await prisma.$transaction([
      prisma.notification.findMany({ where: { recipientId: session.id }, include: { child: { select: { fullName: true } } }, orderBy: { createdAt: "desc" }, take: 100 }),
      prisma.notification.count({ where: { recipientId: session.id, readAt: null } }),
    ]);
    return jsonResponse({ items, unreadCount });
  } catch (error) {
    return errorResponse(error);
  }
}

const updateSchema = z.union([
  z.object({ id: z.string().min(1) }).strict(),
  z.object({ markAllRead: z.literal(true) }).strict(),
]);

export async function PATCH(request: Request) {
  try {
    requireDatabaseMode();
    const session = await getActorFromSession();
    const input = updateSchema.parse(await readJson(request));
    if ("markAllRead" in input) {
      await prisma.notification.updateMany({ where: { recipientId: session.id, readAt: null }, data: { readAt: new Date() } });
      return jsonResponse({ updated: true });
    }
    const result = await prisma.notification.updateMany({ where: { id: input.id, recipientId: session.id, readAt: null }, data: { readAt: new Date() } });
    if (result.count === 0) {
      const existing = await prisma.notification.findFirst({ where: { id: input.id, recipientId: session.id }, select: { id: true } });
      if (!existing) throw new ApiError(404, "NOTIFICATION_NOT_FOUND", "Notification not found.");
    }
    return jsonResponse({ updated: true });
  } catch (error) {
    return errorResponse(error);
  }
}
