import { errorResponse, jsonResponse, readJson } from "@/lib/api";
import { ApiError, getActorFromSession } from "@/lib/authorization";
import { processChat } from "@/lib/ai-service";
import { chatSchema } from "@/lib/validation";
import { appendAudit, getDemoStore, newId } from "@/lib/demo-store";
import { config } from "@/lib/config";

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
    checkRateLimit(session.id);
    const input = chatSchema.parse(await readJson(request));
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
