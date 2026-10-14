import { errorResponse, jsonResponse, readJson } from "@/lib/api";
import { getActorFromSession, requirePermission } from "@/lib/authorization";
import { addObservation, assertChildAccess, getChildProfile } from "@/lib/data";
import { getDemoStore } from "@/lib/demo-store";
import { observationCreateSchema, observationReviewSchema } from "@/lib/validation";
import { config } from "@/lib/config";
import { createDatabaseObservation, listDatabaseObservations, updateDatabaseObservation } from "@/lib/postgres-service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request): Promise<Response> {
  try {
    const session = await getActorFromSession();
    requirePermission(session.role, "observations:read");
    const { searchParams } = new URL(request.url);
    const childId = searchParams.get("childId");
    if (config.dataMode === "postgres") return jsonResponse(await listDatabaseObservations(session, childId ?? undefined));
    const data = getDemoStore();
    let observations = data.observations;
    if (childId) {
      assertChildAccess(session, childId);
      observations = observations.filter((o) => o.childId === childId);
    } else {
      const childIds = new Set(
        data.children
          .filter((c) => session.centerIds.includes(c.centerId) || session.role === "DISTRICT_ADMIN")
          .map((c) => c.id),
      );
      if (session.role === "PARENT") {
        const guardianIds = data.guardians.filter((g) => g.linkedUserId === session.id).map((g) => g.id);
        const parentChildIds = new Set(
          data.childGuardians.filter((l) => guardianIds.includes(l.guardianId)).map((l) => l.childId),
        );
        observations = observations.filter((o) => parentChildIds.has(o.childId));
      } else if (session.role !== "DISTRICT_ADMIN") {
        observations = observations.filter((o) => childIds.has(o.childId));
      }
    }
    const sorted = observations
      .slice()
      .sort((a, b) => b.observedAt.localeCompare(a.observedAt))
      .map((o) => ({
        ...o,
        assessments: data.milestoneAssessments.filter((a) => a.observationId === o.id),
        child: data.children.find((c) => c.id === o.childId) ?? null,
      }));
    return jsonResponse(sorted);
  } catch (error) {
    return errorResponse(error);
  }
}

export async function POST(request: Request): Promise<Response> {
  try {
    const session = await getActorFromSession();
    requirePermission(session.role, "observations:create");
    const input = observationCreateSchema.parse(await readJson(request));
    if (config.dataMode === "postgres") return jsonResponse(await createDatabaseObservation(session, input, request.headers.get("idempotency-key")), 201);
    const result = addObservation(session, input);
    const profile = getChildProfile(session, input.childId);
    return jsonResponse({ observation: result.observation, assessments: result.assessments, risk: result.risk, profile }, 201);
  } catch (error) {
    return errorResponse(error);
  }
}

export async function PATCH(request: Request): Promise<Response> {
  try {
    const session = await getActorFromSession();
    requirePermission(session.role, "observations:update");
    const input = observationReviewSchema.parse(await readJson(request));
    if (config.dataMode === "postgres") return jsonResponse({ observation: await updateDatabaseObservation(session, input.id, { reviewStatus: input.reviewStatus }) });
    const data = getDemoStore();
    const observation = data.observations.find((o) => o.id === input.id);
    if (!observation) return jsonResponse({ error: "OBSERVATION_NOT_FOUND" }, 404);
    assertChildAccess(session, observation.childId);
    observation.reviewStatus = input.reviewStatus;
    observation.reviewedById = session.id;
    observation.reviewedAt = new Date().toISOString();
    observation.updatedAt = observation.reviewedAt;
    return jsonResponse({ observation });
  } catch (error) {
    return errorResponse(error);
  }
}
