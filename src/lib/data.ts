import { appendAudit, getDemoStore, newId } from "./demo-store";
import type {
  AppLocale,
  MessageDirection,
  Observation,
  SessionUser,
  Child,
  GrowthMeasurement,
  MilestoneAssessment,
  Recommendation,
  RiskAssessment,
  User,
} from "./domain";
import { ageInMonths, isoNow } from "./utils";

type ChildFilterOptions = {
  q?: string;
  centerId?: string;
  status?: "all" | "follow-up" | "stable";
  ageGroup?: "all" | "0-2" | "2-4" | "4-6";
  sort?: "name" | "recent" | "age";
  page?: number;
  pageSize?: number;
};

type AddChildInput = {
  fullName: string;
  dateOfBirth: string;
  gender: Child["gender"];
  centerId: string;
  assignedWorkerId: string;
  primaryLanguage: AppLocale;
  emergencyContactName: string;
  emergencyContactPhone: string;
  guardian: {
    name: string;
    phone: string;
    preferredLanguage: AppLocale;
    relationship: "MOTHER" | "FATHER" | "GRANDPARENT" | "SIBLING" | "OTHER";
  };
};

type AddObservationInput = {
  childId: string;
  observedAt: string;
  method: Observation["method"];
  observationLanguage: AppLocale;
  domain: Observation["domain"];
  activityContext: string;
  observationText: string;
  workerNotes: string;
  aiTranscript?: string | null;
  aiExtractedSummary?: string | null;
  followUpRequired: boolean;
  reviewStatus: Observation["reviewStatus"];
  attachmentIds: string[];
  milestoneAssessments: Array<{
    milestoneId: string;
    status: MilestoneAssessment["status"];
    notes: string;
  }>;
};

export function getUserById(userId: string): User | undefined {
  return getDemoStore().users.find((user) => user.id === userId);
}

export function getAuthorizedChildren(session: SessionUser): Child[] {
  const data = getDemoStore();
  if (session.role === "DISTRICT_ADMIN" || session.role === "CENTER_ADMIN") {
    return data.children.filter((child) => session.centerIds.includes(child.centerId));
  }

  if (session.role === "WORKER") {
    return data.children.filter(
      (child) => child.assignedWorkerId === session.id || session.centerIds.includes(child.centerId),
    );
  }

  const guardianIds = data.guardians
    .filter((guardian) => guardian.linkedUserId === session.id)
    .map((guardian) => guardian.id);

  const childIds = data.childGuardians
    .filter((link) => guardianIds.includes(link.guardianId))
    .map((link) => link.childId);

  return data.children.filter((child) => childIds.includes(child.id));
}

export function assertChildAccess(session: SessionUser, childId: string): Child {
  const child = getAuthorizedChildren(session).find((record) => record.id === childId);
  if (!child) {
    throw new Error("NOT_FOUND");
  }
  return child;
}

function latestObservationForChild(childId: string): Observation | undefined {
  return getDemoStore()
    .observations
    .filter((observation) => observation.childId === childId)
    .sort((left, right) => right.observedAt.localeCompare(left.observedAt))[0];
}

function childRiskList(childId: string): RiskAssessment[] {
  return getDemoStore().riskAssessments.filter((risk) => risk.childId === childId);
}

function childRecommendations(childId: string): Recommendation[] {
  return getDemoStore().recommendations.filter((item) => item.childId === childId);
}

export function getChildrenDirectory(session: SessionUser, filters: ChildFilterOptions) {
  const data = getDemoStore();
  const page = filters.page ?? 1;
  const pageSize = filters.pageSize ?? 6;
  const q = filters.q?.toLowerCase().trim();

  let children = getAuthorizedChildren(session).map((child) => {
    const latestObservation = latestObservationForChild(child.id);
    const risks = childRiskList(child.id);
    return {
      ...child,
      ageMonths: ageInMonths(child.dateOfBirth),
      latestObservation,
      risks,
      center: data.centers.find((center) => center.id === child.centerId) ?? null,
      summary: childRecommendations(child.id)[0]?.title ?? "No active recommendation",
    };
  });

  if (q) {
    children = children.filter((child) =>
      [child.fullName, child.internalId, child.center?.name ?? ""].join(" ").toLowerCase().includes(q),
    );
  }
  if (filters.centerId) {
    children = children.filter((child) => child.centerId === filters.centerId);
  }
  if (filters.status === "follow-up") {
    children = children.filter((child) => child.risks.some((risk) => risk.reviewRequired));
  }
  if (filters.status === "stable") {
    children = children.filter((child) => child.risks.length === 0);
  }
  if (filters.ageGroup && filters.ageGroup !== "all") {
    children = children.filter((child) => {
      if (filters.ageGroup === "0-2") return child.ageMonths < 24;
      if (filters.ageGroup === "2-4") return child.ageMonths >= 24 && child.ageMonths < 48;
      return child.ageMonths >= 48 && child.ageMonths < 72;
    });
  }

  children.sort((left, right) => {
    if (filters.sort === "recent") {
      return (right.latestObservation?.observedAt ?? "").localeCompare(left.latestObservation?.observedAt ?? "");
    }
    if (filters.sort === "age") {
      return left.ageMonths - right.ageMonths;
    }
    return left.fullName.localeCompare(right.fullName);
  });

  const total = children.length;
  const paged = children.slice((page - 1) * pageSize, page * pageSize);

  return {
    items: paged,
    total,
    page,
    pageSize,
    pageCount: Math.max(1, Math.ceil(total / pageSize)),
  };
}

export function getChildProfile(session: SessionUser, childId: string) {
  const data = getDemoStore();
  const child = assertChildAccess(session, childId);
  const guardians = data.childGuardians
    .filter((link) => link.childId === childId)
    .map((link) => ({
      ...link,
      guardian: data.guardians.find((guardian) => guardian.id === link.guardianId) ?? null,
    }));
  const observations = data.observations
    .filter((observation) => observation.childId === childId)
    .sort((left, right) => right.observedAt.localeCompare(left.observedAt));
  const milestoneAssessments = data.milestoneAssessments
    .filter((assessment) => assessment.childId === childId)
    .sort((left, right) => right.assessedAt.localeCompare(left.assessedAt));
  const growth = data.growthMeasurements
    .filter((record) => record.childId === childId)
    .sort((left, right) => left.measuredAt.localeCompare(right.measuredAt));
  const risks = childRiskList(childId);
  const recommendations = childRecommendations(childId);
  const messages = data.messages
    .filter((message) => message.childId === childId)
    .sort((left, right) => right.createdAt.localeCompare(left.createdAt));
  const reports = data.reports.filter((report) => report.childId === childId);

  return {
    child,
    center: data.centers.find((center) => center.id === child.centerId) ?? null,
    assignedWorker: data.users.find((user) => user.id === child.assignedWorkerId) ?? null,
    guardians,
    observations,
    milestoneAssessments,
    milestoneDefinitions: data.milestoneDefinitions,
    growth,
    risks,
    recommendations,
    messages,
    reports,
  };
}

export function getDashboardData(session: SessionUser) {
  const data = getDemoStore();
  const children = getAuthorizedChildren(session);
  const childIds = new Set(children.map((child) => child.id));
  const observations = data.observations.filter((observation) => childIds.has(observation.childId));
  const recentObservations = observations
    .slice()
    .sort((left, right) => right.observedAt.localeCompare(left.observedAt))
    .slice(0, 5);
  const risks = data.riskAssessments.filter((risk) => childIds.has(risk.childId));
  const upcomingMilestoneReviews = data.milestoneAssessments
    .filter((assessment) => childIds.has(assessment.childId) && assessment.status !== "MET")
    .slice(0, 5);

  const domainOverview = (["PHYSICAL", "COGNITIVE", "LANGUAGE", "SOCIAL", "EMOTIONAL"] as const).map((domain) => ({
    domain,
    count: observations.filter((observation) => observation.domain === domain).length,
  }));

  const centerStats = data.centers
    .filter((center) => session.centerIds.includes(center.id) || session.role === "DISTRICT_ADMIN")
    .map((center) => {
      const centerChildren = children.filter((child) => child.centerId === center.id);
      return {
        centerName: center.name,
        totalChildren: centerChildren.length,
        followUpChildren: centerChildren.filter((child) => childRiskList(child.id).some((risk) => risk.reviewRequired)).length,
      };
    });

  return {
    totalChildren: children.length,
    followUpChildren: children.filter((child) => childRiskList(child.id).some((risk) => risk.reviewRequired)).length,
    observationsThisWeek: observations.filter((observation) => {
      const observed = new Date(observation.observedAt).getTime();
      return observed >= Date.now() - 1000 * 60 * 60 * 24 * 7;
    }).length,
    pendingSyncCount: 3,
    domainOverview,
    recentObservations,
    upcomingMilestoneReviews,
    attentionChildren: children
      .filter((child) => childRiskList(child.id).some((risk) => risk.reviewRequired))
      .map((child) => ({
        child,
        risks: childRiskList(child.id),
      })),
    centerStats,
    totalCenters: data.centers.length,
    activeWorkers: data.users.filter((user) => user.role === "WORKER" && user.active).length,
    registeredParents: data.users.filter((user) => user.role === "PARENT" && user.active).length,
    auditLogs: data.auditLogs.slice(-6).reverse(),
  };
}

export function addChild(session: SessionUser, input: AddChildInput) {
  const data = getDemoStore();
  const now = isoNow();
  const childId = newId("child");
  const guardianId = newId("guardian");
  const internalId = `BAL-${String(data.children.length + 1).padStart(4, "0")}`;

  const child: Child = {
    id: childId,
    internalId,
    fullName: input.fullName,
    dateOfBirth: input.dateOfBirth,
    gender: input.gender,
    centerId: input.centerId,
    assignedWorkerId: input.assignedWorkerId,
    enrollmentDate: now.slice(0, 10),
    profilePhotoPath: null,
    primaryLanguage: input.primaryLanguage,
    consentStatus: "PENDING",
    emergencyContactName: input.emergencyContactName,
    emergencyContactPhone: input.emergencyContactPhone,
    siblingIds: [],
    active: true,
    createdAt: now,
    updatedAt: now,
  };

  data.children.push(child);
  data.guardians.push({
    id: guardianId,
    name: input.guardian.name,
    phone: input.guardian.phone,
    preferredLanguage: input.guardian.preferredLanguage,
    address: "Added from worker registration form",
    linkedUserId: null,
    createdAt: now,
    updatedAt: now,
  });
  data.childGuardians.push({
    childId,
    guardianId,
    relationship: input.guardian.relationship,
    isPrimary: true,
  });
  appendAudit(data, {
    actorId: session.id,
    action: "child.created",
    entityType: "Child",
    entityId: childId,
    scopeCenterId: input.centerId,
    metadata: { demo: true },
  });

  return child;
}

function computeRiskLevel(observation: AddObservationInput): RiskAssessment | null {
  if (!observation.followUpRequired) return null;
  return {
    id: newId("risk"),
    childId: observation.childId,
    level: observation.reviewStatus === "VERIFIED" ? "LOW" : "MODERATE",
    title: "Follow-up required",
    explanation: "The latest observation was marked for follow-up and should be reviewed by an authorized worker. This is not a diagnosis.",
    sourceObservationId: "",
    sourceMilestoneId: observation.milestoneAssessments[0]?.milestoneId ?? null,
    reviewRequired: true,
    createdAt: isoNow(),
    updatedAt: isoNow(),
  };
}

export function addObservation(session: SessionUser, input: AddObservationInput) {
  const data = getDemoStore();
  const child = assertChildAccess(session, input.childId);
  const now = isoNow();

  const observation: Observation = {
    id: newId("observation"),
    childId: child.id,
    createdById: session.id,
    observedAt: input.observedAt,
    method: input.method,
    observationLanguage: input.observationLanguage,
    domain: input.domain,
    activityContext: input.activityContext,
    observationText: input.observationText,
    workerNotes: input.workerNotes,
    aiTranscript: input.aiTranscript ?? null,
    aiExtractedSummary: input.aiExtractedSummary ?? null,
    followUpRequired: input.followUpRequired,
    reviewStatus: input.reviewStatus,
    attachmentIds: input.attachmentIds,
    createdAt: now,
    updatedAt: now,
  };

  const assessments: MilestoneAssessment[] = input.milestoneAssessments.map((assessment) => ({
    id: newId("assessment"),
    childId: child.id,
    milestoneId: assessment.milestoneId,
    observationId: observation.id,
    assessedById: session.id,
    assessedAt: input.observedAt,
    status: assessment.status,
    notes: assessment.notes,
    createdAt: now,
    updatedAt: now,
  }));

  data.observations.push(observation);
  data.milestoneAssessments.push(...assessments);

  const risk = computeRiskLevel(input);
  if (risk) {
    risk.sourceObservationId = observation.id;
    data.riskAssessments.push(risk);
  }

  appendAudit(data, {
    actorId: session.id,
    action: "observation.created",
    entityType: "Observation",
    entityId: observation.id,
    scopeCenterId: child.centerId,
    metadata: { method: input.method, followUpRequired: input.followUpRequired },
  });

  return {
    observation,
    assessments,
    risk,
  };
}

export function addMessage(
  session: SessionUser,
  input: { childId: string; toUserId?: string; locale: AppLocale; subject: string; body: string },
) {
  const data = getDemoStore();
  const child = assertChildAccess(session, input.childId);
  const now = isoNow();
  let toUserId = input.toUserId;
  if (!toUserId) {
    if (session.role === "PARENT") {
      toUserId = child.assignedWorkerId;
    } else {
      const primaryGuardian = data.childGuardians.find((l) => l.childId === child.id && l.isPrimary);
      const guardian = primaryGuardian ? data.guardians.find((g) => g.id === primaryGuardian.guardianId) : undefined;
      toUserId = guardian?.linkedUserId ?? child.assignedWorkerId;
    }
  }
  const direction: MessageDirection = session.role === "PARENT" ? "PARENT_TO_WORKER" : "WORKER_TO_PARENT";
  const message = {
    id: newId("message"),
    childId: child.id,
    fromUserId: session.id,
    toUserId,
    direction,
    locale: input.locale,
    subject: input.subject,
    body: input.body,
    readAt: null,
    createdAt: now,
    updatedAt: now,
  };
  data.messages.push(message);
  appendAudit(data, {
    actorId: session.id,
    action: "message.sent",
    entityType: "Message",
    entityId: message.id,
    scopeCenterId: child.centerId,
    metadata: { childId: child.id },
  });
  return message;
}

export function buildChildSummary(childId: string): string {
  const data = getDemoStore();
  const child = data.children.find((record) => record.id === childId);
  if (!child) return "Child record not found.";
  const latestObservation = latestObservationForChild(childId);
  const risks = childRiskList(childId);
  const recommendation = childRecommendations(childId)[0];
  return [
    `${child.fullName} has ${latestObservation ? "a recent" : "no recent"} observation on record.`,
    latestObservation ? `Latest note: ${latestObservation.observationText}` : "No recent observation is available.",
    risks[0] ? `Current follow-up: ${risks[0].title}.` : "No active follow-up risk is recorded.",
    recommendation ? `Recommended next step: ${recommendation.title}.` : "No approved recommendation is available.",
  ].join(" ");
}

export function getAnalyticsSeries(session: SessionUser) {
  const children = getAuthorizedChildren(session);
  const data = getDemoStore();
  const childIds = new Set(children.map((child) => child.id));
  return [
    { month: "Jul", observations: 3, followUps: 1 },
    { month: "Aug", observations: 4, followUps: 1 },
    { month: "Sep", observations: 5, followUps: 2 },
    { month: "Oct", observations: data.observations.filter((record) => childIds.has(record.childId)).length, followUps: data.riskAssessments.filter((risk) => childIds.has(risk.childId)).length },
  ];
}

export function getGrowthSeries(session: SessionUser, childId: string): GrowthMeasurement[] {
  assertChildAccess(session, childId);
  return getDemoStore().growthMeasurements.filter((record) => record.childId === childId);
}

export function getMilestoneDefinitions() {
  return getDemoStore().milestoneDefinitions.filter((m) => m.active);
}

export function getChildMilestoneAssessments(session: SessionUser, childId: string) {
  assertChildAccess(session, childId);
  const data = getDemoStore();
  return data.milestoneAssessments
    .filter((a) => a.childId === childId)
    .sort((a, b) => b.assessedAt.localeCompare(a.assessedAt))
    .map((a) => ({
      ...a,
      milestone: data.milestoneDefinitions.find((m) => m.id === a.milestoneId) ?? null,
    }));
}

export function addMilestoneAssessment(
  session: SessionUser,
  input: { childId: string; milestoneId: string; status: MilestoneAssessment["status"]; notes: string },
) {
  const data = getDemoStore();
  const child = assertChildAccess(session, input.childId);
  const now = isoNow();
  const assessment: MilestoneAssessment = {
    id: newId("assessment"),
    childId: child.id,
    milestoneId: input.milestoneId,
    observationId: null,
    assessedById: session.id,
    assessedAt: now,
    status: input.status,
    notes: input.notes,
    createdAt: now,
    updatedAt: now,
  };
  data.milestoneAssessments.push(assessment);
  appendAudit(data, {
    actorId: session.id,
    action: "milestone.assessed",
    entityType: "MilestoneAssessment",
    entityId: assessment.id,
    scopeCenterId: child.centerId,
    metadata: { milestoneId: input.milestoneId, status: input.status },
  });
  return assessment;
}

export function getChildMessages(session: SessionUser, childId: string) {
  assertChildAccess(session, childId);
  return getDemoStore()
    .messages.filter((m) => m.childId === childId)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export function getChildRecommendations(session: SessionUser, childId: string) {
  assertChildAccess(session, childId);
  return getDemoStore().recommendations.filter((r) => r.childId === childId);
}

export function addRecommendation(
  session: SessionUser,
  input: {
    childId: string;
    locale: AppLocale;
    title: string;
    description: string;
    approvedForParent: boolean;
  },
) {
  const data = getDemoStore();
  const child = assertChildAccess(session, input.childId);
  const now = isoNow();
  const recommendation: Recommendation = {
    id: newId("recommendation"),
    childId: child.id,
    createdById: session.id,
    locale: input.locale,
    title: input.title,
    description: input.description,
    approvedForParent: input.approvedForParent,
    status: "ACTIVE",
    createdAt: now,
    updatedAt: now,
  };
  data.recommendations.push(recommendation);
  appendAudit(data, {
    actorId: session.id,
    action: "recommendation.created",
    entityType: "Recommendation",
    entityId: recommendation.id,
    scopeCenterId: child.centerId,
    metadata: { childId: child.id },
  });
  return recommendation;
}

export function getChildReports(session: SessionUser, childId: string) {
  assertChildAccess(session, childId);
  return getDemoStore().reports.filter((r) => r.childId === childId);
}

export function getChildrenReports(session: SessionUser) {
  const childIds = new Set(getAuthorizedChildren(session).map((c) => c.id));
  return getDemoStore().reports
    .filter((r) => r.childId && childIds.has(r.childId))
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export function generateReport(session: SessionUser, childId: string) {
  const data = getDemoStore();
  const child = assertChildAccess(session, childId);
  const now = isoNow();
  const observations = data.observations.filter((o) => o.childId === childId);
  const risks = data.riskAssessments.filter((r) => r.childId === childId);
  const recs = data.recommendations.filter((r) => r.childId === childId);
  const summary = `${child.fullName}'s development record contains ${observations.length} observation(s), ${risks.length} active follow-up flag(s), and ${recs.length} recommendation(s). This is a compiled summary, not a clinical diagnosis.`;
  const report = {
    id: newId("report"),
    childId: child.id,
    centerId: child.centerId,
    generatedById: session.id,
    title: `${child.fullName} - Progress Report`,
    periodLabel: "Current period",
    summary,
    createdAt: now,
    updatedAt: now,
  };
  data.reports.push(report);
  appendAudit(data, {
    actorId: session.id,
    action: "report.generated",
    entityType: "Report",
    entityId: report.id,
    scopeCenterId: child.centerId,
    metadata: { childId: child.id },
  });
  return report;
}

export function getCenters(session: SessionUser) {
  const data = getDemoStore();
  if (session.role === "DISTRICT_ADMIN") return data.centers;
  return data.centers.filter((c) => session.centerIds.includes(c.id));
}

export function getWorkers(session: SessionUser) {
  const data = getDemoStore();
  if (session.role === "DISTRICT_ADMIN") {
    return data.users.filter((u) => u.role === "WORKER");
  }
  return data.users.filter((u) => u.role === "WORKER" && u.centerIds.some((c) => session.centerIds.includes(c)));
}

export function getAuditLogs(session: SessionUser, limit = 50) {
  const data = getDemoStore();
  let logs = data.auditLogs;
  if (session.role !== "DISTRICT_ADMIN") {
    logs = logs.filter((l) => l.scopeCenterId && session.centerIds.includes(l.scopeCenterId));
  }
  return logs.slice(-limit).reverse();
}

export function getSystemStats(session: SessionUser) {
  const data = getDemoStore();
  const centers = getCenters(session);
  const centerIds = new Set(centers.map((c) => c.id));
  const children = data.children.filter((c) => centerIds.has(c.centerId));
  const childIds = new Set(children.map((c) => c.id));
  const workers = data.users.filter((u) => u.role === "WORKER" && u.centerIds.some((c) => centerIds.has(c)));
  const parents = data.users.filter((u) => u.role === "PARENT");
  const observations = data.observations.filter((o) => childIds.has(o.childId));
  const risks = data.riskAssessments.filter((r) => childIds.has(r.childId));
  const followUps = risks.filter((r) => r.reviewRequired).length;
  return {
    totalChildren: children.length,
    totalCenters: centers.length,
    activeWorkers: workers.filter((w) => w.active).length,
    registeredParents: parents.filter((p) => p.active).length,
    totalObservations: observations.length,
    followUpCount: followUps,
    verifiedObservations: observations.filter((o) => o.reviewStatus === "VERIFIED").length,
    pendingReview: observations.filter((o) => o.reviewStatus === "REVIEW_PENDING").length,
  };
}

export function addGrowthMeasurement(
  session: SessionUser,
  input: { childId: string; measuredAt: string; heightCm: number; weightKg: number; headCircumferenceCm: number | null; notes: string | null },
) {
  const data = getDemoStore();
  const child = assertChildAccess(session, input.childId);
  const now = isoNow();
  const measurement: GrowthMeasurement = {
    id: newId("growth"),
    childId: child.id,
    measuredAt: input.measuredAt,
    heightCm: input.heightCm,
    weightKg: input.weightKg,
    headCircumferenceCm: input.headCircumferenceCm,
    notes: input.notes,
    createdAt: now,
    updatedAt: now,
  };
  data.growthMeasurements.push(measurement);
  appendAudit(data, {
    actorId: session.id,
    action: "growth.recorded",
    entityType: "GrowthMeasurement",
    entityId: measurement.id,
    scopeCenterId: child.centerId,
    metadata: { childId: child.id },
  });
  return measurement;
}
