import { errorResponse, jsonResponse } from "@/lib/api";
import { getActorFromSession } from "@/lib/authorization";
import { getAnalyticsSeries } from "@/lib/data";
import { config } from "@/lib/config";
import { databaseAnalytics } from "@/lib/database-service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(): Promise<Response> {
  try {
    const session = await getActorFromSession();
    const data = config.dataMode === "sqlite" ? await databaseAnalytics(session) : getAnalyticsSeries(session);
    return jsonResponse(data);
  } catch (error) {
    return errorResponse(error);
  }
}
