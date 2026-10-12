import { z } from "zod";
import {
  appLocales,
  assessmentStatuses,
  developmentDomains,
  genders,
  guardianRelationships,
  observationMethods,
  observationStatuses,
} from "./domain";

const name = z.string().trim().min(2).max(120);
const identifier = z.string().trim().min(1).max(80);

export const loginSchema = z.object({
  email: z.email(),
  password: z.string().min(8).max(128),
  locale: z.enum(appLocales).default("en"),
});

export const childCreateSchema = z.object({
  fullName: name,
  dateOfBirth: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  gender: z.enum(genders),
  centerId: identifier,
  assignedWorkerId: identifier,
  primaryLanguage: z.enum(appLocales),
  emergencyContactName: name,
  emergencyContactPhone: z.string().trim().min(7).max(20),
  guardian: z.object({
    name,
    phone: z.string().trim().min(7).max(20),
    preferredLanguage: z.enum(appLocales),
    relationship: z.enum(guardianRelationships),
  }),
});

export const childQuerySchema = z.object({
  q: z.string().trim().optional(),
  centerId: identifier.optional(),
  status: z.enum(["all", "follow-up", "stable"]).default("all"),
  ageGroup: z.enum(["all", "0-2", "2-4", "4-6"]).default("all"),
  sort: z.enum(["name", "recent", "age"]).default("name"),
  page: z.coerce.number().min(1).default(1),
  pageSize: z.coerce.number().min(1).max(50).default(6),
});

export const observationCreateSchema = z.object({
  childId: identifier,
  observedAt: z.iso.datetime(),
  method: z.enum(observationMethods),
  observationLanguage: z.enum(appLocales),
  domain: z.enum(developmentDomains),
  activityContext: z.string().trim().min(2).max(200),
  observationText: z.string().trim().min(5).max(4000),
  workerNotes: z.string().trim().max(2000).default(""),
  aiTranscript: z.string().trim().max(4000).nullable().optional(),
  aiExtractedSummary: z.string().trim().max(2000).nullable().optional(),
  followUpRequired: z.boolean().default(false),
  reviewStatus: z.enum(observationStatuses).default("REVIEW_PENDING"),
  attachmentIds: z.array(identifier).default([]),
  milestoneAssessments: z.array(z.object({
    milestoneId: identifier,
    status: z.enum(assessmentStatuses),
    notes: z.string().trim().max(600).default(""),
  })).default([]),
});

export const observationReviewSchema = z.object({
  id: identifier,
  reviewStatus: z.enum(observationStatuses),
});

export const messageCreateSchema = z.object({
  childId: identifier,
  toUserId: identifier.optional(),
  locale: z.enum(appLocales),
  subject: z.string().trim().min(2).max(120),
  body: z.string().trim().min(2).max(2000),
});

export const chatSchema = z.object({
  childId: identifier.nullable().optional(),
  locale: z.enum(appLocales),
  question: z.string().trim().min(2).max(600),
});
