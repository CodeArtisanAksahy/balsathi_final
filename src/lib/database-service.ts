import { createHash, randomUUID } from "node:crypto";
import { ApiError } from "./authorization";
import { config } from "./config";
import { prisma } from "./prisma";
import type { AppLocale, SessionUser } from "./domain";
import type { Prisma } from "@prisma/client";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { access, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { ageInMonthsAt, groupObservationCounts, milestoneCompletion, monthlyObservationCounts } from "./analytics-math";
import type { AssessmentStatus } from "./domain";
import { forecastDashboardSchema } from "./forecast-contract";
import { notifyChildStakeholders, notifyUser } from "./notification-service";

export function requireDatabaseMode() {
  if (config.dataMode !== "sqlite") throw new ApiError(409, "SQLITE_MODE_REQUIRED", "This endpoint requires DATA_MODE=sqlite.");
  if (!config.databaseUrl) throw new ApiError(503, "DATABASE_NOT_CONFIGURED", "DATABASE_URL is required in SQLite mode.");
}

export function childScopeWhere(session: SessionUser): Prisma.ChildWhereInput {
  if (session.role === "DISTRICT_ADMIN") return { active: true };
  if (session.role === "PARENT") return { active: true, guardianLinks: { some: { guardian: { linkedUserId: session.id } } } };
  if (session.role === "WORKER") return { active: true, OR: [{ assignedWorkerId: session.id }, { centerId: { in: session.centerIds } }] };
  return { active: true, centerId: { in: session.centerIds } };
}

export async function getDatabaseChildRegistrationOptions(session: SessionUser) {
  if (session.role === "PARENT") throw new ApiError(403, "FORBIDDEN", "Parents cannot register children.");
  const centerWhere = session.role === "DISTRICT_ADMIN" ? { active: true } : { active: true, id: { in: session.centerIds } };
  const [centers, workerRows] = await Promise.all([
    prisma.center.findMany({ where: centerWhere, select: { id: true, name: true }, orderBy: { name: "asc" } }),
    prisma.user.findMany({ where: { active: true, role: "WORKER" }, select: { id: true, name: true, centerIds: true }, orderBy: { name: "asc" } }),
  ]);
  const visibleCenterIds = new Set(centers.map((center) => center.id));
  const workers = workerRows.flatMap((worker) => {
    const assignedCenterIds = Array.isArray(worker.centerIds)
      ? worker.centerIds.filter((centerId): centerId is string => typeof centerId === "string" && visibleCenterIds.has(centerId))
      : [];
    return assignedCenterIds.length ? [{ id: worker.id, name: worker.name, centerIds: assignedCenterIds }] : [];
  });
  return { centers, workers };
}

async function loadVerifiedModelEvaluation(artifact: string): Promise<Record<string, unknown> | null> {
  try {
    await access(artifact);
    const evaluationPath = process.env.ML_EVALUATION_PATH ?? path.join(path.dirname(artifact), "evaluation.json");
    const evaluation = JSON.parse(await readFile(/*turbopackIgnore: true*/ evaluationPath, "utf8")) as Record<string, unknown>;
    const digest = createHash("sha256").update(await readFile(/*turbopackIgnore: true*/ artifact)).digest("hex");
    const metrics = evaluation.metrics as Record<string, unknown> | undefined;
    const isMetric = (value: unknown): value is number => typeof value === "number" && Number.isFinite(value) && value >= 0;
    if (evaluation.trained !== true || evaluation.model_name !== "aggregate_observation_volume" || typeof evaluation.model_version !== "string" || !evaluation.model_version
      || evaluation.data_source !== "sqlite_aggregate_export" || evaluation.real_data_validation !== true || evaluation.artifact_sha256 !== digest
      || typeof evaluation.data_cutoff !== "string" || !/^\d{4}-\d{2}$/.test(evaluation.data_cutoff)
      || typeof evaluation.sample_count !== "number" || evaluation.sample_count < 24
      || !metrics || !isMetric(metrics.candidate_mae) || !isMetric(metrics.candidate_rmse) || !isMetric(metrics.baseline_mae) || !isMetric(metrics.baseline_rmse)
      || typeof metrics.test_months !== "number" || metrics.test_months < 3 || metrics.candidate_mae >= metrics.baseline_mae
      || metrics.dataset_cutoff !== evaluation.data_cutoff) return null;
    return evaluation;
  } catch {
    return null;
  }
}

export async function assertIdempotency(actorId: string, key: string | null, entityType: string) {
  if (!key) return null;
  const row = await prisma.idempotencyRecord.findUnique({ where: { actorId_key: { actorId, key } } });
  if (!row) return null;
  if (row.entityType !== entityType) throw new ApiError(409, "IDEMPOTENCY_KEY_REUSED", "Idempotency key was used for a different operation.");
  return row.entityId;
}

export async function recordIdempotency(tx: Prisma.TransactionClient, actorId: string, key: string | null, entityType: string, entityId: string) {
  if (key) await tx.idempotencyRecord.create({ data: { id: randomUUID(), actorId, key, entityType, entityId } });
}

export async function listDatabaseChildren(session: SessionUser, filters: {
  q?: string; centerId?: string; ageGroup?: "all" | "0-2" | "2-4" | "4-6"; status?: "all" | "follow-up" | "stable"; page: number; pageSize: number; sort: "name" | "recent" | "age";
}) {
  const scope = childScopeWhere(session);
  if (filters.centerId && session.role !== "DISTRICT_ADMIN" && !session.centerIds.includes(filters.centerId)) throw new ApiError(403, "CENTER_FORBIDDEN", "This center is outside your assigned scope.");
  const now = new Date();
  const shiftMonths = (months: number) => { const date = new Date(now); date.setUTCMonth(date.getUTCMonth() - months); return date; };
  const ageRange = filters.ageGroup === "0-2" ? { gte: shiftMonths(24), lte: now } : filters.ageGroup === "2-4" ? { gte: shiftMonths(48), lt: shiftMonths(24) } : filters.ageGroup === "4-6" ? { gte: shiftMonths(72), lt: shiftMonths(48) } : undefined;
  const where: Prisma.ChildWhereInput = {
    AND: [scope,
      ...(filters.centerId ? [{ centerId: filters.centerId } as Prisma.ChildWhereInput] : []),
      ...(filters.q ? [{ OR: [{ fullName: { contains: filters.q } }, { internalId: { contains: filters.q } }] } as Prisma.ChildWhereInput] : []),
      ...(ageRange ? [{ dateOfBirth: ageRange } as Prisma.ChildWhereInput] : []),
      ...(filters.status === "follow-up" ? [{ risks: { some: { reviewRequired: true } } } as Prisma.ChildWhereInput] : []),
      ...(filters.status === "stable" ? [{ risks: { none: { reviewRequired: true } } } as Prisma.ChildWhereInput] : []),
    ],
  };
  const [total, items] = await prisma.$transaction([
    prisma.child.count({ where }),
    prisma.child.findMany({ where, include: { center: true, observations: { orderBy: { observedAt: "desc" }, take: 1 }, risks: { where: { reviewRequired: true } } }, orderBy: filters.sort === "age" ? { dateOfBirth: "desc" } : filters.sort === "recent" ? { updatedAt: "desc" } : { fullName: "asc" }, skip: (filters.page - 1) * filters.pageSize, take: filters.pageSize }),
  ]);
  return { items, total, page: filters.page, pageSize: filters.pageSize, pageCount: Math.max(1, Math.ceil(total / filters.pageSize)) };
}

export async function createDatabaseChild(session: SessionUser, input: {
  fullName: string; dateOfBirth: string; gender: "FEMALE" | "MALE" | "OTHER" | "UNSPECIFIED";
  centerId: string; assignedWorkerId: string; primaryLanguage: "en" | "hi" | "mr";
  emergencyContactName: string; emergencyContactPhone: string;
  guardian: { name: string; phone: string; preferredLanguage: "en" | "hi" | "mr"; relationship: "MOTHER" | "FATHER" | "GRANDPARENT" | "SIBLING" | "OTHER" };
}, idempotencyKey: string | null) {
  if (session.role === "PARENT") throw new ApiError(403, "FORBIDDEN", "Parents cannot register children.");
  if (session.role !== "DISTRICT_ADMIN" && !session.centerIds.includes(input.centerId)) throw new ApiError(403, "CENTER_FORBIDDEN", "This center is outside your assigned scope.");
  const existingId = await assertIdempotency(session.id, idempotencyKey, "child.create");
  if (existingId) return prisma.child.findUniqueOrThrow({ where: { id: existingId }, include: { guardianLinks: { include: { guardian: true } } } });
  const [center, workers] = await Promise.all([
    prisma.center.findUnique({ where: { id: input.centerId } }),
    prisma.user.findMany({ where: { id: input.assignedWorkerId, role: "WORKER", active: true } }),
  ]);
  const worker = workers.find((candidate) => Array.isArray(candidate.centerIds) && candidate.centerIds.includes(input.centerId));
  if (!center?.active) throw new ApiError(422, "INVALID_CENTER", "Selected center does not exist or is inactive.");
  if (!worker) throw new ApiError(422, "INVALID_WORKER", "Selected worker is not active in this center.");
  const id = randomUUID();
  const internalId = `BAL-${id.replaceAll("-", "").slice(0, 12).toUpperCase()}`;
  try {
    return await prisma.$transaction(async (tx) => {
      const guardian = await tx.guardian.create({ data: { id: randomUUID(), name: input.guardian.name, phone: input.guardian.phone, preferredLanguage: input.guardian.preferredLanguage, address: "", linkedUserId: null } });
      const child = await tx.child.create({ data: {
        id, internalId, fullName: input.fullName, dateOfBirth: new Date(`${input.dateOfBirth}T00:00:00.000Z`), gender: input.gender, siblingIds: [],
        centerId: input.centerId, assignedWorkerId: input.assignedWorkerId, primaryLanguage: input.primaryLanguage,
        emergencyContactName: input.emergencyContactName, emergencyContactPhone: input.emergencyContactPhone,
        guardianLinks: { create: { guardianId: guardian.id, relationship: input.guardian.relationship, isPrimary: true } },
      }, include: { center: true, guardianLinks: { include: { guardian: true } } } });
      await tx.auditLog.create({ data: { id: randomUUID(), actorId: session.id, action: "child.created", entityType: "Child", entityId: id, scopeCenterId: input.centerId, metadata: { source: "api" } } });
      await recordIdempotency(tx, session.id, idempotencyKey, "child.create", id);
      return child;
    });
  } catch (error) {
    if (idempotencyKey) {
      const existing = await assertIdempotency(session.id, idempotencyKey, "child.create");
      if (existing) return prisma.child.findUniqueOrThrow({ where: { id: existing } });
    }
    throw error;
  }
}

export async function getDatabaseChildProfile(session: SessionUser, childId: string) {
  const child = await prisma.child.findFirst({ where: { id: childId, ...childScopeWhere(session) }, include: {
    center: true, assignedWorker: { select: { id: true, name: true } }, guardianLinks: { include: { guardian: true } },
    observations: { orderBy: { observedAt: "desc" } }, assessments: { orderBy: { assessedAt: "desc" }, include: { milestone: true } },
    growthMeasurements: { orderBy: { measuredAt: "asc" } }, risks: true, recommendations: true, reports: true,
  } });
  if (!child) throw new ApiError(404, "CHILD_NOT_FOUND", "Child record not found.");
  return child;
}

export async function createDatabaseObservation(session: SessionUser, input: {
  childId: string; observedAt: string; method: "TEXT" | "VOICE" | "PHOTO"; observationLanguage: "en" | "hi" | "mr";
  domain: "PHYSICAL" | "COGNITIVE" | "LANGUAGE" | "SOCIAL" | "EMOTIONAL"; activityContext: string; observationText: string;
  workerNotes: string; followUpRequired: boolean; reviewStatus: "DRAFT" | "REVIEW_PENDING" | "VERIFIED"; attachmentIds: string[];
  milestoneAssessments: Array<{ milestoneId: string; status: AssessmentStatus; notes: string }>;
}, idempotencyKey: string | null) {
  const child = await prisma.child.findFirst({ where: { id: input.childId, ...childScopeWhere(session) } });
  if (!child) throw new ApiError(404, "CHILD_NOT_FOUND", "Child record not found.");
  const existingId = await assertIdempotency(session.id, idempotencyKey, "observation.create");
  if (existingId) return prisma.observation.findUniqueOrThrow({ where: { id: existingId }, include: { assessments: true } });
  const now = new Date(input.observedAt);
  if (Number.isNaN(now.getTime()) || now.getTime() > Date.now() + 5 * 60_000) throw new ApiError(422, "INVALID_OBSERVED_AT", "Observation date must be valid and cannot be in the future.");
  const id = randomUUID();
  return prisma.$transaction(async (tx) => {
    const attachments = input.attachmentIds.length ? await tx.attachmentRecord.findMany({ where: { id: { in: input.attachmentIds }, childId: input.childId, uploadedById: session.id } }) : [];
    if (attachments.length !== input.attachmentIds.length) throw new ApiError(422, "INVALID_ATTACHMENT", "One or more attachments are unavailable for this child.");
    const observation = await tx.observation.create({ data: {
      id, childId: input.childId, createdById: session.id, observedAt: now, method: input.method, observationLanguage: input.observationLanguage,
      domain: input.domain, activityContext: input.activityContext, observationText: input.observationText, originalText: input.observationText,
      workerNotes: input.workerNotes, followUpRequired: input.followUpRequired, reviewStatus: input.reviewStatus, attachmentIds: input.attachmentIds,
      assessments: { create: input.milestoneAssessments.map((assessment) => ({ id: randomUUID(), childId: input.childId, milestoneId: assessment.milestoneId, assessedById: session.id, assessedAt: now, status: assessment.status, notes: assessment.notes })) },
    }, include: { assessments: true } });
    await tx.child.update({ where: { id: input.childId }, data: { updatedAt: new Date() } });
    if (input.followUpRequired) await tx.followUp.create({ data: { id: randomUUID(), childId: input.childId, observationId: id, assignedToId: child.assignedWorkerId, priority: "NORMAL" } });
    await tx.auditLog.create({ data: { id: randomUUID(), actorId: session.id, action: "observation.created", entityType: "Observation", entityId: id, scopeCenterId: child.centerId, metadata: { domain: input.domain, method: input.method } } });
    await notifyChildStakeholders(tx, { actorId: session.id, childId: child.id, centerId: child.centerId, type: "OBSERVATION_CREATED", title: "New observation recorded", body: `${child.fullName}: a ${input.domain.toLowerCase()} observation was recorded.` });
    await recordIdempotency(tx, session.id, idempotencyKey, "observation.create", id);
    return observation;
  });
}

export async function listDatabaseObservations(session: SessionUser, childId?: string) {
  const where: Prisma.ObservationWhereInput = childId
    ? { childId, child: childScopeWhere(session) }
    : { child: childScopeWhere(session) };
  return prisma.observation.findMany({ where, include: { assessments: true, child: { select: { id: true, fullName: true, internalId: true } } }, orderBy: { observedAt: "desc" }, take: 500 });
}

export async function updateDatabaseObservation(session: SessionUser, id: string, updates: {
  observationText?: string; activityContext?: string; workerNotes?: string; reviewStatus?: "DRAFT" | "REVIEW_PENDING" | "VERIFIED";
}, expectedUpdatedAt?: string, expectedChildId?: string) {
  const existing = await prisma.observation.findFirst({ where: { id, ...(expectedChildId ? { childId: expectedChildId } : {}), child: childScopeWhere(session) }, include: { child: true } });
  if (!existing) throw new ApiError(404, "OBSERVATION_NOT_FOUND", "Observation not found.");
  if (expectedUpdatedAt && existing.updatedAt.toISOString() !== expectedUpdatedAt) throw new ApiError(412, "VERSION_CONFLICT", "Observation changed; reload before saving.");
  return prisma.$transaction(async (tx) => {
    const saved = await tx.observation.update({ where: { id }, data: { ...updates, ...(updates.observationText ? { originalText: existing.originalText ?? existing.observationText } : {}) } });
    await tx.child.update({ where: { id: existing.childId }, data: { updatedAt: new Date() } });
    await tx.auditLog.create({ data: { actorId: session.id, action: "observation.updated", entityType: "Observation", entityId: id, scopeCenterId: existing.child.centerId, metadata: { fields: Object.keys(updates) } } });
    return saved;
  });
}

export async function updateDatabaseChild(session: SessionUser, id: string, updates: {
  fullName?: string; dateOfBirth?: string; gender?: "FEMALE" | "MALE" | "OTHER" | "UNSPECIFIED"; primaryLanguage?: AppLocale;
}, expectedUpdatedAt?: string) {
  if (session.role === "PARENT" || session.role === "WORKER") throw new ApiError(403, "FORBIDDEN", "Your role cannot update child profiles.");
  if (updates.dateOfBirth) {
    const dateOfBirth = new Date(`${updates.dateOfBirth}T00:00:00.000Z`);
    if (!Number.isFinite(dateOfBirth.getTime()) || dateOfBirth > new Date()) throw new ApiError(422, "INVALID_DATE_OF_BIRTH", "Date of birth must be a valid date that is not in the future.");
  }
  const existing = await prisma.child.findFirst({ where: { id, ...childScopeWhere(session) } });
  if (!existing) throw new ApiError(404, "CHILD_NOT_FOUND", "Child record not found.");
  if (expectedUpdatedAt && existing.updatedAt.toISOString() !== expectedUpdatedAt) throw new ApiError(412, "VERSION_CONFLICT", "Child changed; reload before saving.");
  return prisma.$transaction(async (tx) => {
    const saved = await tx.child.update({ where: { id }, data: { ...updates, ...(updates.dateOfBirth ? { dateOfBirth: new Date(`${updates.dateOfBirth}T00:00:00.000Z`) } : {}) } });
    await tx.auditLog.create({ data: { actorId: session.id, action: "child.updated", entityType: "Child", entityId: id, scopeCenterId: existing.centerId, metadata: { fields: Object.keys(updates) } } });
    return saved;
  });
}

export async function createDatabaseMilestoneAssessment(session: SessionUser, childId: string, input: {
  milestoneId: string; status: AssessmentStatus; notes: string;
}) {
  const child = await prisma.child.findFirst({ where: { id: childId, ...childScopeWhere(session) } });
  if (!child) throw new ApiError(404, "CHILD_NOT_FOUND", "Child record not found.");
  const milestone = await prisma.milestoneDefinition.findFirst({ where: { id: input.milestoneId, active: true } });
  if (!milestone) throw new ApiError(422, "INVALID_MILESTONE", "Milestone is inactive or does not exist.");
  return prisma.$transaction(async (tx) => {
    const record = await tx.milestoneAssessment.create({ data: { id: randomUUID(), childId, milestoneId: input.milestoneId, assessedById: session.id, assessedAt: new Date(), status: input.status, notes: input.notes } });
    await tx.auditLog.create({ data: { actorId: session.id, action: "milestone.assessed", entityType: "MilestoneAssessment", entityId: record.id, scopeCenterId: child.centerId, metadata: { status: input.status } } });
    await notifyChildStakeholders(tx, { actorId: session.id, childId: child.id, centerId: child.centerId, type: "MILESTONE_UPDATED", title: "Milestone updated", body: `${child.fullName}: a developmental milestone was updated.` });
    return record;
  });
}

export async function databaseAnalytics(session: SessionUser, from?: Date, to?: Date) {
  const scope = childScopeWhere(session);
  const children = await prisma.child.findMany({ where: scope, select: { id: true, dateOfBirth: true, centerId: true, gender: true } });
  const ids = children.map((child) => child.id);
  const dateWhere = from || to ? { gte: from, lte: to } : undefined;
  const [observations, assessments, growth, followUpRows, activeRiskRows] = await prisma.$transaction([
    prisma.observation.findMany({ where: { childId: { in: ids }, ...(dateWhere ? { observedAt: dateWhere } : {}) }, select: { observedAt: true, domain: true, followUpRequired: true } }),
    prisma.milestoneAssessment.findMany({ where: { childId: { in: ids }, ...(dateWhere ? { assessedAt: dateWhere } : {}) }, include: { milestone: { select: { domain: true, active: true, minAgeMonths: true, maxAgeMonths: true } } } }),
    prisma.growthMeasurement.findMany({ where: { childId: { in: ids }, ...(dateWhere ? { measuredAt: dateWhere } : {}) }, orderBy: { measuredAt: "asc" }, select: { childId: true, measuredAt: true, heightCm: true, weightKg: true, verificationStatus: true } }),
    prisma.followUp.findMany({ where: { childId: { in: ids }, status: { in: ["OPEN", "IN_PROGRESS"] } }, select: { childId: true } }),
    prisma.riskAssessment.findMany({ where: { childId: { in: ids }, reviewRequired: true, ...(dateWhere ? { createdAt: dateWhere } : {}) }, select: { childId: true, level: true } }),
  ]);
  const domains = ["PHYSICAL", "COGNITIVE", "LANGUAGE", "SOCIAL", "EMOTIONAL"] as const;
  const domainAssessments = domains.map((domain) => {
    const applicable = assessments.filter((item) => item.milestone.domain === domain).map((item) => ({
      status: item.status, active: item.milestone.active, minAgeMonths: item.milestone.minAgeMonths, maxAgeMonths: item.milestone.maxAgeMonths,
      dateOfBirth: children.find((child) => child.id === item.childId)?.dateOfBirth ?? new Date(0), assessedAt: item.assessedAt,
    }));
    return { domain, ...milestoneCompletion(applicable), definition: "Achieved / assessed milestones applicable to age at assessment; NOT_OBSERVED, NOT_ASSESSED and NOT_APPLICABLE are excluded. This is not a clinical development score." };
  });
  const today = new Date();
  const ageGroups = [
    { label: "0–2 years", min: 0, max: 24 }, { label: "2–3 years", min: 24, max: 36 },
    { label: "3–4 years", min: 36, max: 48 }, { label: "4–5 years", min: 48, max: 60 }, { label: "5+ years", min: 60, max: Infinity },
  ].map((group) => ({ label: group.label, count: children.filter((child) => { const months = ageInMonthsAt(child.dateOfBirth, today); return months >= group.min && months < group.max; }).length }));
  const highRiskChildren = new Set(activeRiskRows.filter((row) => row.level === "HIGH").map((row) => row.childId));
  const moderateRiskChildren = new Set(activeRiskRows.filter((row) => row.level !== "HIGH").map((row) => row.childId));
  const followUpChildren = new Set(followUpRows.map((row) => row.childId));
  const needsSupport = new Set([...moderateRiskChildren, ...followUpChildren]);
  for (const id of highRiskChildren) needsSupport.delete(id);
  const flagged = new Set([...highRiskChildren, ...needsSupport]);
  const domainObservationCounts = domains.map((domain) => ({ domain, count: observations.filter((row) => row.domain === domain).length }));
  const weekStart = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
  const observationWeekWhere = { gte: from && from > weekStart ? from : weekStart, ...(to ? { lte: to } : {}) };
  const observationsThisWeek = await prisma.observation.count({ where: { childId: { in: ids }, observedAt: observationWeekWhere } });
  return {
    childrenCount: children.length, observationCount: observations.length, observationsThisWeek, openFollowUps: followUpChildren.size,
    domainAssessments, observationTrends: groupObservationCounts(observations), growthHistory: growth, ageGroups,
    genderCounts: { boys: children.filter((child) => child.gender === "MALE").length, girls: children.filter((child) => child.gender === "FEMALE").length, other: children.filter((child) => child.gender !== "MALE" && child.gender !== "FEMALE").length },
    riskSummary: { high: highRiskChildren.size, needsSupport: needsSupport.size, noActiveFlag: Math.max(0, children.length - flagged.size), definition: "Counts active risk flags and open follow-ups. No active flag is not a clinical assessment." },
    domainObservationCounts, generatedAt: new Date().toISOString(), filters: { from: from?.toISOString() ?? null, to: to?.toISOString() ?? null },
  };
}

export async function databaseDashboard(session: SessionUser) {
  const children = await prisma.child.findMany({
    where: childScopeWhere(session),
    include: {
      center: true,
      risks: { where: { reviewRequired: true } },
      followUps: { where: { status: { in: ["OPEN", "IN_PROGRESS"] } } },
      guardianLinks: { include: { guardian: { select: { linkedUserId: true } } } },
    },
  });
  const childIds = children.map(({ id }) => id);
  const centerIds = [...new Set(children.map(({ centerId }) => centerId))];
  const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
  const [observationsThisWeek, pendingReview, recentObservations, milestoneReviews, centers, workers, auditLogs] = await prisma.$transaction([
    prisma.observation.count({ where: { childId: { in: childIds }, observedAt: { gte: weekAgo } } }),
    prisma.observation.count({ where: { childId: { in: childIds }, reviewStatus: "REVIEW_PENDING" } }),
    prisma.observation.findMany({ where: { childId: { in: childIds } }, include: { child: true }, orderBy: { observedAt: "desc" }, take: 5 }),
    prisma.milestoneAssessment.findMany({ where: { childId: { in: childIds }, status: { not: "MET" } }, orderBy: { assessedAt: "desc" }, take: 5 }),
    prisma.center.findMany({ where: session.role === "DISTRICT_ADMIN" ? { active: true } : { id: { in: session.centerIds } } }),
    prisma.user.findMany({ where: { role: "WORKER", active: true }, select: { id: true, centerIds: true } }),
    prisma.auditLog.findMany({ where: { scopeCenterId: { in: centerIds } }, orderBy: { createdAt: "desc" }, take: 6 }),
  ]);
  const followUpChildIds = new Set(children.filter((child) => child.followUps.length > 0).map(({ id }) => id));
  const attentionChildren = children.filter((child) => child.followUps.length > 0 || child.risks.length > 0).map((child) => ({
    child,
    risks: [
      ...child.risks,
      ...child.followUps.map((followUp) => ({ id: followUp.id, childId: child.id, level: followUp.priority === "HIGH" ? "HIGH" : "MODERATE", title: "Follow-up requested", explanation: `Follow-up status: ${followUp.status}`, sourceObservationId: followUp.observationId, sourceMilestoneId: null, reviewRequired: true, createdAt: followUp.createdAt, updatedAt: followUp.updatedAt })),
    ],
  }));
  const domainOverview = ["PHYSICAL", "COGNITIVE", "LANGUAGE", "SOCIAL", "EMOTIONAL"].map((domain) => ({ domain, count: 0 }));
  const domainCounts = await prisma.observation.groupBy({ by: ["domain"], where: { childId: { in: childIds } }, _count: { _all: true } });
  for (const item of domainOverview) item.count = domainCounts.find(({ domain }) => domain === item.domain)?._count._all ?? 0;
  const parentIds = [...new Set(children.flatMap((child) => child.guardianLinks.map((link) => link.guardian.linkedUserId).filter((id): id is string => Boolean(id))))];
  const activeParents = parentIds.length ? await prisma.user.count({ where: { id: { in: parentIds }, active: true, role: "PARENT" } }) : 0;
  const visibleCenterIds = new Set(centers.map(({ id }) => id));
  const activeWorkers = workers.filter((worker) => Array.isArray(worker.centerIds) && worker.centerIds.some((centerId) => typeof centerId === "string" && visibleCenterIds.has(centerId))).length;
  const centerStats = centers.map((center) => {
    const scoped = children.filter((child) => child.centerId === center.id);
    return { centerId: center.id, centerName: center.name, totalChildren: scoped.length, followUpChildren: scoped.filter((child) => followUpChildIds.has(child.id) || child.risks.length > 0).length };
  });
  return {
    totalChildren: children.length,
    followUpChildren: attentionChildren.length,
    observationsThisWeek,
    pendingReview,
    domainOverview,
    recentObservations,
    upcomingMilestoneReviews: milestoneReviews,
    attentionChildren,
    centerStats,
    totalCenters: centers.length,
    activeWorkers,
    registeredParents: activeParents,
    auditLogs,
  };
}

export async function listDatabaseMessages(session: SessionUser, childId: string) {
  requireDatabaseMode();
  const scope = await childScopeWhere(session);
  const child = await prisma.child.findFirst({ where: { id: childId, ...scope }, select: { id: true } });
  if (!child) throw new ApiError(404, "CHILD_NOT_FOUND", "Child not found.");
  return prisma.message.findMany({ where: { childId }, orderBy: { createdAt: "asc" } });
}

export async function createDatabaseMessage(session: SessionUser, input: { childId: string; locale: AppLocale; subject: string; body: string }) {
  requireDatabaseMode();
  const scope = await childScopeWhere(session);
  const child = await prisma.child.findFirst({ where: { id: input.childId, ...scope }, include: { guardianLinks: { include: { guardian: { include: { linkedUser: true } } } }, assignedWorker: true } });
  if (!child) throw new ApiError(404, "CHILD_NOT_FOUND", "Child not found.");
  const parent = child.guardianLinks.find((link) => link.isPrimary)?.guardian.linkedUser ?? child.guardianLinks[0]?.guardian.linkedUser;
  const worker = child.assignedWorker;
  const recipient = session.role === "PARENT" ? worker : parent;
  if (!recipient) throw new ApiError(409, "RECIPIENT_UNAVAILABLE", "No conversation recipient is assigned to this child.");
  return prisma.$transaction(async (tx) => {
    const message = await tx.message.create({ data: {
      childId: child.id, fromUserId: session.id, toUserId: recipient.id,
      direction: session.role === "PARENT" ? "PARENT_TO_WORKER" : "WORKER_TO_PARENT",
      locale: input.locale, subject: input.subject, body: input.body,
    } });
    await notifyUser(tx, { recipientId: recipient.id, childId: child.id, type: "MESSAGE_RECEIVED", title: "New message", body: `${child.fullName}: ${input.subject}` });
    return message;
  });
}

export async function listDatabaseRecommendations(session: SessionUser, childId: string) {
  requireDatabaseMode();
  const scope = await childScopeWhere(session);
  if (!await prisma.child.findFirst({ where: { id: childId, ...scope }, select: { id: true } })) throw new ApiError(404, "CHILD_NOT_FOUND", "Child not found.");
  return prisma.recommendation.findMany({ where: { childId }, orderBy: { createdAt: "desc" } });
}

export async function createDatabaseRecommendation(session: SessionUser, input: { childId: string; locale: AppLocale; title: string; description: string; approvedForParent: boolean }) {
  requireDatabaseMode();
  const scope = await childScopeWhere(session);
  if (!await prisma.child.findFirst({ where: { id: input.childId, ...scope }, select: { id: true } })) throw new ApiError(404, "CHILD_NOT_FOUND", "Child not found.");
  return prisma.recommendation.create({ data: { ...input, createdById: session.id, status: input.approvedForParent ? "APPROVED" : "PENDING" } });
}

export async function createAggregateObservationForecast(session: SessionUser) {
  requireDatabaseMode();
  if (session.role === "PARENT") throw new ApiError(403, "FORBIDDEN", "Aggregate model operations are not available to parent accounts.");
  const artifact = process.env.ML_MODEL_PATH;
  if (!artifact) throw new ApiError(503, "MODEL_NOT_CONFIGURED", "No evaluated model artifact is configured. Training has not been performed.");
  try { await access(artifact); } catch { throw new ApiError(503, "MODEL_ARTIFACT_MISSING", "The configured evaluated model artifact does not exist. No prediction was generated."); }
  const verifiedEvaluation = await loadVerifiedModelEvaluation(artifact);
  if (!verifiedEvaluation) throw new ApiError(503, "MODEL_EVALUATION_INVALID", "The configured artifact does not have matching verified SQLite evaluation metadata. No prediction was generated.");
  const records = await getScopedMonthlyObservationCounts(session);
  if (!records.length) throw new ApiError(422, "INSUFFICIENT_HISTORY", "No observations are available; no prediction was generated.");
  if (records.length < 24) throw new ApiError(422, "INSUFFICIENT_HISTORY", `Forecast requires 24 consecutive calendar months; available: ${records.length}. No prediction was generated.`);
  const directory = await mkdtemp(path.join(tmpdir(), "balsathi-forecast-"));
  try {
    const csv = path.join(directory, "monthly_counts.csv");
    await writeFile(csv, `month,count\n${records.map((row) => `${row.month},${row.count}`).join("\n")}\n`, { mode: 0o600 });
    const script = path.resolve(process.cwd(), "ml", "predict.py");
    const { stdout } = await promisify(execFile)(process.env.PYTHON_BIN ?? "python3", [script, csv, "--artifact", artifact], { timeout: 15_000, maxBuffer: 64_000 });
    const prediction = JSON.parse(stdout) as { model_version: string; input_data_cutoff: string; training_data_cutoff: string; predicted_count: number; month: string; prediction_type: string; data_source: string; evaluation: Record<string, unknown>; confidence: null; note: string };
    const latestInputMonth = records.at(-1)?.month;
    const expectedForecastMonth = latestInputMonth ? new Date(`${latestInputMonth}-01T00:00:00.000Z`) : new Date(0);
    expectedForecastMonth.setUTCMonth(expectedForecastMonth.getUTCMonth() + 1);
    const expectedMonth = `${expectedForecastMonth.getUTCFullYear()}-${String(expectedForecastMonth.getUTCMonth() + 1).padStart(2, "0")}`;
    if (prediction.data_source !== "sqlite_aggregate_export" || prediction.prediction_type !== "aggregate_monthly_observation_volume"
      || prediction.model_version !== verifiedEvaluation.model_version || prediction.training_data_cutoff !== verifiedEvaluation.data_cutoff
      || prediction.input_data_cutoff !== latestInputMonth || prediction.month !== expectedMonth
      || !Number.isFinite(prediction.predicted_count) || prediction.predicted_count < 0
      || !/^\d{4}-\d{2}$/.test(prediction.month) || !/^\d{4}-\d{2}$/.test(prediction.input_data_cutoff)
      || !/^\d{4}-\d{2}$/.test(prediction.training_data_cutoff) || prediction.confidence !== null) {
      throw new ApiError(503, "INVALID_MODEL_OUTPUT", "The forecast model returned an invalid response; no prediction was saved.");
    }
    const inputCutoff = new Date(`${prediction.input_data_cutoff}-01T00:00:00.000Z`);
    const scopeCenterIds = session.role === "DISTRICT_ADMIN" ? [...new Set((await prisma.child.findMany({ where: childScopeWhere(session), select: { centerId: true } })).map((item) => item.centerId))] : session.centerIds;
    const row = await prisma.mLPrediction.create({ data: { childId: null, scopeCenterIds, modelName: "aggregate_observation_volume", modelVersion: prediction.model_version, predictionType: prediction.prediction_type, predictionValue: prediction as unknown as Prisma.InputJsonValue, confidenceValue: null, inputDataCutoff: inputCutoff, modelArtifactVersion: prediction.model_version, explanation: { methodology: "Chronological holdout validated; aggregate count only", note: prediction.note, evaluation: prediction.evaluation as Prisma.InputJsonValue, trainingDataCutoff: prediction.training_data_cutoff, artifactEvaluationMetadata: verifiedEvaluation as Prisma.InputJsonValue }, reviewStatus: "GENERATED" } });
    await prisma.auditLog.create({ data: { actorId: session.id, action: "prediction.generated", entityType: "MLPrediction", entityId: row.id, metadata: { modelVersion: row.modelVersion, predictionType: row.predictionType } } });
    return row;
  } catch (error) {
    if (error instanceof ApiError) throw error;
    throw new ApiError(503, "MODEL_INFERENCE_FAILED", "The evaluated forecast model could not produce a prediction.");
  } finally { await rm(directory, { recursive: true, force: true }); }
}

export async function getAggregateForecastDashboard(session: SessionUser) {
  requireDatabaseMode();
  if (session.role === "PARENT" || session.role === "WORKER") throw new ApiError(403, "FORBIDDEN", "Forecast data is available to center and district administrators only.");
  const history = await getScopedMonthlyObservationCounts(session);
  const scopeCenterIds = session.role === "DISTRICT_ADMIN"
    ? [...new Set((await prisma.child.findMany({ where: childScopeWhere(session), select: { centerId: true } })).map(({ centerId }) => centerId))]
    : session.centerIds;
  const allRows = await prisma.mLPrediction.findMany({ where: { predictionType: "aggregate_monthly_observation_volume" }, orderBy: { generatedAt: "desc" } });
  const rows = allRows.filter((row) => {
    const rowScope = Array.isArray(row.scopeCenterIds) ? row.scopeCenterIds.map(String) : [];
    return rowScope.length > 0 && rowScope.every((centerId) => scopeCenterIds.includes(centerId));
  }).slice(0, 30);
  const artifact = process.env.ML_MODEL_PATH;
  let evaluation: Record<string, unknown> | null = null;
  if (artifact) evaluation = await loadVerifiedModelEvaluation(artifact);
  const forecasts = evaluation ? rows.filter((row) => {
    const value = row.predictionValue as Record<string, unknown>;
    const explanation = row.explanation as Record<string, unknown>;
    const metadata = explanation.artifactEvaluationMetadata as Record<string, unknown> | undefined;
    return value.data_source === "sqlite_aggregate_export" && value.prediction_type === "aggregate_monthly_observation_volume"
      && row.modelVersion === evaluation.model_version && metadata?.artifact_sha256 === evaluation.artifact_sha256;
  }) : [];
  const response = forecastDashboardSchema.safeParse({ history, forecasts, evaluation, historyMonths: history.length });
  if (!response.success) throw new ApiError(503, "FORECAST_RESPONSE_INVALID", "Stored forecast data failed response validation.");
  return response.data;
}

export async function getForecastModelReadiness(): Promise<"not_configured" | "artifact_missing" | "evaluation_invalid" | "verified"> {
  const artifact = process.env.ML_MODEL_PATH;
  if (!artifact) return "not_configured";
  try { await access(artifact); } catch { return "artifact_missing"; }
  return await loadVerifiedModelEvaluation(artifact) ? "verified" : "evaluation_invalid";
}

/** Fetch only observation timestamps in the caller's active child scope, then group using UTC month boundaries. */
export async function getScopedMonthlyObservationCounts(session: SessionUser) {
  const observations = await prisma.observation.findMany({
    where: { child: { active: true, ...(session.role === "DISTRICT_ADMIN" ? {} : { centerId: { in: session.centerIds } }) } },
    select: { observedAt: true },
    orderBy: { observedAt: "asc" },
  });
  return monthlyObservationCounts(observations.map(({ observedAt }) => observedAt));
}
