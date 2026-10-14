export const appLocales = ["en", "hi", "mr"] as const;
export const appRoles = ["WORKER", "PARENT", "CENTER_ADMIN", "DISTRICT_ADMIN"] as const;
export const genders = ["FEMALE", "MALE", "OTHER", "UNSPECIFIED"] as const;
export const guardianRelationships = ["MOTHER", "FATHER", "GRANDPARENT", "SIBLING", "OTHER"] as const;
export const developmentDomains = ["PHYSICAL", "COGNITIVE", "LANGUAGE", "SOCIAL", "EMOTIONAL"] as const;
export const observationMethods = ["TEXT", "VOICE", "PHOTO"] as const;
export const observationStatuses = ["DRAFT", "REVIEW_PENDING", "VERIFIED"] as const;
export const assessmentStatuses = ["MET", "IN_PROGRESS", "NEEDS_REVIEW", "NOT_OBSERVED", "NOT_ASSESSED", "NOT_APPLICABLE"] as const;
export const riskLevels = ["LOW", "MODERATE", "HIGH"] as const;
export const messageDirections = ["WORKER_TO_PARENT", "PARENT_TO_WORKER", "SYSTEM"] as const;
export const attachmentKinds = ["IMAGE", "AUDIO", "DOCUMENT"] as const;

export type AppLocale = (typeof appLocales)[number];
export type AppRole = (typeof appRoles)[number];
export type DevelopmentDomain = (typeof developmentDomains)[number];
export type ObservationMethod = (typeof observationMethods)[number];
export type ObservationStatus = (typeof observationStatuses)[number];
export type AssessmentStatus = (typeof assessmentStatuses)[number];
export type RiskLevel = (typeof riskLevels)[number];
export type MessageDirection = (typeof messageDirections)[number];
export type AttachmentKind = (typeof attachmentKinds)[number];

export interface Timestamps {
  createdAt: string;
  updatedAt: string;
}

export interface Center extends Timestamps {
  id: string;
  code: string;
  name: string;
  village: string;
  district: string;
  state: string;
  active: boolean;
}

export interface User extends Timestamps {
  id: string;
  name: string;
  email: string;
  role: AppRole;
  phone: string;
  preferredLanguage: AppLocale;
  centerIds: string[];
  active: boolean;
  passwordHash: string;
}

export interface Guardian extends Timestamps {
  id: string;
  name: string;
  phone: string;
  preferredLanguage: AppLocale;
  address: string;
  linkedUserId: string | null;
}

export interface Child extends Timestamps {
  id: string;
  internalId: string;
  fullName: string;
  dateOfBirth: string;
  gender: (typeof genders)[number];
  centerId: string;
  assignedWorkerId: string;
  enrollmentDate: string;
  profilePhotoPath: string | null;
  primaryLanguage: AppLocale;
  consentStatus: "APPROVED" | "PENDING";
  emergencyContactName: string;
  emergencyContactPhone: string;
  siblingIds: string[];
  active: boolean;
}

export interface ChildGuardianLink {
  childId: string;
  guardianId: string;
  relationship: (typeof guardianRelationships)[number];
  isPrimary: boolean;
}

export interface GrowthMeasurement extends Timestamps {
  id: string;
  childId: string;
  measuredAt: string;
  heightCm: number;
  weightKg: number;
  headCircumferenceCm: number | null;
  notes: string | null;
}

export interface AttachmentRecord extends Timestamps {
  id: string;
  observationId: string | null;
  childId: string;
  kind: AttachmentKind;
  fileName: string;
  storageKey: string;
  mimeType: string;
  sizeBytes: number;
  uploadedById: string;
  consentVerified: boolean;
}

export interface Observation extends Timestamps {
  id: string;
  childId: string;
  createdById: string;
  observedAt: string;
  method: ObservationMethod;
  observationLanguage: AppLocale;
  domain: DevelopmentDomain;
  activityContext: string;
  observationText: string;
  workerNotes: string;
  aiTranscript: string | null;
  aiExtractedSummary: string | null;
  followUpRequired: boolean;
  reviewStatus: ObservationStatus;
  reviewedById?: string | null;
  reviewedAt?: string | null;
  attachmentIds: string[];
}

export interface MilestoneDefinition extends Timestamps {
  id: string;
  slug: string;
  domain: DevelopmentDomain;
  title: Record<AppLocale, string>;
  description: Record<AppLocale, string>;
  minAgeMonths: number;
  maxAgeMonths: number;
  reviewAfterMonths: number;
  activities: Record<AppLocale, string[]>;
  active: boolean;
}

export interface MilestoneAssessment extends Timestamps {
  id: string;
  childId: string;
  milestoneId: string;
  observationId: string | null;
  assessedById: string;
  assessedAt: string;
  status: AssessmentStatus;
  notes: string;
}

export interface RiskAssessment extends Timestamps {
  id: string;
  childId: string;
  level: RiskLevel;
  title: string;
  explanation: string;
  sourceObservationId: string | null;
  sourceMilestoneId: string | null;
  reviewRequired: boolean;
}

export interface Recommendation extends Timestamps {
  id: string;
  childId: string;
  createdById: string;
  locale: AppLocale;
  title: string;
  description: string;
  approvedForParent: boolean;
  status: "PENDING" | "ACTIVE" | "COMPLETED";
}

export interface Message extends Timestamps {
  id: string;
  childId: string;
  fromUserId: string;
  toUserId: string;
  direction: MessageDirection;
  locale: AppLocale;
  subject: string;
  body: string;
  readAt: string | null;
}

export interface ReportRecord extends Timestamps {
  id: string;
  childId: string | null;
  centerId: string | null;
  generatedById: string;
  title: string;
  periodLabel: string;
  summary: string;
}

export interface ChatLog extends Timestamps {
  id: string;
  userId: string;
  childId: string | null;
  locale: AppLocale;
  question: string;
  responseSummary: string;
  sourceRefs: string[];
}

export interface PasswordResetToken {
  id: string;
  userId: string;
  tokenHash: string;
  expiresAt: string;
  usedAt: string | null;
  createdAt: string;
}

export interface AuditLog {
  id: string;
  actorId: string | null;
  action: string;
  entityType: string;
  entityId: string;
  scopeCenterId: string | null;
  metadata: Record<string, string | number | boolean | string[] | null>;
  createdAt: string;
}

export interface DemoData {
  centers: Center[];
  users: User[];
  guardians: Guardian[];
  childGuardians: ChildGuardianLink[];
  children: Child[];
  growthMeasurements: GrowthMeasurement[];
  attachments: AttachmentRecord[];
  observations: Observation[];
  milestoneDefinitions: MilestoneDefinition[];
  milestoneAssessments: MilestoneAssessment[];
  riskAssessments: RiskAssessment[];
  recommendations: Recommendation[];
  messages: Message[];
  reports: ReportRecord[];
  chatLogs: ChatLog[];
  passwordResetTokens: PasswordResetToken[];
  auditLogs: AuditLog[];
}

export interface SessionUser {
  id: string;
  name: string;
  email: string;
  role: AppRole;
  preferredLanguage: AppLocale;
  centerIds: string[];
}
