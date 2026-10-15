import { errorResponse, jsonResponse } from "@/lib/api";
import { getActorFromSession } from "@/lib/authorization";
import { getDashboardData } from "@/lib/data";
import { config } from "@/lib/config";
import { databaseAnalytics } from "@/lib/database-service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(): Promise<Response> {
  try {
    const session = await getActorFromSession();
    if (config.dataMode === "sqlite") {
      const stats = await databaseAnalytics(session);
      return jsonResponse({ totalChildren: stats.childrenCount, followUpChildren: stats.openFollowUps, observationsThisWeek: 0, pendingSyncCount: 0, domainOverview: stats.domainAssessments.map(({ domain, assessed }) => ({ domain, count: assessed })), recentObservations: [], upcomingMilestoneReviews: [], attentionChildren: [], centerStats: [], totalCenters: 0, activeWorkers: 0, registeredParents: 0, auditLogs: [] });
    }
    const data = getDashboardData(session);
    return jsonResponse(data);
  } catch (error) {
    return errorResponse(error);
  }
}
