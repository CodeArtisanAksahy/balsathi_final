import { z } from "zod";
import { errorResponse, jsonResponse } from "@/lib/api";
import { ApiError, getActorFromSession, requirePermission } from "@/lib/authorization";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const statusSchema = z.object({
  service: z.string(),
  ready: z.boolean(),
  experimental_only: z.boolean(),
  tasks: z.record(z.string(), z.object({
    ready: z.boolean(),
    artifact_loaded: z.boolean(),
    state: z.string(),
    model_version: z.string().nullable(),
    target: z.string(),
    features: z.array(z.string()),
    training_source: z.string(),
    limitations: z.string(),
    reason: z.string().nullable(),
  })),
});

export async function GET() {
  try {
    const session = await getActorFromSession();
    requirePermission(session.role, "admin:read");
    if (session.role !== "DISTRICT_ADMIN" && session.role !== "CENTER_ADMIN") {
      throw new ApiError(403, "FORBIDDEN", "Model readiness is available to administrators only.");
    }

    const serviceUrl = process.env.ML_SERVICE_URL?.trim();
    if (!serviceUrl) {
      return jsonResponse({
        service: "unavailable",
        ready: false,
        experimental_only: true,
        tasks: {},
        message: "ML_SERVICE_URL is not configured. No tabular model inference is available.",
      });
    }

    let response: Response;
    try {
      response = await fetch(`${serviceUrl.replace(/\/$/, "")}/models/status`, {
        cache: "no-store",
        signal: AbortSignal.timeout(3_000),
      });
    } catch {
      return jsonResponse({ service: "unavailable", ready: false, experimental_only: true, tasks: {}, message: "The private model service could not be reached. No predictions are available." });
    }
    if (!response.ok) throw new ApiError(503, "ML_STATUS_UNAVAILABLE", "The private model service could not report model readiness.");
    const parsed = statusSchema.safeParse(await response.json());
    if (!parsed.success) throw new ApiError(503, "ML_STATUS_INVALID", "The model service returned an invalid readiness response.");
    return jsonResponse(parsed.data);
  } catch (error) {
    return errorResponse(error);
  }
}
