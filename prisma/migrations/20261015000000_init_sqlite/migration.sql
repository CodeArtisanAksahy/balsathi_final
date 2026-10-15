-- CreateTable
CREATE TABLE "Center" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "village" TEXT NOT NULL,
    "district" TEXT NOT NULL,
    "state" TEXT NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "role" TEXT NOT NULL DEFAULT 'WORKER',
    "phone" TEXT NOT NULL,
    "preferredLanguage" TEXT NOT NULL DEFAULT 'en',
    "centerIds" JSONB NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "passwordHash" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "Guardian" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "preferredLanguage" TEXT NOT NULL DEFAULT 'en',
    "address" TEXT NOT NULL,
    "linkedUserId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Guardian_linkedUserId_fkey" FOREIGN KEY ("linkedUserId") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "ChildGuardian" (
    "childId" TEXT NOT NULL,
    "guardianId" TEXT NOT NULL,
    "relationship" TEXT NOT NULL,
    "isPrimary" BOOLEAN NOT NULL DEFAULT false,

    PRIMARY KEY ("childId", "guardianId"),
    CONSTRAINT "ChildGuardian_childId_fkey" FOREIGN KEY ("childId") REFERENCES "Child" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "ChildGuardian_guardianId_fkey" FOREIGN KEY ("guardianId") REFERENCES "Guardian" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Child" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "internalId" TEXT NOT NULL,
    "fullName" TEXT NOT NULL,
    "dateOfBirth" DATETIME NOT NULL,
    "gender" TEXT NOT NULL DEFAULT 'UNSPECIFIED',
    "centerId" TEXT NOT NULL,
    "assignedWorkerId" TEXT NOT NULL,
    "enrollmentDate" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "profilePhotoPath" TEXT,
    "primaryLanguage" TEXT NOT NULL DEFAULT 'en',
    "consentStatus" TEXT NOT NULL DEFAULT 'PENDING',
    "emergencyContactName" TEXT NOT NULL,
    "emergencyContactPhone" TEXT NOT NULL,
    "siblingIds" JSONB NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Child_centerId_fkey" FOREIGN KEY ("centerId") REFERENCES "Center" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Child_assignedWorkerId_fkey" FOREIGN KEY ("assignedWorkerId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "GrowthMeasurement" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "childId" TEXT NOT NULL,
    "measuredAt" DATETIME NOT NULL,
    "heightCm" REAL NOT NULL,
    "weightKg" REAL NOT NULL,
    "headCircumferenceCm" REAL,
    "notes" TEXT,
    "measurementSource" TEXT NOT NULL DEFAULT 'WORKER_ENTRY',
    "measuredById" TEXT,
    "verificationStatus" TEXT NOT NULL DEFAULT 'UNREVIEWED',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "GrowthMeasurement_childId_fkey" FOREIGN KEY ("childId") REFERENCES "Child" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "AttachmentRecord" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "observationId" TEXT,
    "childId" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "fileName" TEXT NOT NULL,
    "storageKey" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "sizeBytes" INTEGER NOT NULL,
    "uploadedById" TEXT NOT NULL,
    "consentVerified" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "AttachmentRecord_childId_fkey" FOREIGN KEY ("childId") REFERENCES "Child" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Observation" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "childId" TEXT NOT NULL,
    "createdById" TEXT NOT NULL,
    "observedAt" DATETIME NOT NULL,
    "method" TEXT NOT NULL,
    "observationLanguage" TEXT NOT NULL DEFAULT 'en',
    "domain" TEXT NOT NULL,
    "activityContext" TEXT NOT NULL,
    "observationText" TEXT NOT NULL,
    "workerNotes" TEXT NOT NULL,
    "originalText" TEXT,
    "idempotencyKey" TEXT,
    "aiTranscript" TEXT,
    "aiExtractedSummary" TEXT,
    "followUpRequired" BOOLEAN NOT NULL DEFAULT false,
    "reviewStatus" TEXT NOT NULL DEFAULT 'REVIEW_PENDING',
    "attachmentIds" JSONB NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Observation_childId_fkey" FOREIGN KEY ("childId") REFERENCES "Child" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Observation_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "MilestoneDefinition" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "slug" TEXT NOT NULL,
    "domain" TEXT NOT NULL,
    "titleEn" TEXT NOT NULL,
    "titleHi" TEXT NOT NULL,
    "titleMr" TEXT NOT NULL,
    "descriptionEn" TEXT NOT NULL,
    "descriptionHi" TEXT NOT NULL,
    "descriptionMr" TEXT NOT NULL,
    "minAgeMonths" INTEGER NOT NULL,
    "maxAgeMonths" INTEGER NOT NULL,
    "reviewAfterMonths" INTEGER NOT NULL,
    "activitiesEn" JSONB NOT NULL,
    "activitiesHi" JSONB NOT NULL,
    "activitiesMr" JSONB NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "MilestoneAssessment" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "childId" TEXT NOT NULL,
    "milestoneId" TEXT NOT NULL,
    "observationId" TEXT,
    "assessedById" TEXT NOT NULL,
    "assessedAt" DATETIME NOT NULL,
    "status" TEXT NOT NULL,
    "notes" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "MilestoneAssessment_childId_fkey" FOREIGN KEY ("childId") REFERENCES "Child" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "MilestoneAssessment_milestoneId_fkey" FOREIGN KEY ("milestoneId") REFERENCES "MilestoneDefinition" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "MilestoneAssessment_observationId_fkey" FOREIGN KEY ("observationId") REFERENCES "Observation" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "MilestoneAssessment_assessedById_fkey" FOREIGN KEY ("assessedById") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "DevelopmentAssessment" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "childId" TEXT NOT NULL,
    "domain" TEXT NOT NULL,
    "score" REAL NOT NULL,
    "assessmentMethod" TEXT NOT NULL,
    "assessmentVersion" TEXT NOT NULL,
    "assessedById" TEXT NOT NULL,
    "assessedAt" DATETIME NOT NULL,
    "sourceObservationId" TEXT,
    "notes" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "DevelopmentAssessment_childId_fkey" FOREIGN KEY ("childId") REFERENCES "Child" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "DevelopmentAssessment_assessedById_fkey" FOREIGN KEY ("assessedById") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "DevelopmentAssessment_sourceObservationId_fkey" FOREIGN KEY ("sourceObservationId") REFERENCES "Observation" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "FollowUp" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "childId" TEXT NOT NULL,
    "observationId" TEXT,
    "assignedToId" TEXT,
    "status" TEXT NOT NULL DEFAULT 'OPEN',
    "priority" TEXT NOT NULL DEFAULT 'NORMAL',
    "dueDate" DATETIME,
    "resolutionNotes" TEXT NOT NULL DEFAULT '',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "FollowUp_childId_fkey" FOREIGN KEY ("childId") REFERENCES "Child" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "FollowUp_observationId_fkey" FOREIGN KEY ("observationId") REFERENCES "Observation" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "FollowUp_assignedToId_fkey" FOREIGN KEY ("assignedToId") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "MLPrediction" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "childId" TEXT,
    "scopeCenterIds" JSONB NOT NULL,
    "modelName" TEXT NOT NULL,
    "modelVersion" TEXT NOT NULL,
    "predictionType" TEXT NOT NULL,
    "predictionValue" JSONB NOT NULL,
    "confidenceValue" REAL,
    "inputDataCutoff" DATETIME NOT NULL,
    "generatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "modelArtifactVersion" TEXT NOT NULL,
    "explanation" JSONB NOT NULL,
    "reviewStatus" TEXT NOT NULL DEFAULT 'GENERATED',
    CONSTRAINT "MLPrediction_childId_fkey" FOREIGN KEY ("childId") REFERENCES "Child" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "IdempotencyRecord" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "actorId" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "entityType" TEXT NOT NULL,
    "entityId" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "RiskAssessment" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "childId" TEXT NOT NULL,
    "level" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "explanation" TEXT NOT NULL,
    "sourceObservationId" TEXT,
    "sourceMilestoneId" TEXT,
    "reviewRequired" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "RiskAssessment_childId_fkey" FOREIGN KEY ("childId") REFERENCES "Child" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "RiskAssessment_sourceMilestoneId_fkey" FOREIGN KEY ("sourceMilestoneId") REFERENCES "MilestoneAssessment" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Recommendation" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "childId" TEXT NOT NULL,
    "createdById" TEXT NOT NULL,
    "locale" TEXT NOT NULL DEFAULT 'en',
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "approvedForParent" BOOLEAN NOT NULL DEFAULT false,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Recommendation_childId_fkey" FOREIGN KEY ("childId") REFERENCES "Child" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Recommendation_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Message" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "childId" TEXT NOT NULL,
    "fromUserId" TEXT NOT NULL,
    "toUserId" TEXT NOT NULL,
    "direction" TEXT NOT NULL,
    "locale" TEXT NOT NULL DEFAULT 'en',
    "subject" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "readAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Message_childId_fkey" FOREIGN KEY ("childId") REFERENCES "Child" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Message_fromUserId_fkey" FOREIGN KEY ("fromUserId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Message_toUserId_fkey" FOREIGN KEY ("toUserId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "ReportRecord" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "childId" TEXT,
    "centerId" TEXT,
    "generatedById" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "periodLabel" TEXT NOT NULL,
    "summary" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "ReportRecord_childId_fkey" FOREIGN KEY ("childId") REFERENCES "Child" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "ChatLog" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "childId" TEXT,
    "locale" TEXT NOT NULL DEFAULT 'en',
    "question" TEXT NOT NULL,
    "responseSummary" TEXT NOT NULL,
    "sourceRefs" JSONB NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "ChatLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "ChatLog_childId_fkey" FOREIGN KEY ("childId") REFERENCES "Child" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "AuditLog" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "actorId" TEXT,
    "action" TEXT NOT NULL,
    "entityType" TEXT NOT NULL,
    "entityId" TEXT NOT NULL,
    "scopeCenterId" TEXT,
    "metadata" JSONB,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "AuditLog_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "AuditLog_scopeCenterId_fkey" FOREIGN KEY ("scopeCenterId") REFERENCES "Center" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "Center_code_key" ON "Center"("code");

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE INDEX "ChildGuardian_guardianId_idx" ON "ChildGuardian"("guardianId");

-- CreateIndex
CREATE UNIQUE INDEX "Child_internalId_key" ON "Child"("internalId");

-- CreateIndex
CREATE INDEX "Child_centerId_active_idx" ON "Child"("centerId", "active");

-- CreateIndex
CREATE INDEX "GrowthMeasurement_childId_measuredAt_idx" ON "GrowthMeasurement"("childId", "measuredAt");

-- CreateIndex
CREATE INDEX "GrowthMeasurement_verificationStatus_measuredAt_idx" ON "GrowthMeasurement"("verificationStatus", "measuredAt");

-- CreateIndex
CREATE INDEX "AttachmentRecord_childId_idx" ON "AttachmentRecord"("childId");

-- CreateIndex
CREATE INDEX "Observation_childId_observedAt_idx" ON "Observation"("childId", "observedAt");

-- CreateIndex
CREATE INDEX "Observation_createdById_idx" ON "Observation"("createdById");

-- CreateIndex
CREATE UNIQUE INDEX "Observation_createdById_idempotencyKey_key" ON "Observation"("createdById", "idempotencyKey");

-- CreateIndex
CREATE UNIQUE INDEX "MilestoneDefinition_slug_key" ON "MilestoneDefinition"("slug");

-- CreateIndex
CREATE INDEX "MilestoneDefinition_domain_minAgeMonths_maxAgeMonths_idx" ON "MilestoneDefinition"("domain", "minAgeMonths", "maxAgeMonths");

-- CreateIndex
CREATE INDEX "MilestoneAssessment_childId_assessedAt_idx" ON "MilestoneAssessment"("childId", "assessedAt");

-- CreateIndex
CREATE INDEX "MilestoneAssessment_milestoneId_idx" ON "MilestoneAssessment"("milestoneId");

-- CreateIndex
CREATE INDEX "MilestoneAssessment_assessedById_idx" ON "MilestoneAssessment"("assessedById");

-- CreateIndex
CREATE INDEX "MilestoneAssessment_childId_milestoneId_assessedAt_idx" ON "MilestoneAssessment"("childId", "milestoneId", "assessedAt");

-- CreateIndex
CREATE INDEX "DevelopmentAssessment_childId_domain_assessedAt_idx" ON "DevelopmentAssessment"("childId", "domain", "assessedAt");

-- CreateIndex
CREATE INDEX "DevelopmentAssessment_assessmentMethod_assessmentVersion_idx" ON "DevelopmentAssessment"("assessmentMethod", "assessmentVersion");

-- CreateIndex
CREATE INDEX "FollowUp_childId_status_dueDate_idx" ON "FollowUp"("childId", "status", "dueDate");

-- CreateIndex
CREATE INDEX "FollowUp_assignedToId_status_idx" ON "FollowUp"("assignedToId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "FollowUp_observationId_key" ON "FollowUp"("observationId");

-- CreateIndex
CREATE INDEX "MLPrediction_childId_predictionType_generatedAt_idx" ON "MLPrediction"("childId", "predictionType", "generatedAt");

-- CreateIndex
CREATE INDEX "MLPrediction_modelName_modelVersion_idx" ON "MLPrediction"("modelName", "modelVersion");

-- CreateIndex
CREATE INDEX "IdempotencyRecord_entityType_entityId_idx" ON "IdempotencyRecord"("entityType", "entityId");

-- CreateIndex
CREATE UNIQUE INDEX "IdempotencyRecord_actorId_key_key" ON "IdempotencyRecord"("actorId", "key");

-- CreateIndex
CREATE INDEX "RiskAssessment_childId_idx" ON "RiskAssessment"("childId");

-- CreateIndex
CREATE INDEX "Recommendation_childId_status_idx" ON "Recommendation"("childId", "status");

-- CreateIndex
CREATE INDEX "Message_childId_createdAt_idx" ON "Message"("childId", "createdAt");

-- CreateIndex
CREATE INDEX "ReportRecord_childId_idx" ON "ReportRecord"("childId");

-- CreateIndex
CREATE INDEX "ChatLog_userId_createdAt_idx" ON "ChatLog"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "AuditLog_scopeCenterId_createdAt_idx" ON "AuditLog"("scopeCenterId", "createdAt");

-- CreateIndex
CREATE INDEX "AuditLog_actorId_createdAt_idx" ON "AuditLog"("actorId", "createdAt");

-- CreateIndex
CREATE INDEX "AuditLog_entityType_entityId_idx" ON "AuditLog"("entityType", "entityId");
