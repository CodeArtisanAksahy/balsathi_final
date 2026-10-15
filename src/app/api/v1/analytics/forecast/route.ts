import { errorResponse, jsonResponse } from "@/lib/api";
import { getActorFromSession, requirePermission } from "@/lib/authorization";
import { createAggregateObservationForecast, getAggregateForecastDashboard, requirePostgresMode } from "@/lib/postgres-service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    requirePostgresMode(); const session = await getActorFromSession(); requirePermission(session.role, "admin:read");
    return jsonResponse(await getAggregateForecastDashboard(session));
  } catch (error) { return errorResponse(error); }
}

export async function POST() {
  try { requirePostgresMode(); const session = await getActorFromSession(); requirePermission(session.role, "admin:read"); return jsonResponse(await createAggregateObservationForecast(session), 201); }
  catch (error) { return errorResponse(error); }
}
