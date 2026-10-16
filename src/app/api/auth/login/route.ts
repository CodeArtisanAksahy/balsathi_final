import { errorResponse, jsonResponse, readJson } from "@/lib/api";
import { ApiError } from "@/lib/authorization";
import { createSession, getDemoUserByEmail, persistSession, verifyPassword } from "@/lib/auth";
import { loginSchema } from "@/lib/validation";
import { config } from "@/lib/config";
import { prisma } from "@/lib/prisma";
import { assertSameOrigin, enforceConfiguredRateLimit } from "@/lib/request-security";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request): Promise<Response> {
  try {
    assertSameOrigin(request);
    await enforceConfiguredRateLimit(request, "login", config.rateLimit.authMaxPerMinute);
    const input = loginSchema.parse(await readJson(request));
    const user = config.dataMode === "sqlite"
      ? await prisma.user.findUnique({ where: { email: input.email.toLowerCase() } })
      : getDemoUserByEmail(input.email);
    if (!user || !user.active) {
      throw new ApiError(401, "INVALID_CREDENTIALS", "Invalid email or password.");
    }
    const valid = await verifyPassword(input.password, user.passwordHash);
    if (!valid) {
      throw new ApiError(401, "INVALID_CREDENTIALS", "Invalid email or password.");
    }
    const sessionUser = { ...user, createdAt: typeof user.createdAt === "string" ? user.createdAt : user.createdAt.toISOString(), updatedAt: typeof user.updatedAt === "string" ? user.updatedAt : user.updatedAt.toISOString() };
    const token = await createSession(sessionUser as import("@/lib/domain").User);
    await persistSession(token);
    return jsonResponse({
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      preferredLanguage: user.preferredLanguage,
      centerIds: user.centerIds,
    });
  } catch (error) {
    return errorResponse(error);
  }
}
