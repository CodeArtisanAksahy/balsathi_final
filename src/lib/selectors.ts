import type { DemoData, SessionUser, Child, DevelopmentDomain } from "./domain";
import { ageInMonths } from "./utils";

export function getAuthorizedChildren(state: DemoData, session: SessionUser): Child[] {
  if (session.role === "DISTRICT_ADMIN" || session.role === "CENTER_ADMIN") {
    return state.children.filter((child) => session.centerIds.includes(child.centerId));
  }
  if (session.role === "WORKER") {
    return state.children.filter(
      (child) => child.assignedWorkerId === session.id || session.centerIds.includes(child.centerId),
    );
  }
  // PARENT
  const guardianIds = state.guardians
    .filter((guardian) => guardian.linkedUserId === session.id)
    .map((guardian) => guardian.id);
  const childIds = state.childGuardians
    .filter((link) => guardianIds.includes(link.guardianId))
    .map((link) => link.childId);
  return state.children.filter((child) => childIds.includes(child.id));
}

export function getChildById(state: DemoData, childId: string): Child | undefined {
  return state.children.find((c) => c.id === childId);
}

export function getChildObservations(state: DemoData, childId: string) {
  return state.observations
    .filter((o) => o.childId === childId)
    .sort((a, b) => b.observedAt.localeCompare(a.observedAt));
}

export function getChildMilestoneAssessments(state: DemoData, childId: string) {
  return state.milestoneAssessments
    .filter((a) => a.childId === childId)
    .sort((a, b) => b.assessedAt.localeCompare(a.assessedAt))
    .map((a) => ({
      ...a,
      milestone: state.milestoneDefinitions.find((m) => m.id === a.milestoneId) ?? null,
    }));
}

export function getChildGrowth(state: DemoData, childId: string) {
  return state.growthMeasurements
    .filter((r) => r.childId === childId)
    .sort((a, b) => a.measuredAt.localeCompare(b.measuredAt));
}

export function getChildRisks(state: DemoData, childId: string) {
  return state.riskAssessments.filter((r) => r.childId === childId);
}

export function getChildRecommendations(state: DemoData, childId: string) {
  return state.recommendations.filter((r) => r.childId === childId);
}

export function getChildMessages(state: DemoData, childId: string) {
  return state.messages
    .filter((m) => m.childId === childId)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export function getChildReports(state: DemoData, childId: string) {
  return state.reports.filter((r) => r.childId === childId);
}

/**
 * Complete child profile with all related records.
 */
export function getChildProfile(state: DemoData, childId: string) {
  const child = state.children.find((c) => c.id === childId);
  if (!child) return null;
  const guardians = state.childGuardians
    .filter((link) => link.childId === childId)
    .map((link) => ({
      ...link,
      guardian: state.guardians.find((g) => g.id === link.guardianId) ?? null,
    }));
  const observations = getChildObservations(state, childId);
  const milestoneAssessments = state.milestoneAssessments
    .filter((a) => a.childId === childId)
    .sort((a, b) => b.assessedAt.localeCompare(a.assessedAt));
  const growth = getChildGrowth(state, childId);
  const risks = getChildRisks(state, childId);
  const recommendations = getChildRecommendations(state, childId);
  const messages = getChildMessages(state, childId);
  const reports = getChildReports(state, childId);

  return {
    child,
    center: state.centers.find((c) => c.id === child.centerId) ?? null,
    assignedWorker: state.users.find((u) => u.id === child.assignedWorkerId) ?? null,
    guardians,
    observations,
    milestoneAssessments,
    milestoneDefinitions: state.milestoneDefinitions,
    growth,
    risks,
    recommendations,
    messages,
    reports,
  };
}

export function getLatestObservation(state: DemoData, childId: string) {
  return getChildObservations(state, childId)[0];
}

/**
 * Get development domain scores (0-100) for a child based on milestone assessments.
 * Score = percentage of MET assessments out of all assessments in that domain.
 * Returns null if there are no assessments in a domain.
 */
export function getDomainProgress(state: DemoData, childId: string, domain: DevelopmentDomain): number | null {
  const domainMilestoneIds = new Set(
    state.milestoneDefinitions.filter((m) => m.domain === domain && m.active).map((m) => m.id),
  );
  const assessments = state.milestoneAssessments.filter(
    (a) => a.childId === childId && domainMilestoneIds.has(a.milestoneId) && !["NOT_OBSERVED", "NOT_ASSESSED", "NOT_APPLICABLE"].includes(a.status),
  );
  if (assessments.length === 0) return null;
  const met = assessments.filter((a) => a.status === "MET").length;
  return Math.round((met / assessments.length) * 100);
}

export function getAllDomainProgress(state: DemoData, childId: string) {
  const domains = ["PHYSICAL", "COGNITIVE", "LANGUAGE", "SOCIAL", "EMOTIONAL"] as const;
  return domains.map((domain) => ({
    domain,
    score: getDomainProgress(state, childId, domain),
  }));
}

/**
 * Get milestone statistics for a child: total, met, in_progress, needs_review, not_observed.
 */
export function getMilestoneStatistics(state: DemoData, childId: string) {
  const assessments = state.milestoneAssessments.filter((a) => a.childId === childId);
  const total = assessments.length;
  const met = assessments.filter((a) => a.status === "MET").length;
  const inProgress = assessments.filter((a) => a.status === "IN_PROGRESS").length;
  const needsReview = assessments.filter((a) => a.status === "NEEDS_REVIEW").length;
  const notObserved = assessments.filter((a) => a.status === "NOT_OBSERVED").length;
  const notAssessed = assessments.filter((a) => a.status === "NOT_ASSESSED").length;
  const notApplicable = assessments.filter((a) => a.status === "NOT_APPLICABLE").length;
  return { total, met, inProgress, needsReview, notObserved, notAssessed, notApplicable };
}

/**
 * Dashboard data derived from store state.
 */
export function getDashboardData(state: DemoData, session: SessionUser) {
  const children = getAuthorizedChildren(state, session);
  const childIds = new Set(children.map((c) => c.id));
  const observations = state.observations.filter((o) => childIds.has(o.childId));
  const recentObservations = observations
    .slice()
    .sort((a, b) => b.observedAt.localeCompare(a.observedAt))
    .slice(0, 5);
  const risks = state.riskAssessments.filter((r) => childIds.has(r.childId));
  const upcomingMilestoneReviews = state.milestoneAssessments
    .filter((a) => childIds.has(a.childId) && a.status !== "MET")
    .slice(0, 5);

  const domainOverview = (["PHYSICAL", "COGNITIVE", "LANGUAGE", "SOCIAL", "EMOTIONAL"] as const).map((domain) => ({
    domain,
    count: observations.filter((o) => o.domain === domain).length,
  }));

  const centerStats = state.centers
    .filter((c) => session.centerIds.includes(c.id) || session.role === "DISTRICT_ADMIN")
    .map((center) => {
      const centerChildren = children.filter((c) => c.centerId === center.id);
      return {
        centerName: center.name,
        totalChildren: centerChildren.length,
        followUpChildren: centerChildren.filter((c) =>
          getChildRisks(state, c.id).some((r) => r.reviewRequired),
        ).length,
      };
    });

  const attentionChildren = children
    .filter((c) => getChildRisks(state, c.id).some((r) => r.reviewRequired))
    .map((child) => ({ child, risks: getChildRisks(state, child.id) }));

  return {
    totalChildren: children.length,
    followUpChildren: attentionChildren.length,
    observationsThisWeek: observations.filter((o) => {
      const observed = new Date(o.observedAt).getTime();
      return observed >= Date.now() - 1000 * 60 * 60 * 24 * 7;
    }).length,
    pendingSyncCount: state.observations.filter((o) => o.reviewStatus === "DRAFT").length,
    domainOverview,
    recentObservations,
    upcomingMilestoneReviews,
    attentionChildren,
    centerStats,
    totalCenters: state.centers.length,
    activeWorkers: state.users.filter((u) => u.role === "WORKER" && u.active).length,
    registeredParents: state.users.filter((u) => u.role === "PARENT" && u.active).length,
    auditLogs: state.auditLogs.slice(-6).reverse(),
  };
}

/**
 * Observation trend data grouped by month.
 */
export function getObservationTrends(state: DemoData, session: SessionUser, months = 6) {
  const children = getAuthorizedChildren(state, session);
  const childIds = new Set(children.map((c) => c.id));
  const observations = state.observations.filter((o) => childIds.has(o.childId));

  const now = new Date();
  const result = [];
  for (let i = months - 1; i >= 0; i--) {
    const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const monthLabel = date.toLocaleDateString("en", { month: "short" });
    const monthStart = date.getTime();
    const monthEnd = new Date(now.getFullYear(), now.getMonth() - i + 1, 1).getTime();
    const monthObs = observations.filter((o) => {
      const t = new Date(o.observedAt).getTime();
      return t >= monthStart && t < monthEnd;
    });
    const followUps = monthObs.filter((o) => o.followUpRequired).length;
    result.push({ month: monthLabel, observations: monthObs.length, followUps });
  }
  return result;
}

/**
 * Age group distribution of authorized children.
 */
export function getAgeGroupDistribution(state: DemoData, session: SessionUser) {
  const children = getAuthorizedChildren(state, session);
  const groups = [
    { label: "0-2 years", min: 0, max: 24, count: 0 },
    { label: "2-3 years", min: 24, max: 36, count: 0 },
    { label: "3-4 years", min: 36, max: 48, count: 0 },
    { label: "4-5 years", min: 48, max: 60, count: 0 },
    { label: "5-6 years", min: 60, max: 72, count: 0 },
  ];
  for (const child of children) {
    const months = ageInMonths(child.dateOfBirth);
    for (const g of groups) {
      if (months >= g.min && months < g.max) {
        g.count++;
        break;
      }
    }
  }
  return groups;
}

/**
 * Center-wise statistics.
 */
export function getCenterStatistics(state: DemoData, session: SessionUser) {
  const children = getAuthorizedChildren(state, session);
  return state.centers
    .filter((c) => session.centerIds.includes(c.id) || session.role === "DISTRICT_ADMIN")
    .map((center) => {
      const centerChildren = children.filter((c) => c.centerId === center.id);
      const childIds = new Set(centerChildren.map((c) => c.id));
      const observations = state.observations.filter((o) => childIds.has(o.childId));
      return {
        centerId: center.id,
        centerName: center.name,
        totalChildren: centerChildren.length,
        observations: observations.length,
        followUpChildren: centerChildren.filter((c) =>
          getChildRisks(state, c.id).some((r) => r.reviewRequired),
        ).length,
      };
    });
}

/**
 * Overall progress for a child (average of domain scores that have data).
 */
export function getOverallProgress(state: DemoData, childId: string): number | null {
  const domainScores = getAllDomainProgress(state, childId)
    .map((d) => d.score)
    .filter((s): s is number => s !== null);
  if (domainScores.length === 0) return null;
  return Math.round(domainScores.reduce((a, b) => a + b, 0) / domainScores.length);
}

/**
 * Children at risk (requiring follow-up review).
 */
export function getChildrenAtRisk(state: DemoData, session: SessionUser) {
  const children = getAuthorizedChildren(state, session);
  return children
    .map((child) => ({
      child,
      risks: getChildRisks(state, child.id),
    }))
    .filter((item) => item.risks.some((r) => r.reviewRequired));
}

/**
 * Children directory with filtering, sorting, and pagination.
 */
export function getChildrenDirectory(state: DemoData, session: SessionUser, filters: {
  q?: string;
  centerId?: string;
  status?: "all" | "follow-up" | "stable";
  ageGroup?: "all" | "0-2" | "2-4" | "4-6";
  sort?: "name" | "recent" | "age";
  page?: number;
  pageSize?: number;
}) {
  const page = filters.page ?? 1;
  const pageSize = filters.pageSize ?? 6;
  const q = filters.q?.toLowerCase().trim();

  let children = getAuthorizedChildren(state, session).map((child) => {
    const latestObservation = getLatestObservation(state, child.id);
    const risks = getChildRisks(state, child.id);
    const center = state.centers.find((c) => c.id === child.centerId) ?? null;
    const recs = getChildRecommendations(state, child.id);
    return {
      ...child,
      ageMonths: ageInMonths(child.dateOfBirth),
      latestObservation,
      risks,
      center,
      summary: recs[0]?.title ?? "No active recommendation",
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
    children = children.filter((child) => child.risks.some((r) => r.reviewRequired));
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

/**
 * Growth history for a child with computed values for charts.
 */
export function getGrowthHistory(state: DemoData, childId: string) {
  return getChildGrowth(state, childId).map((m) => ({
    ...m,
    date: m.measuredAt.slice(0, 10),
  }));
}

/**
 * Get analytics data for admin dashboard.
 */
export function getAnalyticsData(state: DemoData, session: SessionUser) {
  const children = getAuthorizedChildren(state, session);
  const childIds = new Set(children.map((c) => c.id));
  const observations = state.observations.filter((o) => childIds.has(o.childId));
  const risks = state.riskAssessments.filter((r) => childIds.has(r.childId));

  const domainData = (["PHYSICAL", "COGNITIVE", "LANGUAGE", "SOCIAL", "EMOTIONAL"] as const).map((domain) => ({
    domain,
    value: observations.filter((o) => o.domain === domain).length,
  }));

  const riskData = [
    { name: "No Risk", value: children.length - risks.filter((r) => r.reviewRequired).length, color: "#2d5a3d" },
    { name: "Needs Review", value: risks.filter((r) => r.level === "MODERATE" && r.reviewRequired).length, color: "#f59e0b" },
    { name: "At Risk", value: risks.filter((r) => r.level === "HIGH").length, color: "#dc2626" },
  ];

  const trendData = getObservationTrends(state, session, 7);

  return { domainData, riskData, trendData };
}
