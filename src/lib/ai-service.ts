import { getDemoStore } from "@/lib/demo-store";
import type { AppLocale, SessionUser } from "@/lib/domain";
import { ageLabel, formatDate } from "@/lib/utils";
import { buildLlmMessages, llm } from "./llm";

type ToolContext = { session: SessionUser; locale: AppLocale; childId?: string };

type ToolResult = { ok: boolean; data?: unknown; error?: string };

const t = (locale: AppLocale, en: string, hi: string, mr: string) =>
  locale === "hi" ? hi : locale === "mr" ? mr : en;

function getAuthorizedChildIds(session: SessionUser): Set<string> {
  const data = getDemoStore();
  if (session.role === "DISTRICT_ADMIN") return new Set(data.children.map((c) => c.id));
  if (session.role === "PARENT") {
    const guardianIds = data.guardians.filter((g) => g.linkedUserId === session.id).map((g) => g.id);
    return new Set(data.childGuardians.filter((l) => guardianIds.includes(l.guardianId)).map((l) => l.childId));
  }
  return new Set(
    data.children
      .filter((c) => c.assignedWorkerId === session.id || session.centerIds.includes(c.centerId))
      .map((c) => c.id),
  );
}

export const tools = {
  get_child_profile: {
    description: "Get the profile of a specific child",
    parameters: { childId: "string" },
    execute: (ctx: ToolContext, params: { childId: string }): ToolResult => {
      const allowed = getAuthorizedChildIds(ctx.session);
      if (!allowed.has(params.childId)) return { ok: false, error: "NOT_AUTHORIZED" };
      const data = getDemoStore();
      const child = data.children.find((c) => c.id === params.childId);
      if (!child) return { ok: false, error: "NOT_FOUND" };
      const center = data.centers.find((c) => c.id === child.centerId);
      const worker = data.users.find((u) => u.id === child.assignedWorkerId);
      return {
        ok: true,
        data: {
          id: child.id,
          internalId: child.internalId,
          fullName: child.fullName,
          dateOfBirth: child.dateOfBirth,
          age: ageLabel(child.dateOfBirth),
          gender: child.gender,
          centerName: center?.name ?? null,
          assignedWorker: worker?.name ?? null,
          enrollmentDate: child.enrollmentDate,
          consentStatus: child.consentStatus,
        },
      };
    },
  },

  get_recent_observations: {
    description: "Get recent observations for a child",
    parameters: { childId: "string", limit: "number" },
    execute: (ctx: ToolContext, params: { childId: string; limit?: number }): ToolResult => {
      const allowed = getAuthorizedChildIds(ctx.session);
      if (!allowed.has(params.childId)) return { ok: false, error: "NOT_AUTHORIZED" };
      const data = getDemoStore();
      const limit = params.limit ?? 5;
      const observations = data.observations
        .filter((o) => o.childId === params.childId)
        .sort((a, b) => b.observedAt.localeCompare(a.observedAt))
        .slice(0, limit)
        .map((o) => ({
          id: o.id,
          observedAt: o.observedAt,
          method: o.method,
          domain: o.domain,
          activityContext: o.activityContext,
          observationText: o.observationText,
          workerNotes: o.workerNotes,
          followUpRequired: o.followUpRequired,
          reviewStatus: o.reviewStatus,
        }));
      return { ok: true, data: observations };
    },
  },

  get_milestone_status: {
    description: "Get milestone assessment status for a child",
    parameters: { childId: "string" },
    execute: (ctx: ToolContext, params: { childId: string }): ToolResult => {
      const allowed = getAuthorizedChildIds(ctx.session);
      if (!allowed.has(params.childId)) return { ok: false, error: "NOT_AUTHORIZED" };
      const data = getDemoStore();
      const assessments = data.milestoneAssessments
        .filter((a) => a.childId === params.childId)
        .map((a) => {
          const def = data.milestoneDefinitions.find((m) => m.id === a.milestoneId);
          return {
            milestoneId: a.milestoneId,
            title: def?.title[ctx.locale] ?? def?.title.en ?? "Unknown",
            domain: def?.domain,
            status: a.status,
            assessedAt: a.assessedAt,
            notes: a.notes,
          };
        });
      const completed = assessments.filter((a) => a.status === "MET").length;
      const needsReview = assessments.filter((a) => a.status === "NEEDS_REVIEW").length;
      const inProgress = assessments.filter((a) => a.status === "IN_PROGRESS").length;
      return { ok: true, data: { assessments, completed, needsReview, inProgress, total: assessments.length } };
    },
  },

  get_follow_up_actions: {
    description: "Get follow-up and risk assessments for a child",
    parameters: { childId: "string" },
    execute: (ctx: ToolContext, params: { childId: string }): ToolResult => {
      const allowed = getAuthorizedChildIds(ctx.session);
      if (!allowed.has(params.childId)) return { ok: false, error: "NOT_AUTHORIZED" };
      const data = getDemoStore();
      const risks = data.riskAssessments.filter((r) => r.childId === params.childId);
      const recommendations = data.recommendations
        .filter((r) => r.childId === params.childId && r.status === "ACTIVE")
        .map((r) => ({ title: r.title, description: r.description, approvedForParent: r.approvedForParent }));
      return { ok: true, data: { risks, recommendations } };
    },
  },

  get_growth_history: {
    description: "Get growth measurement history for a child",
    parameters: { childId: "string" },
    execute: (ctx: ToolContext, params: { childId: string }): ToolResult => {
      const allowed = getAuthorizedChildIds(ctx.session);
      if (!allowed.has(params.childId)) return { ok: false, error: "NOT_AUTHORIZED" };
      const data = getDemoStore();
      const growth = data.growthMeasurements
        .filter((g) => g.childId === params.childId)
        .sort((a, b) => a.measuredAt.localeCompare(b.measuredAt))
        .map((g) => ({ measuredAt: g.measuredAt, heightCm: g.heightCm, weightKg: g.weightKg, notes: g.notes }));
      return { ok: true, data: growth };
    },
  },

  get_authorized_center_summary: {
    description: "Get aggregate summary for authorized centers",
    parameters: {},
    execute: (ctx: ToolContext): ToolResult => {
      const data = getDemoStore();
      const allowed = getAuthorizedChildIds(ctx.session);
      const children = data.children.filter((c) => allowed.has(c.id));
      const observations = data.observations.filter((o) => allowed.has(o.childId));
      const risks = data.riskAssessments.filter((r) => allowed.has(r.childId));
      return {
        ok: true,
        data: {
          totalChildren: children.length,
          totalObservations: observations.length,
          followUpCount: risks.filter((r) => r.reviewRequired).length,
          verifiedObservations: observations.filter((o) => o.reviewStatus === "VERIFIED").length,
        },
      };
    },
  },
} as const;

export type ToolName = keyof typeof tools;

function detectIntent(question: string, locale: AppLocale): { intent: string; childName?: string } {
  const q = question.toLowerCase();
  if (/(summary|progress|update|सारांश|प्रगति|आढावा|माहिती)/.test(q)) return { intent: "summary" };
  if (/(milestone|माइलस्टोन|टप्पा)/.test(q)) return { intent: "milestones" };
  if (/(observation|अवलोकन|निरीक्षण)/.test(q)) return { intent: "observations" };
  if (/(follow.?up|attention|risk|दोबारा|ध्यान|जोखिम)/.test(q)) return { intent: "followup" };
  if (/(activity|home|गतिविधि|घर|उपक्रम)/.test(q)) return { intent: "activities" };
  if (/(growth|height|weight|विकास|उंची|वजन)/.test(q)) return { intent: "growth" };
  if (/(report|रिपोर्ट|अहवाल)/.test(q)) return { intent: "report" };
  return { intent: "summary" };
}

function resolveChildId(session: SessionUser, question: string, explicitChildId?: string): string | null {
  if (explicitChildId) {
    const allowed = getAuthorizedChildIds(session);
    return allowed.has(explicitChildId) ? explicitChildId : null;
  }
  const data = getDemoStore();
  const allowed = getAuthorizedChildIds(session);
  const q = question.toLowerCase();
  const match = data.children.find(
    (c) => allowed.has(c.id) && (q.includes(c.fullName.toLowerCase()) || q.includes(c.internalId.toLowerCase())),
  );
  return match?.id ?? null;
}

function buildResponse(
  intent: string,
  childId: string | null,
  ctx: ToolContext,
): { answer: string; sources: string[]; data: unknown } {
  const data = getDemoStore();
  const locale = ctx.locale;
  if (!childId) {
    const allowed = getAuthorizedChildIds(ctx.session);
    const childNames = data.children
      .filter((c) => allowed.has(c.id))
      .map((c) => c.fullName)
      .join(", ");
    return {
      answer: t(
        locale,
        `I can help with your authorized children's records. Please specify a child by name. Your authorized children are: ${childNames || "none"}.`,
        `मैं आपके अधिकृत बच्चों के रिकॉर्ड में मदद कर सकता हूं। कृपया नाम से एक बच्चा बताएं। आपके अधिकृत बच्चे: ${childNames || "कोई नहीं"}।`,
        `मी तुमच्या अधिकृत मुलांच्या नोंदींमध्ये मदत करू शकतो. कृपया नावाने एक मूल सांगा. तुमची अधिकृत मुले: ${childNames || "कोणतीही नाही"}.`,
      ),
      sources: [],
      data: null,
    };
  }

  const child = data.children.find((c) => c.id === childId)!;
  const sources: string[] = [];

  if (intent === "summary") {
    const obs = tools.get_recent_observations.execute(ctx, { childId, limit: 3 }).data as Array<Record<string, unknown>>;
    const ms = tools.get_milestone_status.execute(ctx, { childId }).data as Record<string, unknown>;
    const fu = tools.get_follow_up_actions.execute(ctx, { childId }).data as Record<string, unknown>;
    if (obs?.length) sources.push(`observations:${obs[0].id}`);
    const latestObs = obs?.[0];
    const answer = t(
      locale,
      `${child.fullName} (${ageLabel(child.dateOfBirth)}) — Latest observation${latestObs ? ` on ${formatDate(latestObs.observedAt as string, locale)}: "${latestObs.observationText}"` : ": none recorded yet."} Milestones: ${ms.completed} met, ${ms.inProgress} in progress, ${ms.needsReview} need review. Follow-up: ${(fu.risks as Array<unknown>)?.length ? `${(fu.risks as Array<unknown>).length} active flag(s)` : "no active flags"}. This summary is compiled from records, not a diagnosis.`,
      `${child.fullName} (${ageLabel(child.dateOfBirth)}) — नवीनतम अवलोकन${latestObs ? ` ${formatDate(latestObs.observedAt as string, locale)} को: "${latestObs.observationText}"` : ": अभी तक कोई नहीं।"} माइलस्टोन: ${ms.completed} पूर्ण, ${ms.inProgress} प्रगति पर, ${ms.needsReview} समीक्षा चाहिए। फॉलो-अप: ${(fu.risks as Array<unknown>)?.length ? `${(fu.risks as Array<unknown>).length} सक्रिय फ्लैग` : "कोई सक्रिय फ्लैग नहीं"}। यह सारांश रिकॉर्ड से बनाया गया है, निदान नहीं।`,
      `${child.fullName} (${ageLabel(child.dateOfBirth)}) — अलीकडील निरीक्षण${latestObs ? ` ${formatDate(latestObs.observedAt as string, locale)} ला: "${latestObs.observationText}"` : ": अद्याप कोणतेही नाही."} टप्पे: ${ms.completed} पूर्ण, ${ms.inProgress} प्रगतीवर, ${ms.needsReview} पुनरावलोकन आवश्यक. फॉलो-अप: ${(fu.risks as Array<unknown>)?.length ? `${(fu.risks as Array<unknown>).length} सक्रिय फ्लॅग` : "कोणतेही सक्रिय फ्लॅग नाही"}. हा सारांश नोंदींवरून तयार केला आहे, निदान नाही.`,
    );
    return { answer, sources, data: { childId, observations: obs, milestones: ms, followUp: fu } };
  }

  if (intent === "milestones") {
    const ms = tools.get_milestone_status.execute(ctx, { childId }).data as Record<string, unknown>;
    const assessments = (ms.assessments as Array<Record<string, unknown>>) ?? [];
    const lines = assessments.map((a) => `• ${a.title}: ${a.status}${a.notes ? ` (${a.notes})` : ""}`).join("\n");
    return {
      answer: t(
        locale,
        `${child.fullName}'s milestone status:\n${lines || "No milestone assessments recorded yet."}\n\n${ms.completed} met, ${ms.inProgress} in progress, ${ms.needsReview} need review.`,
        `${child.fullName} के माइलस्टोन स्थिति:\n${lines || "अभी तक कोई माइलस्टोन मूल्यांकन दर्ज नहीं।"}\n\n${ms.completed} पूर्ण, ${ms.inProgress} प्रगति पर, ${ms.needsReview} समीक्षा चाहिए।`,
        `${child.fullName} च्या टप्प्यांची स्थिती:\n${lines || "अद्याप कोणतेही टप्पा मूल्यांकन नोंदवले गेले नाही."}\n\n${ms.completed} पूर्ण, ${ms.inProgress} प्रगतीवर, ${ms.needsReview} पुनरावलोकन आवश्यक.`,
      ),
      sources: assessments.map((a) => `milestone:${a.milestoneId}`),
      data: ms,
    };
  }

  if (intent === "observations") {
    const obs = tools.get_recent_observations.execute(ctx, { childId, limit: 5 }).data as Array<Record<string, unknown>>;
    const lines = obs
      ?.map((o) => `• ${formatDate(o.observedAt as string, locale)} [${o.method}/${o.domain}]: ${o.observationText}`)
      .join("\n");
    return {
      answer: t(
        locale,
        `${child.fullName}'s recent observations:\n${lines || "No observations recorded yet."}`,
        `${child.fullName} की हाल की टिप्पणियाँ:\n${lines || "अभी तक कोई टिप्पणी दर्ज नहीं।"}`,
        `${child.fullName} च्या अलीकडील निरीक्षणे:\n${lines || "अद्याप कोणतीही निरीक्षणे नोंदवली गेली नाही."}`,
      ),
      sources: obs?.map((o) => `observation:${o.id}`) ?? [],
      data: obs,
    };
  }

  if (intent === "followup") {
    const fu = tools.get_follow_up_actions.execute(ctx, { childId }).data as Record<string, unknown>;
    const risks = (fu.risks as Array<Record<string, unknown>>) ?? [];
    const recs = (fu.recommendations as Array<Record<string, unknown>>) ?? [];
    const riskLines = risks.map((r) => `• ${r.level}: ${r.title} — ${r.explanation}`).join("\n");
    const recLines = recs.map((r) => `• ${r.title}: ${r.description}`).join("\n");
    return {
      answer: t(
        locale,
        `Follow-up for ${child.fullName}:\n${riskLines || "No active follow-up flags."}\n\nRecommendations:\n${recLines || "No active recommendations."}\n\nThese are flagged for review, not a diagnosis.`,
        `${child.fullName} के लिए फॉलो-अप:\n${riskLines || "कोई सक्रिय फॉलो-अप फ्लैग नहीं।"}\n\nसुझाव:\n${recLines || "कोई सक्रिय सुझाव नहीं।"}\n\nये समीक्षा के लिए हैं, निदान नहीं।`,
        `${child.fullName} साठी फॉलो-अप:\n${riskLines || "कोणतेही सक्रिय फॉलो-अप फ्लॅग नाही."}\n\nशिफारसी:\n${recLines || "कोणतीही सक्रिय शिफारस नाही."}\n\nहे पुनरावलोकनासाठी आहेत, निदान नाही.`,
      ),
      sources: risks.map((r) => `risk:${r.id}`),
      data: fu,
    };
  }

  if (intent === "activities") {
    const fu = tools.get_follow_up_actions.execute(ctx, { childId }).data as Record<string, unknown>;
    const recs = ((fu.recommendations as Array<Record<string, unknown>>) ?? []).filter((r) => r.approvedForParent);
    const lines = recs.map((r) => `• ${r.title}: ${r.description}`).join("\n");
    return {
      answer: t(
        locale,
        `Approved home activities for ${child.fullName}:\n${lines || "No approved home activities yet. Consult the assigned worker for personalized suggestions."}`,
        `${child.fullName} के लिए स्वीकृत घरेलू गतिविधियाँ:\n${lines || "अभी तक कोई स्वीकृत घरेलू गतिविधि नहीं। व्यक्तिगत सुझावों के लिए कार्यकर्ता से संपर्क करें।"}`,
        `${child.fullName} साठी मान्य घरगुती उपक्रम:\n${lines || "अद्याप कोणतेही मान्य घरगुती उपक्रम नाहीत. वैयक्तिक सूचनांसाठी नियुक्त कार्यकर्त्याशी संपर्क करा."}`,
      ),
      sources: [],
      data: recs,
    };
  }

  if (intent === "growth") {
    const growth = tools.get_growth_history.execute(ctx, { childId }).data as Array<Record<string, unknown>>;
    const lines = growth?.map((g) => `• ${formatDate(g.measuredAt as string, locale)}: ${g.heightCm} cm, ${g.weightKg} kg`).join("\n");
    const latest = growth?.[growth.length - 1];
    return {
      answer: t(
        locale,
        `${child.fullName}'s growth record:\n${lines || "No growth measurements recorded yet."}${latest ? `\n\nLatest: ${latest.heightCm} cm, ${latest.weightKg} kg` : ""}`,
        `${child.fullName} का विकास रिकॉर्ड:\n${lines || "अभी तक कोई विकास मापन दर्ज नहीं।"}${latest ? `\n\nनवीनतम: ${latest.heightCm} सेमी, ${latest.weightKg} किग्रा` : ""}`,
        `${child.fullName} ची वाढ नोंद:\n${lines || "अद्याप कोणतीही वाढ मोजमाप नोंदवली गेली नाही."}${latest ? `\n\nताजे: ${latest.heightCm} सेमी, ${latest.weightKg} किग्रॅ` : ""}`,
      ),
      sources: [],
      data: growth,
    };
  }

  return {
    answer: t(
      locale,
      `I can summarize progress, list milestones, show observations, suggest home activities, or explain follow-up flags for ${child.fullName}. What would you like to know?`,
      `मैं ${child.fullName} की प्रगति का सारांश, माइलस्टोन, टिप्पणियाँ, घरेलू गतिविधियाँ, या फॉलो-अप फ्लैग दिखा सकता हूं। आप क्या जानना चाहेंगे?`,
      `मी ${child.fullName} च्या प्रगतीचा सारांश, टप्पे, निरीक्षणे, घरगुती उपक्रम किंवा फॉलो-अप फ्लॅग दाखवू शकतो. तुम्हाला काय जाणून घ्यायचे आहे?`,
    ),
    sources: [],
    data: null,
  };
}

export async function processChat(
  session: SessionUser,
  locale: AppLocale,
  question: string,
  childId?: string,
): Promise<{ answer: string; sources: string[]; data: unknown; intent: string }> {
  const intentResult = detectIntent(question, locale);
  const resolvedChildId = resolveChildId(session, question, childId);
  const ctx = { session, locale, childId: resolvedChildId ?? undefined };
  const result = buildResponse(intentResult.intent, resolvedChildId, ctx);

  if (llm.isAvailable() && resolvedChildId) {
    try {
      const messages = buildLlmMessages(session, locale, question, result.data);
      const llmRes = await llm.chat({ messages });
      if (llmRes.content && llmRes.content.trim().length > 0) {
        return { ...result, answer: llmRes.content, intent: intentResult.intent };
      }
    } catch {
      // LLM call failed; fall through to the rule-based answer.
    }
  }

  return { ...result, intent: intentResult.intent };
}
