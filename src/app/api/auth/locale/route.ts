import { errorResponse, jsonResponse, readJson } from "@/lib/api";
import { getSession, persistSession } from "@/lib/auth";
import { getDemoStore } from "@/lib/demo-store";
import { SignJWT } from "jose";
import { config } from "@/lib/config";
import { prisma } from "@/lib/prisma";
import { appLocales } from "@/lib/domain";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request): Promise<Response> {
  try {
    const session = await getSession();
    if (!session) throw new Error("UNAUTHORIZED");
    const { locale } = (await readJson(request)) as { locale: string };
    if (!appLocales.includes(locale as (typeof appLocales)[number])) throw new Error("INVALID_LOCALE");
    if (config.dataMode === "postgres") await prisma.user.update({ where: { id: session.id }, data: { preferredLanguage: locale as (typeof appLocales)[number] } });
    else {
      const data = getDemoStore();
      const user = data.users.find((u) => u.id === session.id);
      if (user) user.preferredLanguage = locale as (typeof appLocales)[number];
    }
    const encoder = new TextEncoder();
    const token = await new SignJWT({
      name: session.name,
      email: session.email,
      role: session.role,
      preferredLanguage: locale,
      centerIds: session.centerIds,
    })
      .setProtectedHeader({ alg: "HS256" })
      .setSubject(session.id)
      .setIssuedAt()
      .setExpirationTime("12h")
      .sign(encoder.encode(process.env.AUTH_SECRET ?? "balsathi-dev-only-secret-change-me"));
    await persistSession(token);
    return jsonResponse({ success: true, locale });
  } catch (error) {
    return errorResponse(error);
  }
}
