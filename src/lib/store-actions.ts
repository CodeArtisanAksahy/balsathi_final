import { clientStore } from "./client-store";
import type {
  SessionUser,
  Child,
  Observation,
  MilestoneAssessment,
  GrowthMeasurement,
  RiskAssessment,
  Recommendation,
  Message,
  ReportRecord,
  AuditLog,
  AppLocale,
  DevelopmentDomain,
  ObservationMethod,
  ObservationStatus,
  AssessmentStatus,
} from "./domain";
import { isoNow } from "./utils";

function newId(prefix: string): string {
  return `${prefix}-${Math.random().toString(36).slice(2, 11)}${Date.now().toString(36)}`;
}

function appendAudit(
  state: ReturnType<typeof clientStore.getState>,
  event: Omit<AuditLog, "id" | "createdAt">,
): AuditLog {
  const record: AuditLog = {
    id: newId("audit"),
    createdAt: isoNow(),
    ...event,
  };
  state.auditLogs.push(record);
  return record;
}

export const storeActions = {
  // ============ CHILDREN ============

  addChild(session: SessionUser, input: {
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
  }): Child {
    let created: Child | null = null;
    clientStore.setState((draft) => {
      const now = isoNow();
      const childId = newId("child");
      const guardianId = newId("guardian");
      const internalId = `BAL-${String(draft.children.length + 1).padStart(4, "0")}`;

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

      const next = {
        ...draft,
        children: [...draft.children, child],
        guardians: [
          ...draft.guardians,
          {
            id: guardianId,
            name: input.guardian.name,
            phone: input.guardian.phone,
            preferredLanguage: input.guardian.preferredLanguage,
            address: "Added from worker registration form",
            linkedUserId: null,
            createdAt: now,
            updatedAt: now,
          },
        ],
        childGuardians: [
          ...draft.childGuardians,
          { childId, guardianId, relationship: input.guardian.relationship, isPrimary: true },
        ],
        auditLogs: [...draft.auditLogs],
      };
      appendAudit(next, {
        actorId: session.id,
        action: "child.created",
        entityType: "Child",
        entityId: childId,
        scopeCenterId: input.centerId,
        metadata: { demo: true },
      });
      created = child;
      return next;
    });
    return created!;
  },

  updateChild(session: SessionUser, childId: string, updates: Partial<Child>): Child | undefined {
    let updated: Child | undefined;
    clientStore.setState((draft) => {
      const now = isoNow();
      const next = {
        ...draft,
        children: draft.children.map((c) => {
          if (c.id === childId) {
            updated = { ...c, ...updates, updatedAt: now };
            return updated;
          }
          return c;
        }),
        auditLogs: [...draft.auditLogs],
      };
      if (updated) {
        appendAudit(next, {
          actorId: session.id,
          action: "child.updated",
          entityType: "Child",
          entityId: childId,
          scopeCenterId: updated.centerId,
          metadata: {},
        });
      }
      return next;
    });
    return updated;
  },

  archiveChild(session: SessionUser, childId: string): Child | undefined {
    return this.updateChild(session, childId, { active: false });
  },

  // ============ OBSERVATIONS ============

  addObservation(session: SessionUser, input: {
    childId: string;
    observedAt: string;
    method: ObservationMethod;
    observationLanguage: AppLocale;
    domain: DevelopmentDomain;
    activityContext: string;
    observationText: string;
    workerNotes: string;
    aiTranscript?: string | null;
    aiExtractedSummary?: string | null;
    followUpRequired: boolean;
    reviewStatus: ObservationStatus;
    attachmentIds: string[];
    milestoneAssessments: Array<{ milestoneId: string; status: AssessmentStatus; notes: string }>;
  }): { observation: Observation; assessments: MilestoneAssessment[]; risk: RiskAssessment | null } {
    let result: { observation: Observation; assessments: MilestoneAssessment[]; risk: RiskAssessment | null } | null = null;
    clientStore.setState((draft) => {
      const now = isoNow();
      const observation: Observation = {
        id: newId("observation"),
        childId: input.childId,
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

      const assessments: MilestoneAssessment[] = input.milestoneAssessments.map((a) => ({
        id: newId("assessment"),
        childId: input.childId,
        milestoneId: a.milestoneId,
        observationId: observation.id,
        assessedById: session.id,
        assessedAt: input.observedAt,
        status: a.status,
        notes: a.notes,
        createdAt: now,
        updatedAt: now,
      }));

      let risk: RiskAssessment | null = null;
      if (input.followUpRequired) {
        risk = {
          id: newId("risk"),
          childId: input.childId,
          level: input.reviewStatus === "VERIFIED" ? "LOW" : "MODERATE",
          title: "Follow-up required",
          explanation:
            "The latest observation was marked for follow-up and should be reviewed by an authorized worker. This is not a diagnosis.",
          sourceObservationId: observation.id,
          sourceMilestoneId: input.milestoneAssessments[0]?.milestoneId ?? null,
          reviewRequired: true,
          createdAt: now,
          updatedAt: now,
        };
      }

      const next = {
        ...draft,
        observations: [...draft.observations, observation],
        milestoneAssessments: [...draft.milestoneAssessments, ...assessments],
        riskAssessments: risk ? [...draft.riskAssessments, risk] : draft.riskAssessments,
        auditLogs: [...draft.auditLogs],
      };
      appendAudit(next, {
        actorId: session.id,
        action: "observation.created",
        entityType: "Observation",
        entityId: observation.id,
        scopeCenterId: draft.children.find((c) => c.id === input.childId)?.centerId ?? null,
        metadata: { method: input.method, followUpRequired: input.followUpRequired },
      });
      result = { observation, assessments, risk };
      return next;
    });
    return result!;
  },

  updateObservation(session: SessionUser, observationId: string, updates: Partial<Observation>): Observation | undefined {
    let updated: Observation | undefined;
    clientStore.setState((draft) => {
      const now = isoNow();
      const next = {
        ...draft,
        observations: draft.observations.map((o) => {
          if (o.id === observationId) {
            updated = { ...o, ...updates, updatedAt: now };
            return updated;
          }
          return o;
        }),
        auditLogs: [...draft.auditLogs],
      };
      if (updated) {
        appendAudit(next, {
          actorId: session.id,
          action: "observation.updated",
          entityType: "Observation",
          entityId: observationId,
          scopeCenterId: draft.children.find((c) => c.id === updated!.childId)?.centerId ?? null,
          metadata: {},
        });
      }
      return next;
    });
    return updated;
  },

  setObservationReviewStatus(session: SessionUser, observationId: string, status: ObservationStatus): Observation | undefined {
    return this.updateObservation(session, observationId, { reviewStatus: status, reviewedById: session.id, reviewedAt: isoNow() });
  },

  // ============ MILESTONES ============

  addMilestoneAssessment(session: SessionUser, input: {
    childId: string;
    milestoneId: string;
    status: AssessmentStatus;
    notes: string;
  }): MilestoneAssessment {
    let created: MilestoneAssessment | null = null;
    clientStore.setState((draft) => {
      const now = isoNow();
      const assessment: MilestoneAssessment = {
        id: newId("assessment"),
        childId: input.childId,
        milestoneId: input.milestoneId,
        observationId: null,
        assessedById: session.id,
        assessedAt: now,
        status: input.status,
        notes: input.notes,
        createdAt: now,
        updatedAt: now,
      };
      const next = {
        ...draft,
        milestoneAssessments: [...draft.milestoneAssessments, assessment],
        auditLogs: [...draft.auditLogs],
      };
      appendAudit(next, {
        actorId: session.id,
        action: "milestone.assessed",
        entityType: "MilestoneAssessment",
        entityId: assessment.id,
        scopeCenterId: draft.children.find((c) => c.id === input.childId)?.centerId ?? null,
        metadata: { milestoneId: input.milestoneId, status: input.status },
      });
      created = assessment;
      return next;
    });
    return created!;
  },

  updateMilestoneAssessment(session: SessionUser, assessmentId: string, updates: Partial<MilestoneAssessment>): MilestoneAssessment | undefined {
    let updated: MilestoneAssessment | undefined;
    clientStore.setState((draft) => {
      const now = isoNow();
      const next = {
        ...draft,
        milestoneAssessments: draft.milestoneAssessments.map((a) => {
          if (a.id === assessmentId) {
            updated = { ...a, ...updates, updatedAt: now };
            return updated;
          }
          return a;
        }),
        auditLogs: [...draft.auditLogs],
      };
      if (updated) {
        appendAudit(next, {
          actorId: session.id,
          action: "milestone.updated",
          entityType: "MilestoneAssessment",
          entityId: assessmentId,
          scopeCenterId: draft.children.find((c) => c.id === updated!.childId)?.centerId ?? null,
          metadata: {},
        });
      }
      return next;
    });
    return updated;
  },

  // ============ GROWTH ============

  addGrowthMeasurement(session: SessionUser, input: {
    childId: string;
    measuredAt: string;
    heightCm: number;
    weightKg: number;
    headCircumferenceCm: number | null;
    notes: string | null;
  }): GrowthMeasurement {
    let created: GrowthMeasurement | null = null;
    clientStore.setState((draft) => {
      const now = isoNow();
      const measurement: GrowthMeasurement = {
        id: newId("growth"),
        childId: input.childId,
        measuredAt: input.measuredAt,
        heightCm: input.heightCm,
        weightKg: input.weightKg,
        headCircumferenceCm: input.headCircumferenceCm,
        notes: input.notes,
        createdAt: now,
        updatedAt: now,
      };
      const next = {
        ...draft,
        growthMeasurements: [...draft.growthMeasurements, measurement],
        auditLogs: [...draft.auditLogs],
      };
      appendAudit(next, {
        actorId: session.id,
        action: "growth.recorded",
        entityType: "GrowthMeasurement",
        entityId: measurement.id,
        scopeCenterId: draft.children.find((c) => c.id === input.childId)?.centerId ?? null,
        metadata: { childId: input.childId },
      });
      created = measurement;
      return next;
    });
    return created!;
  },

  // ============ RISKS ============

  updateRisk(session: SessionUser, riskId: string, updates: Partial<RiskAssessment>): RiskAssessment | undefined {
    let updated: RiskAssessment | undefined;
    clientStore.setState((draft) => {
      const now = isoNow();
      const next = {
        ...draft,
        riskAssessments: draft.riskAssessments.map((r) => {
          if (r.id === riskId) {
            updated = { ...r, ...updates, updatedAt: now };
            return updated;
          }
          return r;
        }),
        auditLogs: [...draft.auditLogs],
      };
      if (updated) {
        appendAudit(next, {
          actorId: session.id,
          action: "risk.updated",
          entityType: "RiskAssessment",
          entityId: riskId,
          scopeCenterId: draft.children.find((c) => c.id === updated!.childId)?.centerId ?? null,
          metadata: {},
        });
      }
      return next;
    });
    return updated;
  },

  dismissRisk(session: SessionUser, riskId: string): RiskAssessment | undefined {
    return this.updateRisk(session, riskId, { reviewRequired: false, title: "Dismissed" });
  },

  // ============ RECOMMENDATIONS ============

  addRecommendation(session: SessionUser, input: {
    childId: string;
    locale: AppLocale;
    title: string;
    description: string;
    approvedForParent: boolean;
  }): Recommendation {
    let created: Recommendation | null = null;
    clientStore.setState((draft) => {
      const now = isoNow();
      const recommendation: Recommendation = {
        id: newId("recommendation"),
        childId: input.childId,
        createdById: session.id,
        locale: input.locale,
        title: input.title,
        description: input.description,
        approvedForParent: input.approvedForParent,
        status: "ACTIVE",
        createdAt: now,
        updatedAt: now,
      };
      const next = {
        ...draft,
        recommendations: [...draft.recommendations, recommendation],
        auditLogs: [...draft.auditLogs],
      };
      appendAudit(next, {
        actorId: session.id,
        action: "recommendation.created",
        entityType: "Recommendation",
        entityId: recommendation.id,
        scopeCenterId: draft.children.find((c) => c.id === input.childId)?.centerId ?? null,
        metadata: { childId: input.childId },
      });
      created = recommendation;
      return next;
    });
    return created!;
  },

  // ============ MESSAGES ============

  addMessage(session: SessionUser, input: {
    childId: string;
    toUserId?: string;
    locale: AppLocale;
    subject: string;
    body: string;
  }): Message {
    let created: Message | null = null;
    clientStore.setState((draft) => {
      const now = isoNow();
      const child = draft.children.find((c) => c.id === input.childId);
      let toUserId = input.toUserId;
      if (!toUserId) {
        if (session.role === "PARENT") {
          toUserId = child?.assignedWorkerId;
        } else {
          const primaryGuardian = draft.childGuardians.find((l) => l.childId === input.childId && l.isPrimary);
          const guardian = primaryGuardian ? draft.guardians.find((g) => g.id === primaryGuardian.guardianId) : undefined;
          toUserId = guardian?.linkedUserId ?? child?.assignedWorkerId;
        }
      }
      const message: Message = {
        id: newId("message"),
        childId: input.childId,
        fromUserId: session.id,
        toUserId: toUserId ?? session.id,
        direction: session.role === "PARENT" ? "PARENT_TO_WORKER" : "WORKER_TO_PARENT",
        locale: input.locale,
        subject: input.subject,
        body: input.body,
        readAt: null,
        createdAt: now,
        updatedAt: now,
      };
      const next = {
        ...draft,
        messages: [...draft.messages, message],
        auditLogs: [...draft.auditLogs],
      };
      appendAudit(next, {
        actorId: session.id,
        action: "message.sent",
        entityType: "Message",
        entityId: message.id,
        scopeCenterId: child?.centerId ?? null,
        metadata: { childId: input.childId },
      });
      created = message;
      return next;
    });
    return created!;
  },

  // ============ REPORTS ============

  generateReport(session: SessionUser, childId: string): ReportRecord {
    let created: ReportRecord | null = null;
    clientStore.setState((draft) => {
      const now = isoNow();
      const child = draft.children.find((c) => c.id === childId);
      const observations = draft.observations.filter((o) => o.childId === childId);
      const risks = draft.riskAssessments.filter((r) => r.childId === childId);
      const recs = draft.recommendations.filter((r) => r.childId === childId);
      const summary = `${child?.fullName ?? "Child"}'s development record contains ${observations.length} observation(s), ${risks.length} active follow-up flag(s), and ${recs.length} recommendation(s). This is a compiled summary, not a clinical diagnosis.`;
      const report: ReportRecord = {
        id: newId("report"),
        childId,
        centerId: child?.centerId ?? null,
        generatedById: session.id,
        title: `${child?.fullName ?? "Child"} - Progress Report`,
        periodLabel: "Current period",
        summary,
        createdAt: now,
        updatedAt: now,
      };
      const next = {
        ...draft,
        reports: [...draft.reports, report],
        auditLogs: [...draft.auditLogs],
      };
      appendAudit(next, {
        actorId: session.id,
        action: "report.generated",
        entityType: "Report",
        entityId: report.id,
        scopeCenterId: child?.centerId ?? null,
        metadata: { childId },
      });
      created = report;
      return next;
    });
    return created!;
  },

  // ============ RESET ============

  reset() {
    clientStore.reset();
  },
};
