import { errorResponse, jsonResponse, readJson } from "@/lib/api";
import { ApiError } from "@/lib/authorization";
import { createSession, getDemoUserByEmail, persistSession, verifyPassword } from "@/lib/auth";
import { loginSchema } from "@/lib/validation";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request): Promise<Response> {
  try {
    const input = loginSchema.parse(await readJson(request));
    const user = getDemoUserByEmail(input.email);
    if (!user || !user.active) {
      throw new ApiError(401, "INVALID_CREDENTIALS", "Invalid email or password.");
    }
    const valid = await verifyPassword(input.password, user.passwordHash);
    if (!valid) {
      throw new ApiError(401, "INVALID_CREDENTIALS", "Invalid email or password.");
    }
    const token = await createSession(user);
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
