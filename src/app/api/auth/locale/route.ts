import { errorResponse, jsonResponse, readJson } from "@/lib/api";
import { getSession, persistSession } from "@/lib/auth";
import { getDemoStore } from "@/lib/demo-store";
import { SignJWT } from "jose";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request): Promise<Response> {
  try {
    const session = await getSession();
    if (!session) throw new Error("UNAUTHORIZED");
    const { locale } = (await readJson(request)) as { locale: string };
    const data = getDemoStore();
    const user = data.users.find((u) => u.id === session.id);
    if (user) {
      user.preferredLanguage = locale as "en" | "hi" | "mr";
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
