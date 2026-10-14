import { clientStore } from "./client-store";
import type { AppLocale, SessionUser } from "./domain";
import { ageLabel, formatDate } from "./utils";

/**
 * Client-side ChatService that reads directly from the reactive client store.
 * This ensures chat answers immediately reflect any record the user just created
 * or edited, without a round-trip to the server.
 *
 * The interface mirrors the server-side ai-service so a real provider can be
 * plugged in later without changing the UI.
 */

function t(locale: AppLocale, en: string, hi: string, mr: string) {
  return locale === "hi" ? hi : locale === "mr" ? mr : en;
}

function getAuthorizedChildIds(session: SessionUser): Set<string> {
  const data = clientStore.getState();
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

function detectIntent(question: string): string {
  const q = question.toLowerCase();
  if (/(summary|progress|update|सारांश|प्रगति|आढावा|माहिती)/.test(q)) return "summary";
  if (/(milestone|माइलस्टोन|टप्पा)/.test(q)) return "milestones";
  if (/(observation|अवलोकन|निरीक्षण)/.test(q)) return "observations";
  if (/(follow.?up|attention|risk|दोबारा|ध्यान|जोखिम)/.test(q)) return "followup";
  if (/(activity|home|गतिविधि|घर|उपक्रम)/.test(q)) return "activities";
  if (/(growth|height|weight|विकास|उंची|वजन)/.test(q)) return "growth";
  if (/(report|रिपोर्ट|अहवाल)/.test(q)) return "report";
  return "summary";
}

function resolveChildId(session: SessionUser, question: string, explicitChildId?: string): string | null {
  if (explicitChildId) {
    const allowed = getAuthorizedChildIds(session);
    return allowed.has(explicitChildId) ? explicitChildId : null;
  }
  const data = clientStore.getState();
  const allowed = getAuthorizedChildIds(session);
  const q = question.toLowerCase();
  const match = data.children.find(
    (c) => allowed.has(c.id) && (q.includes(c.fullName.toLowerCase()) || q.includes(c.internalId.toLowerCase())),
  );
  return match?.id ?? null;
}

export interface ChatResult {
  answer: string;
  sources: string[];
  intent: string;
  data?: unknown;
}

export function processChat(
  session: SessionUser,
  locale: AppLocale,
  question: string,
  childId?: string,
): ChatResult {
  const intent = detectIntent(question);
  const resolvedChildId = resolveChildId(session, question, childId);
  const data = clientStore.getState();

  if (!resolvedChildId) {
    const allowed = getAuthorizedChildIds(session);
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
      intent,
    };
  }

  const child = data.children.find((c) => c.id === resolvedChildId)!;
  const sources: string[] = [];

  // Helper reads directly from the store
  const recentObs = () =>
    data.observations
      .filter((o) => o.childId === resolvedChildId)
      .sort((a, b) => b.observedAt.localeCompare(a.observedAt))
      .slice(0, 5);

  const milestoneStatus = () => {
    const assessments = data.milestoneAssessments.filter((a) => a.childId === resolvedChildId);
    const mapped = assessments.map((a) => {
      const def = data.milestoneDefinitions.find((m) => m.id === a.milestoneId);
      return {
        milestoneId: a.milestoneId,
        title: def?.title[locale] ?? def?.title.en ?? "Unknown",
        domain: def?.domain,
        status: a.status,
        assessedAt: a.assessedAt,
        notes: a.notes,
      };
    });
    return {
      assessments: mapped,
      completed: mapped.filter((a) => a.status === "MET").length,
      needsReview: mapped.filter((a) => a.status === "NEEDS_REVIEW").length,
      inProgress: mapped.filter((a) => a.status === "IN_PROGRESS").length,
      total: mapped.length,
    };
  };

  const followUp = () => {
    const risks = data.riskAssessments.filter((r) => r.childId === resolvedChildId);
    const recommendations = data.recommendations
      .filter((r) => r.childId === resolvedChildId && r.status === "ACTIVE")
      .map((r) => ({ title: r.title, description: r.description, approvedForParent: r.approvedForParent }));
    return { risks, recommendations };
  };

  const growth = () =>
    data.growthMeasurements
      .filter((g) => g.childId === resolvedChildId)
      .sort((a, b) => a.measuredAt.localeCompare(b.measuredAt))
      .map((g) => ({ measuredAt: g.measuredAt, heightCm: g.heightCm, weightKg: g.weightKg, notes: g.notes }));

  if (intent === "summary") {
    const obs = recentObs();
    const ms = milestoneStatus();
    const fu = followUp();
    if (obs.length) sources.push(`observation:${obs[0].id}`);
    const latestObs = obs[0];
    const answer = t(
      locale,
      `${child.fullName} (${ageLabel(child.dateOfBirth)}) — Latest observation${latestObs ? ` on ${formatDate(latestObs.observedAt, locale)}: "${latestObs.observationText}"` : ": none recorded yet."} Milestones: ${ms.completed} met, ${ms.inProgress} in progress, ${ms.needsReview} need review. Follow-up: ${fu.risks.length ? `${fu.risks.length} active flag(s)` : "no active flags"}. This summary is compiled from records, not a diagnosis.`,
      `${child.fullName} (${ageLabel(child.dateOfBirth)}) — नवीनतम अवलोकन${latestObs ? ` ${formatDate(latestObs.observedAt, locale)} को: "${latestObs.observationText}"` : ": अभी तक कोई नहीं।"} माइलस्टोन: ${ms.completed} पूर्ण, ${ms.inProgress} प्रगति पर, ${ms.needsReview} समीक्षा चाहिए। फॉलो-अप: ${fu.risks.length ? `${fu.risks.length} सक्रिय फ्लैग` : "कोई सक्रिय फ्लैग नहीं"}। यह सारांश रिकॉर्ड से बनाया गया है, निदान नहीं।`,
      `${child.fullName} (${ageLabel(child.dateOfBirth)}) — अलीकडील निरीक्षण${latestObs ? ` ${formatDate(latestObs.observedAt, locale)} ला: "${latestObs.observationText}"` : ": अद्याप कोणतेही नाही."} टप्पे: ${ms.completed} पूर्ण, ${ms.inProgress} प्रगतीवर, ${ms.needsReview} पुनरावलोकन आवश्यक. फॉलो-अप: ${fu.risks.length ? `${fu.risks.length} सक्रिय फ्लॅग` : "कोणतेही सक्रिय फ्लॅग नाही"}. हा सारांश नोंदींवरून तयार केला आहे, निदान नाही.`,
    );
    return { answer, sources, intent, data: { childId: resolvedChildId, observations: obs, milestones: ms, followUp: fu } };
  }

  if (intent === "milestones") {
    const ms = milestoneStatus();
    const lines = ms.assessments.map((a) => `• ${a.title}: ${a.status}${a.notes ? ` (${a.notes})` : ""}`).join("\n");
    return {
      answer: t(
        locale,
        `${child.fullName}'s milestone status:\n${lines || "No milestone assessments recorded yet."}\n\n${ms.completed} met, ${ms.inProgress} in progress, ${ms.needsReview} need review.`,
        `${child.fullName} के माइलस्टोन स्थिति:\n${lines || "अभी तक कोई माइलस्टोन मूल्यांकन दर्ज नहीं।"}\n\n${ms.completed} पूर्ण, ${ms.inProgress} प्रगति पर, ${ms.needsReview} समीक्षा चाहिए।`,
        `${child.fullName} च्या टप्प्यांची स्थिती:\n${lines || "अद्याप कोणतेही टप्पा मूल्यांकन नोंदवले गेले नाही."}\n\n${ms.completed} पूर्ण, ${ms.inProgress} प्रगतीवर, ${ms.needsReview} पुनरावलोकन आवश्यक.`,
      ),
      sources: ms.assessments.map((a) => `milestone:${a.milestoneId}`),
      intent,
      data: ms,
    };
  }

  if (intent === "observations") {
    const obs = recentObs();
    const lines = obs
      .map((o) => `• ${formatDate(o.observedAt, locale)} [${o.method}/${o.domain}]: ${o.observationText}`)
      .join("\n");
    return {
      answer: t(
        locale,
        `${child.fullName}'s recent observations:\n${lines || "No observations recorded yet."}`,
        `${child.fullName} की हाल की टिप्पणियाँ:\n${lines || "अभी तक कोई टिप्पणी दर्ज नहीं।"}`,
        `${child.fullName} च्या अलीकडील निरीक्षणे:\n${lines || "अद्याप कोणतीही निरीक्षणे नोंदवली गेली नाही."}`,
      ),
      sources: obs.map((o) => `observation:${o.id}`),
      intent,
      data: obs,
    };
  }

  if (intent === "followup") {
    const fu = followUp();
    const riskLines = fu.risks.map((r) => `• ${r.level}: ${r.title} — ${r.explanation}`).join("\n");
    const recLines = fu.recommendations.map((r) => `• ${r.title}: ${r.description}`).join("\n");
    return {
      answer: t(
        locale,
        `Follow-up for ${child.fullName}:\n${riskLines || "No active follow-up flags."}\n\nRecommendations:\n${recLines || "No active recommendations."}\n\nThese are flagged for review, not a diagnosis.`,
        `${child.fullName} के लिए फॉलो-अप:\n${riskLines || "कोई सक्रिय फॉलो-अप फ्लैग नहीं।"}\n\nसुझाव:\n${recLines || "कोई सक्रिय सुझाव नहीं।"}\n\nये समीक्षा के लिए हैं, निदान नहीं।`,
        `${child.fullName} साठी फॉलो-अप:\n${riskLines || "कोणतेही सक्रिय फॉलो-अप फ्लॅग नाही."}\n\nशिफारसी:\n${recLines || "कोणतीही सक्रिय शिफारस नाही."}\n\nहे पुनरावलोकनासाठी आहेत, निदान नाही.`,
      ),
      sources: fu.risks.map((r) => `risk:${r.id}`),
      intent,
      data: fu,
    };
  }

  if (intent === "activities") {
    const fu = followUp();
    const recs = fu.recommendations.filter((r) => r.approvedForParent);
    const lines = recs.map((r) => `• ${r.title}: ${r.description}`).join("\n");
    return {
      answer: t(
        locale,
        `Approved home activities for ${child.fullName}:\n${lines || "No approved home activities yet. Consult the assigned worker for personalized suggestions."}`,
        `${child.fullName} के लिए स्वीकृत घरेलू गतिविधियाँ:\n${lines || "अभी तक कोई स्वीकृत घरेलू गतिविधि नहीं। व्यक्तिगत सुझावों के लिए कार्यकर्ता से संपर्क करें।"}`,
        `${child.fullName} साठी मान्य घरगुती उपक्रम:\n${lines || "अद्याप कोणतेही मान्य घरगुती उपक्रम नाहीत. वैयक्तिक सूचनांसाठी नियुक्त कार्यकर्त्याशी संपर्क करा."}`,
      ),
      sources: [],
      intent,
      data: recs,
    };
  }

  if (intent === "growth") {
    const g = growth();
    const lines = g.map((m) => `• ${formatDate(m.measuredAt, locale)}: ${m.heightCm} cm, ${m.weightKg} kg`).join("\n");
    const latest = g[g.length - 1];
    return {
      answer: t(
        locale,
        `${child.fullName}'s growth record:\n${lines || "No growth measurements recorded yet."}${latest ? `\n\nLatest: ${latest.heightCm} cm, ${latest.weightKg} kg` : ""}`,
        `${child.fullName} का विकास रिकॉर्ड:\n${lines || "अभी तक कोई विकास मापन दर्ज नहीं।"}${latest ? `\n\nनवीनतम: ${latest.heightCm} सेमी, ${latest.weightKg} किग्रा` : ""}`,
        `${child.fullName} ची वाढ नोंद:\n${lines || "अद्याप कोणतीही वाढ मोजमाप नोंदवली गेली नाही."}${latest ? `\n\nताजे: ${latest.heightCm} सेमी, ${latest.weightKg} किग्रॅ` : ""}`,
      ),
      sources: [],
      intent,
      data: g,
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
    intent,
  };
}
