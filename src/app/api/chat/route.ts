import { errorResponse, jsonResponse, readJson } from "@/lib/api";
import { ApiError, getActorFromSession } from "@/lib/authorization";
import { processChat } from "@/lib/ai-service";
import { chatSchema } from "@/lib/validation";
import { appendAudit, getDemoStore, newId } from "@/lib/demo-store";
import { config } from "@/lib/config";
import { childScopeWhere } from "@/lib/database-service";
import { prisma } from "@/lib/prisma";
import { assertSameOrigin } from "@/lib/request-security";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Simple in-memory rate limiter keyed by user id.
const rateStore = new Map<string, { count: number; windowStart: number }>();

function checkRateLimit(userId: string): void {
  const now = Date.now();
  const windowMs = 60_000;
  const entry = rateStore.get(userId);
  if (!entry || now - entry.windowStart > windowMs) {
    rateStore.set(userId, { count: 1, windowStart: now });
    return;
  }
  if (entry.count >= config.rateLimit.chatMaxPerMinute) {
    throw new ApiError(429, "RATE_LIMITED", "Too many chat requests. Please try again later.");
  }
  entry.count += 1;
}

export async function POST(request: Request): Promise<Response> {
  try {
    const session = await getActorFromSession();
    assertSameOrigin(request);
    checkRateLimit(session.id);
    const input = chatSchema.parse(await readJson(request));
    if (config.dataMode === "sqlite") {
      const scope = childScopeWhere(session);
      const children = await prisma.child.findMany({
        where: input.childId ? { ...scope, id: input.childId } : scope,
        select: { id: true, fullName: true, centerId: true },
        orderBy: { fullName: "asc" },
      });
      if (input.childId && children.length === 0) throw new ApiError(404, "CHILD_NOT_FOUND", "Child record not found.");
      const needle = input.question.toLocaleLowerCase();
      const child = input.childId ? children[0] : children.find((item) => needle.includes(item.fullName.toLocaleLowerCase()))
        ?? (children.length === 1 ? children[0] : undefined);
      if (!child) {
        const answer = children.length
          ? "Please specify the child by name so I can use the correct authorized records."
          : "There are no child records available in your authorized scope yet.";
        await prisma.chatLog.create({ data: { userId: session.id, locale: input.locale, question: input.question, responseSummary: answer, sourceRefs: [] } });
        return jsonResponse({ answer, sources: [], intent: "clarify" });
      }
      const [observations, milestones, risks, followUps, growth, recommendations] = await prisma.$transaction([
        prisma.observation.findMany({ where: { childId: child.id }, orderBy: { observedAt: "desc" }, take: 5, select: { observedAt: true, domain: true, observationText: true, followUpRequired: true } }),
        prisma.milestoneAssessment.findMany({ where: { childId: child.id }, include: { milestone: { select: { titleEn: true } } }, orderBy: { assessedAt: "desc" }, take: 20 }),
        prisma.riskAssessment.findMany({ where: { childId: child.id, reviewRequired: true }, select: { title: true, level: true } }),
        prisma.followUp.findMany({ where: { childId: child.id, status: { in: ["OPEN", "IN_PROGRESS"] } }, select: { dueDate: true } }),
        prisma.growthMeasurement.findMany({ where: { childId: child.id }, orderBy: { measuredAt: "desc" }, take: 1, select: { measuredAt: true, heightCm: true, weightKg: true } }),
        prisma.recommendation.findMany({ where: { childId: child.id, status: "ACTIVE", ...(session.role === "PARENT" ? { approvedForParent: true } : {}) }, select: { title: true } }),
      ]);
      const question = input.question.toLocaleLowerCase();
      const sources: string[] = [];
      const parts: string[] = [];
      if (/(milestone|माइलस्टोन|टप्पा)/i.test(question)) {
        sources.push("milestone assessments");
        const completed = milestones.filter((row) => row.status === "MET").length;
        parts.push(milestones.length ? `${completed} of ${milestones.length} recorded milestone assessments are marked achieved.` : "No milestone assessments have been recorded yet.");
      } else if (/(follow.?up|risk|attention|ध्यान|जोखिम)/i.test(question)) {
        sources.push("follow-ups and risk assessments");
        parts.push(`${followUps.length} open follow-up action(s) and ${risks.length} item(s) marked for review are recorded.`);
        if (followUps.some((item) => item.dueDate)) parts.push(`Next due date: ${followUps.find((item) => item.dueDate)!.dueDate!.toISOString().slice(0, 10)}.`);
      } else if (/(growth|height|weight|विकास|उंची|वजन)/i.test(question)) {
        sources.push("growth measurements");
        parts.push(growth.length ? `Latest measurement (${growth[0].measuredAt.toISOString().slice(0, 10)}): ${growth[0].heightCm} cm and ${growth[0].weightKg} kg.` : "No growth measurements have been recorded yet.");
      } else if (/(activity|home|गतिविधि|घर|उपक्रम)/i.test(question)) {
        sources.push("approved recommendations");
        parts.push(recommendations.length ? `Recorded recommendations: ${recommendations.map((item) => item.title).join(", ")}.` : "There are no active approved recommendations recorded for this child yet.");
      } else {
        sources.push("observations", "milestone assessments");
        parts.push(`${observations.length} recent observation(s) and ${milestones.length} milestone assessment(s) are recorded.`);
        if (observations[0]) parts.push(`Latest observation (${observations[0].observedAt.toISOString().slice(0, 10)}) is in the ${observations[0].domain.toLocaleLowerCase()} domain${observations[0].followUpRequired ? " and is marked for follow-up" : ""}.`);
        else parts.push("No observations have been recorded yet.");
      }
      const answer = parts.join(" ");
      await prisma.$transaction([
        prisma.chatLog.create({ data: { userId: session.id, childId: child.id, locale: input.locale, question: input.question, responseSummary: answer.slice(0, 500), sourceRefs: sources } }),
        prisma.auditLog.create({ data: { actorId: session.id, action: "chat.asked", entityType: "Chat", entityId: child.id, scopeCenterId: child.centerId, metadata: { sources } } }),
      ]);
      return jsonResponse({ answer, sources, intent: "record_summary" });
    }
    const result = await processChat(session, input.locale, input.question, input.childId ?? undefined);

    const data = getDemoStore();
    data.chatLogs.push({
      id: newId("chat"),
      userId: session.id,
      childId: input.childId ?? null,
      locale: input.locale,
      question: input.question,
      responseSummary: result.answer.slice(0, 500),
      sourceRefs: result.sources,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });
    appendAudit(data, {
      actorId: session.id,
      action: "chat.asked",
      entityType: "Chat",
      entityId: "chat",
      scopeCenterId: null,
      metadata: { intent: result.intent, childId: input.childId ?? null },
    });

    return jsonResponse(result);
  } catch (error) {
    return errorResponse(error);
  }
}
