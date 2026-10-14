import { errorResponse, jsonResponse, readJson } from "@/lib/api";
import { getActorFromSession, requirePermission, requireDatabaseChildAccess } from "@/lib/authorization";
import { addMilestoneAssessment, getChildMilestoneAssessments, getMilestoneDefinitions } from "@/lib/data";
import { z } from "zod";
import { config } from "@/lib/config";
import { createDatabaseMilestoneAssessment } from "@/lib/postgres-service";
import { prisma } from "@/lib/prisma";
import { assessmentStatuses } from "@/lib/domain";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const milestoneAssessmentSchema = z.object({
  childId: z.string().min(1),
  milestoneId: z.string().min(1),
  status: z.enum(assessmentStatuses),
  notes: z.string().max(600).default(""),
});

export async function GET(request: Request): Promise<Response> {
  try {
    const session = await getActorFromSession();
    requirePermission(session.role, "milestones:read");
    const childId = new URL(request.url).searchParams.get("childId");
    if (config.dataMode === "postgres") {
      const definitions = await prisma.milestoneDefinition.findMany({ where: { active: true }, orderBy: [{ minAgeMonths: "asc" }, { slug: "asc" }] });
      const assessments = childId ? await prisma.milestoneAssessment.findMany({ where: { childId }, include: { milestone: true }, orderBy: { assessedAt: "desc" } }) : [];
      if (childId) await requireDatabaseChildAccess(session, childId);
      return jsonResponse({ definitions, assessments });
    }
    if (childId) {
      const assessments = getChildMilestoneAssessments(session, childId);
      return jsonResponse({ definitions: getMilestoneDefinitions(), assessments });
    }
    return jsonResponse({ definitions: getMilestoneDefinitions() });
  } catch (error) {
    return errorResponse(error);
  }
}

export async function POST(request: Request): Promise<Response> {
  try {
    const session = await getActorFromSession();
    requirePermission(session.role, "milestones:create");
    const input = milestoneAssessmentSchema.parse(await readJson(request));
    if (config.dataMode === "postgres") return jsonResponse(await createDatabaseMilestoneAssessment(session, input.childId, input), 201);
    const assessment = addMilestoneAssessment(session, input);
    return jsonResponse(assessment, 201);
  } catch (error) {
    return errorResponse(error);
  }
}
