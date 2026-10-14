import { errorResponse, jsonResponse } from "@/lib/api";
import { getActorFromSession, requirePermission } from "@/lib/authorization";
import { getAuditLogs, getCenters, getSystemStats, getWorkers } from "@/lib/data";
import { config } from "@/lib/config";
import { ApiError } from "@/lib/authorization";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request): Promise<Response> {
  try {
    const session = await getActorFromSession();
    requirePermission(session.role, "admin:read");
    if (config.dataMode === "postgres") throw new ApiError(501, "ADMIN_VIEW_NOT_CONFIGURED", "This legacy admin view is not yet backed by database queries.");
    const { searchParams } = new URL(request.url);
    const view = searchParams.get("view");
    if (view === "centers") return jsonResponse(getCenters(session));
    if (view === "workers") return jsonResponse(getWorkers(session));
    if (view === "audit") return jsonResponse(getAuditLogs(session));
    return jsonResponse(getSystemStats(session));
  } catch (error) {
    return errorResponse(error);
  }
}
