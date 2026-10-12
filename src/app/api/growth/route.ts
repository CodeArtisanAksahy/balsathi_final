import { errorResponse, jsonResponse, readJson } from "@/lib/api";
import { getActorFromSession, requirePermission } from "@/lib/authorization";
import { addGrowthMeasurement, getGrowthSeries } from "@/lib/data";
import { z } from "zod";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const growthSchema = z.object({
  childId: z.string().min(1),
  measuredAt: z.string(),
  heightCm: z.number().positive(),
  weightKg: z.number().positive(),
  headCircumferenceCm: z.number().positive().nullable().optional(),
  notes: z.string().max(500).nullable().optional(),
});

export async function GET(request: Request): Promise<Response> {
  try {
    const session = await getActorFromSession();
    requirePermission(session.role, "children:read");
    const childId = new URL(request.url).searchParams.get("childId");
    if (!childId) return jsonResponse([]);
    const growth = getGrowthSeries(session, childId);
    return jsonResponse(growth);
  } catch (error) {
    return errorResponse(error);
  }
}

export async function POST(request: Request): Promise<Response> {
  try {
    const session = await getActorFromSession();
    requirePermission(session.role, "observations:create");
    const input = growthSchema.parse(await readJson(request));
    const measurement = addGrowthMeasurement(session, {
      ...input,
      headCircumferenceCm: input.headCircumferenceCm ?? null,
      notes: input.notes ?? null,
    });
    return jsonResponse(measurement, 201);
  } catch (error) {
    return errorResponse(error);
  }
}
