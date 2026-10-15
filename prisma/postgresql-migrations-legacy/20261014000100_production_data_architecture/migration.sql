-- CreateEnum
CREATE TYPE "FollowUpStatus" AS ENUM ('OPEN', 'IN_PROGRESS', 'RESOLVED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "FollowUpPriority" AS ENUM ('LOW', 'NORMAL', 'HIGH');

-- CreateEnum
CREATE TYPE "PredictionReviewStatus" AS ENUM ('GENERATED', 'REVIEWED', 'DISMISSED');

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "AssessmentStatus" ADD VALUE 'NOT_ASSESSED';
ALTER TYPE "AssessmentStatus" ADD VALUE 'NOT_APPLICABLE';

-- AlterTable
ALTER TABLE "GrowthMeasurement" ADD COLUMN     "measuredById" TEXT,
ADD COLUMN     "measurementSource" TEXT NOT NULL DEFAULT 'WORKER_ENTRY',
ADD COLUMN     "verificationStatus" TEXT NOT NULL DEFAULT 'UNREVIEWED';

-- AlterTable
ALTER TABLE "Observation" ADD COLUMN     "idempotencyKey" TEXT,
ADD COLUMN     "originalText" TEXT;

-- CreateTable
CREATE TABLE "DevelopmentAssessment" (
    "id" TEXT NOT NULL,
    "childId" TEXT NOT NULL,
    "domain" "DevelopmentDomain" NOT NULL,
    "score" DOUBLE PRECISION NOT NULL,
    "assessmentMethod" TEXT NOT NULL,
    "assessmentVersion" TEXT NOT NULL,
    "assessedById" TEXT NOT NULL,
    "assessedAt" TIMESTAMP(3) NOT NULL,
    "sourceObservationId" TEXT,
    "notes" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DevelopmentAssessment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FollowUp" (
    "id" TEXT NOT NULL,
    "childId" TEXT NOT NULL,
    "observationId" TEXT,
    "assignedToId" TEXT,
    "status" "FollowUpStatus" NOT NULL DEFAULT 'OPEN',
    "priority" "FollowUpPriority" NOT NULL DEFAULT 'NORMAL',
    "dueDate" TIMESTAMP(3),
    "resolutionNotes" TEXT NOT NULL DEFAULT '',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FollowUp_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MLPrediction" (
    "id" TEXT NOT NULL,
    "childId" TEXT,
    "scopeCenterIds" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "modelName" TEXT NOT NULL,
    "modelVersion" TEXT NOT NULL,
    "predictionType" TEXT NOT NULL,
    "predictionValue" JSONB NOT NULL,
    "confidenceValue" DOUBLE PRECISION,
    "inputDataCutoff" TIMESTAMP(3) NOT NULL,
    "generatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "modelArtifactVersion" TEXT NOT NULL,
    "explanation" JSONB NOT NULL,
    "reviewStatus" "PredictionReviewStatus" NOT NULL DEFAULT 'GENERATED',

    CONSTRAINT "MLPrediction_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "IdempotencyRecord" (
    "id" TEXT NOT NULL,
    "actorId" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "entityType" TEXT NOT NULL,
    "entityId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "IdempotencyRecord_pkey" PRIMARY KEY ("id")
);

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
CREATE INDEX "GrowthMeasurement_verificationStatus_measuredAt_idx" ON "GrowthMeasurement"("verificationStatus", "measuredAt");

-- CreateIndex
CREATE UNIQUE INDEX "Observation_createdById_idempotencyKey_key" ON "Observation"("createdById", "idempotencyKey");

-- CreateIndex
CREATE INDEX "MilestoneAssessment_childId_milestoneId_assessedAt_idx" ON "MilestoneAssessment"("childId", "milestoneId", "assessedAt");

-- AddForeignKey
ALTER TABLE "Child" ADD CONSTRAINT "Child_assignedWorkerId_fkey" FOREIGN KEY ("assignedWorkerId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DevelopmentAssessment" ADD CONSTRAINT "DevelopmentAssessment_childId_fkey" FOREIGN KEY ("childId") REFERENCES "Child"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DevelopmentAssessment" ADD CONSTRAINT "DevelopmentAssessment_assessedById_fkey" FOREIGN KEY ("assessedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DevelopmentAssessment" ADD CONSTRAINT "DevelopmentAssessment_sourceObservationId_fkey" FOREIGN KEY ("sourceObservationId") REFERENCES "Observation"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FollowUp" ADD CONSTRAINT "FollowUp_childId_fkey" FOREIGN KEY ("childId") REFERENCES "Child"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FollowUp" ADD CONSTRAINT "FollowUp_observationId_fkey" FOREIGN KEY ("observationId") REFERENCES "Observation"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FollowUp" ADD CONSTRAINT "FollowUp_assignedToId_fkey" FOREIGN KEY ("assignedToId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MLPrediction" ADD CONSTRAINT "MLPrediction_childId_fkey" FOREIGN KEY ("childId") REFERENCES "Child"("id") ON DELETE SET NULL ON UPDATE CASCADE;
