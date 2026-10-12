import { errorResponse, jsonResponse, readJson } from "@/lib/api";
import { getActorFromSession, requirePermission } from "@/lib/authorization";
import { addMilestoneAssessment, getChildMilestoneAssessments, getMilestoneDefinitions } from "@/lib/data";
import { z } from "zod";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const milestoneAssessmentSchema = z.object({
  childId: z.string().min(1),
  milestoneId: z.string().min(1),
  status: z.enum(["MET", "IN_PROGRESS", "NEEDS_REVIEW", "NOT_OBSERVED"]),
  notes: z.string().max(600).default(""),
});

export async function GET(request: Request): Promise<Response> {
  try {
    const session = await getActorFromSession();
    requirePermission(session.role, "milestones:read");
    const childId = new URL(request.url).searchParams.get("childId");
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
    const assessment = addMilestoneAssessment(session, input);
    return jsonResponse(assessment, 201);
  } catch (error) {
    return errorResponse(error);
  }
}
