import { errorResponse, jsonResponse } from "@/lib/api";
import { getActorFromSession, requirePermission } from "@/lib/authorization";
import { createAggregateObservationForecast, getAggregateForecastDashboard, requireDatabaseMode } from "@/lib/database-service";
import { assertSameOrigin } from "@/lib/request-security";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const session = await getActorFromSession(); requirePermission(session.role, "admin:read"); requireDatabaseMode();
    return jsonResponse(await getAggregateForecastDashboard(session));
  } catch (error) { return errorResponse(error); }
}

export async function POST(request: Request) {
  try { const session = await getActorFromSession(); requirePermission(session.role, "admin:read"); assertSameOrigin(request); requireDatabaseMode(); return jsonResponse(await createAggregateObservationForecast(session), 201); }
  catch (error) { return errorResponse(error); }
}
