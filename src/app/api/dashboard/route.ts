import { errorResponse, jsonResponse } from "@/lib/api";
import { getActorFromSession } from "@/lib/authorization";
import { getDashboardData } from "@/lib/data";
import { config } from "@/lib/config";
import { databaseDashboard } from "@/lib/database-service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(): Promise<Response> {
  try {
    const session = await getActorFromSession();
    if (config.dataMode === "sqlite") return jsonResponse(await databaseDashboard(session));
    const data = getDashboardData(session);
    return jsonResponse(data);
  } catch (error) {
    return errorResponse(error);
  }
}
