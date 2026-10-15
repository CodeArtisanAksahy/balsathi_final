import { errorResponse, jsonResponse, readJson } from "@/lib/api";
import { ApiError } from "@/lib/authorization";
import { createSession, getSession, persistSession } from "@/lib/auth";
import { getDemoStore } from "@/lib/demo-store";
import { config } from "@/lib/config";
import { prisma } from "@/lib/prisma";
import { appLocales } from "@/lib/domain";
import { assertSameOrigin } from "@/lib/request-security";
import type { SessionUser } from "@/lib/domain";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request): Promise<Response> {
  try {
    assertSameOrigin(request);
    const session = await getSession();
    if (!session) throw new ApiError(401, "UNAUTHORIZED", "Authentication required.");
    const { locale } = (await readJson(request)) as { locale: string };
    if (!appLocales.includes(locale as (typeof appLocales)[number])) throw new ApiError(400, "INVALID_LOCALE", "Unsupported locale.");
    let updatedUser: Awaited<ReturnType<typeof prisma.user.update>> | null = null;
    if (config.dataMode === "sqlite") {
      updatedUser = await prisma.user.update({ where: { id: session.id }, data: { preferredLanguage: locale as (typeof appLocales)[number] } });
    } else {
      const data = getDemoStore();
      const user = data.users.find((u) => u.id === session.id);
      if (user) user.preferredLanguage = locale as (typeof appLocales)[number];
    }
    const token = await createSession({
      ...session,
      ...(updatedUser ? { name: updatedUser.name, email: updatedUser.email, role: updatedUser.role as SessionUser["role"], centerIds: Array.isArray(updatedUser.centerIds) ? updatedUser.centerIds.map(String) : [] } : {}),
      preferredLanguage: locale as (typeof appLocales)[number],
      phone: "",
      active: true,
      passwordHash: "",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });
    await persistSession(token);
    return jsonResponse({ success: true, locale });
  } catch (error) {
    return errorResponse(error);
  }
}
