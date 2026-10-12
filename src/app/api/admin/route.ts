import { errorResponse, jsonResponse } from "@/lib/api";
import { getActorFromSession, requirePermission } from "@/lib/authorization";
import { getAuditLogs, getCenters, getSystemStats, getWorkers } from "@/lib/data";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request): Promise<Response> {
  try {
    const session = await getActorFromSession();
    requirePermission(session.role, "admin:read");
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
