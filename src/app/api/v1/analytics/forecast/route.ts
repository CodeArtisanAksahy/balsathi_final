import { errorResponse, jsonResponse } from "@/lib/api";
import { getActorFromSession, requirePermission } from "@/lib/authorization";
import { prisma } from "@/lib/prisma";
import { createAggregateObservationForecast, requirePostgresMode } from "@/lib/postgres-service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    requirePostgresMode(); const session = await getActorFromSession(); requirePermission(session.role, "admin:read");
    const rows = await prisma.mLPrediction.findMany({ where: { predictionType: "aggregate_monthly_observation_volume", ...(session.role === "DISTRICT_ADMIN" ? {} : { scopeCenterIds: { hasSome: session.centerIds } }) }, orderBy: { generatedAt: "desc" }, take: 30 });
    return jsonResponse(rows);
  } catch (error) { return errorResponse(error); }
}

export async function POST() {
  try { requirePostgresMode(); const session = await getActorFromSession(); requirePermission(session.role, "admin:read"); return jsonResponse(await createAggregateObservationForecast(session), 201); }
  catch (error) { return errorResponse(error); }
}
