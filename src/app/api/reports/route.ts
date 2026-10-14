import { errorResponse, jsonResponse, readJson } from "@/lib/api";
import { getActorFromSession, requirePermission } from "@/lib/authorization";
import { generateReport, getChildReports } from "@/lib/data";
import { z } from "zod";
import { config } from "@/lib/config";
import { prisma } from "@/lib/prisma";
import { requireDatabaseChildAccess } from "@/lib/authorization";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const reportGenerateSchema = z.object({
  childId: z.string().min(1),
});

export async function GET(request: Request): Promise<Response> {
  try {
    const session = await getActorFromSession();
    requirePermission(session.role, "reports:read");
    const childId = new URL(request.url).searchParams.get("childId");
    if (config.dataMode === "postgres") { if (!childId) return jsonResponse([]); await requireDatabaseChildAccess(session, childId); return jsonResponse(await prisma.reportRecord.findMany({ where: { childId }, orderBy: { createdAt: "desc" } })); }
    if (!childId) return jsonResponse([]);
    const reports = getChildReports(session, childId);
    return jsonResponse(reports);
  } catch (error) {
    return errorResponse(error);
  }
}

export async function POST(request: Request): Promise<Response> {
  try {
    const session = await getActorFromSession();
    requirePermission(session.role, "reports:create");
    const input = reportGenerateSchema.parse(await readJson(request));
    if (config.dataMode === "postgres") {
      const child = await requireDatabaseChildAccess(session, input.childId);
      const [observations, risks, recommendations, achievedMilestones, growthCount] = await prisma.$transaction([
        prisma.observation.count({ where: { childId: child.id } }), prisma.riskAssessment.count({ where: { childId: child.id, reviewRequired: true } }), prisma.recommendation.count({ where: { childId: child.id, status: "ACTIVE" } }), prisma.milestoneAssessment.count({ where: { childId: child.id, status: "MET" } }), prisma.growthMeasurement.count({ where: { childId: child.id } }),
      ]);
      const report = await prisma.$transaction(async (tx) => { const row = await tx.reportRecord.create({ data: { id: crypto.randomUUID(), childId: child.id, centerId: child.centerId, generatedById: session.id, title: `${child.fullName} - Progress Report`, periodLabel: "Current records", summary: `Records through ${new Date().toISOString()}: ${observations} observations, ${growthCount} growth measurements, ${achievedMilestones} milestones marked met, ${risks} open follow-up flags, and ${recommendations} active recommendations. Milestone counts are activity summaries, not clinical conclusions.` } }); await tx.auditLog.create({ data: { actorId: session.id, action: "report.generated", entityType: "Report", entityId: row.id, scopeCenterId: child.centerId, metadata: { childId: child.id } } }); return row; });
      return jsonResponse(report, 201);
    }
    const report = generateReport(session, input.childId);
    return jsonResponse(report, 201);
  } catch (error) {
    return errorResponse(error);
  }
}
