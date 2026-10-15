import { getActorFromSession } from "@/lib/authorization";
import { errorResponse, jsonResponse } from "@/lib/api";
import { config } from "@/lib/config";
import { prisma } from "@/lib/prisma";
import type { DemoData } from "@/lib/domain";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const iso = (value: Date | null | undefined) => value?.toISOString() ?? null;
const jsonStringArray = (value: unknown): string[] => Array.isArray(value) && value.every((item) => typeof item === "string") ? value as string[] : [];

export async function GET() {
  try {
    const session = await getActorFromSession();
    if (config.dataMode !== "sqlite") return jsonResponse({ mode: "demo" });
    const where = session.role === "DISTRICT_ADMIN" ? { active: true } : session.role === "PARENT"
      ? { active: true, guardianLinks: { some: { guardian: { linkedUserId: session.id } } } }
      : session.role === "WORKER" ? { active: true, OR: [{ assignedWorkerId: session.id }, { centerId: { in: session.centerIds } }] }
      : { active: true, centerId: { in: session.centerIds } };
    const children = await prisma.child.findMany({ where, include: { guardianLinks: { include: { guardian: true } } } });
    const ids = children.map((child) => child.id);
    const centerIds = [...new Set(children.map((child) => child.centerId))];
    const [centers, users, observations, growthMeasurements, milestoneAssessments, milestoneDefinitions, risks, recommendations, messages, reports, attachments, auditLogs] = await prisma.$transaction([
      prisma.center.findMany({ where: { id: { in: centerIds } } }),
      prisma.user.findMany({ where: { OR: [{ id: session.id }, { id: { in: children.map((child) => child.assignedWorkerId) } }] } }),
      prisma.observation.findMany({ where: { childId: { in: ids } } }),
      prisma.growthMeasurement.findMany({ where: { childId: { in: ids } } }),
      prisma.milestoneAssessment.findMany({ where: { childId: { in: ids } } }),
      prisma.milestoneDefinition.findMany({ where: { active: true } }),
      prisma.riskAssessment.findMany({ where: { childId: { in: ids } } }),
      prisma.recommendation.findMany({ where: { childId: { in: ids } } }),
      prisma.message.findMany({ where: { childId: { in: ids }, OR: [{ fromUserId: session.id }, { toUserId: session.id }] } }),
      prisma.reportRecord.findMany({ where: { childId: { in: ids } } }),
      prisma.attachmentRecord.findMany({ where: { childId: { in: ids } } }),
      prisma.auditLog.findMany({ where: session.role === "DISTRICT_ADMIN" ? { scopeCenterId: { in: centerIds } } : { scopeCenterId: { in: centerIds } }, orderBy: { createdAt: "desc" }, take: 200 }),
    ]);
    const guardianMap = new Map<string, (typeof children)[number]["guardianLinks"][number]["guardian"]>();
    const childGuardians: DemoData["childGuardians"] = [];
    for (const child of children) for (const link of child.guardianLinks) { guardianMap.set(link.guardian.id, link.guardian); childGuardians.push({ childId: child.id, guardianId: link.guardianId, relationship: link.relationship as DemoData["childGuardians"][number]["relationship"], isPrimary: link.isPrimary }); }
    const mapped: DemoData = {
      centers: centers.map((row) => ({ id: row.id, code: row.code, name: row.name, village: row.village, district: row.district, state: row.state, active: row.active, createdAt: iso(row.createdAt)!, updatedAt: iso(row.updatedAt)! })),
      users: users.map((row) => ({ id: row.id, name: row.name, email: row.email, role: row.role as DemoData["users"][number]["role"], phone: row.phone, preferredLanguage: row.preferredLanguage as DemoData["users"][number]["preferredLanguage"], centerIds: jsonStringArray(row.centerIds), active: row.active, passwordHash: "", createdAt: iso(row.createdAt)!, updatedAt: iso(row.updatedAt)! })),
      guardians: [...guardianMap.values()].map((row) => ({ id: row.id, name: row.name, phone: row.phone, preferredLanguage: row.preferredLanguage as DemoData["guardians"][number]["preferredLanguage"], address: row.address, linkedUserId: row.linkedUserId, createdAt: iso(row.createdAt)!, updatedAt: iso(row.updatedAt)! })), childGuardians,
      children: children.map((row) => ({ id: row.id, internalId: row.internalId, fullName: row.fullName, dateOfBirth: iso(row.dateOfBirth)!.slice(0, 10), gender: row.gender as DemoData["children"][number]["gender"], centerId: row.centerId, assignedWorkerId: row.assignedWorkerId, enrollmentDate: iso(row.enrollmentDate)!.slice(0, 10), profilePhotoPath: row.profilePhotoPath, primaryLanguage: row.primaryLanguage as DemoData["children"][number]["primaryLanguage"], consentStatus: row.consentStatus as "APPROVED" | "PENDING", emergencyContactName: row.emergencyContactName, emergencyContactPhone: row.emergencyContactPhone, siblingIds: jsonStringArray(row.siblingIds), active: row.active, createdAt: iso(row.createdAt)!, updatedAt: iso(row.updatedAt)! })),
      growthMeasurements: growthMeasurements.map((row) => ({ id: row.id, childId: row.childId, measuredAt: iso(row.measuredAt)!, heightCm: row.heightCm, weightKg: row.weightKg, headCircumferenceCm: row.headCircumferenceCm, notes: row.notes, createdAt: iso(row.createdAt)!, updatedAt: iso(row.updatedAt)! })),
      attachments: attachments.map((row) => ({ id: row.id, observationId: row.observationId, childId: row.childId, kind: row.kind as DemoData["attachments"][number]["kind"], fileName: row.fileName, storageKey: row.storageKey, mimeType: row.mimeType, sizeBytes: row.sizeBytes, uploadedById: row.uploadedById, consentVerified: row.consentVerified, createdAt: iso(row.createdAt)!, updatedAt: iso(row.updatedAt)! })),
      observations: observations.map((row) => ({ id: row.id, childId: row.childId, createdById: row.createdById, observedAt: iso(row.observedAt)!, method: row.method as DemoData["observations"][number]["method"], observationLanguage: row.observationLanguage as DemoData["observations"][number]["observationLanguage"], domain: row.domain as DemoData["observations"][number]["domain"], activityContext: row.activityContext, observationText: row.originalText ?? row.observationText, workerNotes: row.workerNotes, aiTranscript: row.aiTranscript, aiExtractedSummary: row.aiExtractedSummary, followUpRequired: row.followUpRequired, reviewStatus: row.reviewStatus as DemoData["observations"][number]["reviewStatus"], reviewedById: null, reviewedAt: null, attachmentIds: jsonStringArray(row.attachmentIds), createdAt: iso(row.createdAt)!, updatedAt: iso(row.updatedAt)! })),
      milestoneDefinitions: milestoneDefinitions.map((row) => ({ id: row.id, slug: row.slug, domain: row.domain as DemoData["milestoneDefinitions"][number]["domain"], title: { en: row.titleEn, hi: row.titleHi, mr: row.titleMr }, description: { en: row.descriptionEn, hi: row.descriptionHi, mr: row.descriptionMr }, minAgeMonths: row.minAgeMonths, maxAgeMonths: row.maxAgeMonths, reviewAfterMonths: row.reviewAfterMonths, activities: { en: jsonStringArray(row.activitiesEn), hi: jsonStringArray(row.activitiesHi), mr: jsonStringArray(row.activitiesMr) }, active: row.active, createdAt: iso(row.createdAt)!, updatedAt: iso(row.updatedAt)! })),
      milestoneAssessments: milestoneAssessments.map((row) => ({ id: row.id, childId: row.childId, milestoneId: row.milestoneId, observationId: row.observationId, assessedById: row.assessedById, assessedAt: iso(row.assessedAt)!, status: row.status as DemoData["milestoneAssessments"][number]["status"], notes: row.notes, createdAt: iso(row.createdAt)!, updatedAt: iso(row.updatedAt)! })),
      riskAssessments: risks.map((row) => ({ id: row.id, childId: row.childId, level: row.level as DemoData["riskAssessments"][number]["level"], title: row.title, explanation: row.explanation, sourceObservationId: row.sourceObservationId, sourceMilestoneId: row.sourceMilestoneId, reviewRequired: row.reviewRequired, createdAt: iso(row.createdAt)!, updatedAt: iso(row.updatedAt)! })),
      recommendations: recommendations.map((row) => ({ id: row.id, childId: row.childId, createdById: row.createdById, locale: row.locale as DemoData["recommendations"][number]["locale"], title: row.title, description: row.description, approvedForParent: row.approvedForParent, status: row.status as "PENDING" | "ACTIVE" | "COMPLETED", createdAt: iso(row.createdAt)!, updatedAt: iso(row.updatedAt)! })),
      messages: messages.map((row) => ({ id: row.id, childId: row.childId, fromUserId: row.fromUserId, toUserId: row.toUserId, direction: row.direction as DemoData["messages"][number]["direction"], locale: row.locale as DemoData["messages"][number]["locale"], subject: row.subject, body: row.body, readAt: iso(row.readAt), createdAt: iso(row.createdAt)!, updatedAt: iso(row.updatedAt)! })),
      reports: reports.map((row) => ({ id: row.id, childId: row.childId, centerId: row.centerId, generatedById: row.generatedById, title: row.title, periodLabel: row.periodLabel, summary: row.summary, createdAt: iso(row.createdAt)!, updatedAt: iso(row.updatedAt)! })),
      chatLogs: [], passwordResetTokens: [], auditLogs: auditLogs.map((row) => ({ id: row.id, actorId: row.actorId, action: row.action, entityType: row.entityType, entityId: row.entityId, scopeCenterId: row.scopeCenterId, metadata: (row.metadata ?? {}) as DemoData["auditLogs"][number]["metadata"], createdAt: iso(row.createdAt)! })),
    };
    return jsonResponse({ mode: "sqlite", state: mapped });
  } catch (error) { return errorResponse(error); }
}
