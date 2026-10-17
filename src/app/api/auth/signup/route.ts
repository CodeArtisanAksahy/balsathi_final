import { z } from "zod";
import { errorResponse, jsonResponse, readJson } from "@/lib/api";
import { ApiError } from "@/lib/authorization";
import { config } from "@/lib/config";
import { prisma } from "@/lib/prisma";
import { assertSameOrigin, enforceConfiguredRateLimit } from "@/lib/request-security";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const signupRequestSchema = z.object({
  name: z.string().trim().min(2).max(120),
  email: z.email().trim().toLowerCase(),
  phone: z.string().trim().min(7).max(20),
  role: z.enum(["PARENT", "WORKER"]),
  centerName: z.string().trim().min(2).max(120).optional(),
  childReference: z.string().trim().min(2).max(120).optional(),
  relationship: z.enum(["MOTHER", "FATHER", "GRANDPARENT", "SIBLING", "OTHER"]).optional(),
}).superRefine((value, context) => {
  if (value.role === "WORKER" && !value.centerName) context.addIssue({ code: "custom", path: ["centerName"], message: "Enter your Anganwadi center." });
  if (value.role === "PARENT" && !value.childReference) context.addIssue({ code: "custom", path: ["childReference"], message: "Enter your child's name or record ID." });
  if (value.role === "PARENT" && !value.relationship) context.addIssue({ code: "custom", path: ["relationship"], message: "Choose your relationship to the child." });
});

export async function POST(request: Request): Promise<Response> {
  try {
    assertSameOrigin(request);
    await enforceConfiguredRateLimit(request, "signup", config.rateLimit.authMaxPerMinute);
    if (config.dataMode !== "sqlite") throw new ApiError(503, "SIGNUP_UNAVAILABLE", "Account requests are unavailable in demo mode. Ask an administrator to create your account.");
    const input = signupRequestSchema.parse(await readJson(request));
    const email = input.email;
    const existingUser = await prisma.user.findUnique({ where: { email }, select: { id: true } });
    if (existingUser) return jsonResponse({ status: "pending", message: "If your details can be verified, an administrator will follow up with account setup instructions." }, 202);

    const existingRequest = await prisma.signupRequest.findFirst({ where: { email, role: input.role, status: "PENDING" }, select: { id: true } });
    if (existingRequest) return jsonResponse({ status: "pending", message: "If your details can be verified, an administrator will follow up with account setup instructions." }, 202);

    await prisma.signupRequest.create({ data: {
      name: input.name,
      email,
      phone: input.phone,
      role: input.role,
      centerName: input.role === "WORKER" ? input.centerName : null,
      childReference: input.role === "PARENT" ? input.childReference : null,
      relationship: input.role === "PARENT" ? input.relationship : null,
    } });

    return jsonResponse({ status: "pending", message: "If your details can be verified, an administrator will follow up with account setup instructions." }, 202);
  } catch (error) {
    return errorResponse(error);
  }
}
