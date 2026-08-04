-- Module 7: AI Healthcare Platform
-- Enables pgvector, evolves AiConversation/AiMessage, adds Module 7 tables.

CREATE EXTENSION IF NOT EXISTS vector;

-- CreateEnum
CREATE TYPE "AiFeatureKey" AS ENUM ('PATIENT_ASSISTANT', 'SYMPTOM_CHECKER', 'RECOMMENDATIONS', 'DOCTOR_SOAP', 'DOCTOR_SUMMARY', 'RX_ASSIST', 'CDS');

-- CreateEnum
CREATE TYPE "AiConversationStatus" AS ENUM ('ACTIVE', 'HIDDEN');

-- CreateEnum
CREATE TYPE "AiMessageRole" AS ENUM ('USER', 'ASSISTANT', 'SYSTEM_NOTICE');

-- CreateEnum
CREATE TYPE "AiSymptomOutcome" AS ENUM ('SELF_CARE', 'SEE_DOCTOR', 'URGENT', 'EMERGENCY');

-- CreateEnum
CREATE TYPE "AiSymptomSessionStatus" AS ENUM ('IN_PROGRESS', 'COMPLETED', 'ABANDONED');

-- CreateEnum
CREATE TYPE "AiDraftKind" AS ENUM ('SOAP', 'CONSULT_SUMMARY', 'RX_SUGGESTION');

-- CreateEnum
CREATE TYPE "AiDraftStatus" AS ENUM ('PENDING', 'ACCEPTED', 'DISCARDED');

-- CreateEnum
CREATE TYPE "AiPromptStatus" AS ENUM ('DRAFT', 'PUBLISHED', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "AiProviderKind" AS ENUM ('OPENAI', 'STUB');

-- CreateEnum
CREATE TYPE "AiUsageOutcome" AS ENUM ('SUCCESS', 'ERROR', 'REFUSED', 'RED_FLAG', 'BUDGET_BLOCKED', 'RATE_LIMITED');

-- CreateEnum
CREATE TYPE "AiGuardrailTrigger" AS ENUM ('RED_FLAG', 'INJECTION', 'OUTPUT_POLICY', 'CONSENT_BLOCK');

-- CreateEnum
CREATE TYPE "AiBudgetScope" AS ENUM ('GLOBAL', 'FEATURE');

-- CreateEnum
CREATE TYPE "AiFeedbackRating" AS ENUM ('HELPFUL', 'NOT_HELPFUL', 'FLAGGED');

-- CreateEnum
CREATE TYPE "AiRecommendationStatus" AS ENUM ('ACTIVE', 'DISMISSED');

-- AlterTable AiConversation (existing Module 2 table)
ALTER TABLE "AiConversation" ADD COLUMN "feature" "AiFeatureKey" NOT NULL DEFAULT 'PATIENT_ASSISTANT',
ADD COLUMN "rollingSummary" TEXT,
ADD COLUMN "status" "AiConversationStatus" NOT NULL DEFAULT 'ACTIVE',
ADD COLUMN "title" TEXT;

-- AlterTable AiMessage: safety/traceability columns + role enum conversion
ALTER TABLE "AiMessage" ADD COLUMN "disclaimerShown" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN "modelConfigId" TEXT,
ADD COLUMN "promptVersionId" TEXT,
ADD COLUMN "redFlagged" BOOLEAN NOT NULL DEFAULT false;

ALTER TABLE "AiMessage" ADD COLUMN "role_new" "AiMessageRole";

UPDATE "AiMessage" SET "role_new" = CASE
  WHEN UPPER("role") = 'USER' THEN 'USER'::"AiMessageRole"
  WHEN UPPER("role") = 'ASSISTANT' THEN 'ASSISTANT'::"AiMessageRole"
  WHEN UPPER("role") IN ('SYSTEM', 'SYSTEM_NOTICE') THEN 'SYSTEM_NOTICE'::"AiMessageRole"
  ELSE 'USER'::"AiMessageRole"
END;

ALTER TABLE "AiMessage" DROP COLUMN "role";
ALTER TABLE "AiMessage" RENAME COLUMN "role_new" TO "role";
ALTER TABLE "AiMessage" ALTER COLUMN "role" SET NOT NULL;

-- CreateTable
CREATE TABLE "AiSymptomSession" (
    "id" TEXT NOT NULL,
    "patientUserId" TEXT NOT NULL,
    "locale" "LocaleCode" NOT NULL DEFAULT 'EN',
    "status" "AiSymptomSessionStatus" NOT NULL DEFAULT 'IN_PROGRESS',
    "steps" JSONB NOT NULL DEFAULT '[]',
    "outcome" "AiSymptomOutcome",
    "rationale" TEXT,
    "redFlagged" BOOLEAN NOT NULL DEFAULT false,
    "appointmentId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AiSymptomSession_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AiRecommendation" (
    "id" TEXT NOT NULL,
    "patientUserId" TEXT NOT NULL,
    "locale" "LocaleCode" NOT NULL DEFAULT 'EN',
    "title" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "reason" TEXT NOT NULL,
    "sourceKinds" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "status" "AiRecommendationStatus" NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AiRecommendation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AiDraftArtifact" (
    "id" TEXT NOT NULL,
    "kind" "AiDraftKind" NOT NULL,
    "doctorUserId" TEXT NOT NULL,
    "patientUserId" TEXT NOT NULL,
    "appointmentId" TEXT,
    "content" JSONB NOT NULL,
    "evidence" JSONB NOT NULL DEFAULT '{}',
    "conflicts" JSONB,
    "status" "AiDraftStatus" NOT NULL DEFAULT 'PENDING',
    "acceptedIntoId" TEXT,
    "promptVersionId" TEXT,
    "modelConfigId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AiDraftArtifact_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AiPromptTemplate" (
    "id" TEXT NOT NULL,
    "feature" "AiFeatureKey" NOT NULL,
    "name" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AiPromptTemplate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AiPromptVersion" (
    "id" TEXT NOT NULL,
    "templateId" TEXT NOT NULL,
    "version" INTEGER NOT NULL,
    "bodyEn" TEXT NOT NULL,
    "bodyAr" TEXT NOT NULL,
    "status" "AiPromptStatus" NOT NULL DEFAULT 'DRAFT',
    "publishedAt" TIMESTAMP(3),
    "publishedBy" TEXT,
    "changeNote" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AiPromptVersion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AiModelConfig" (
    "id" TEXT NOT NULL,
    "feature" "AiFeatureKey" NOT NULL,
    "provider" "AiProviderKind" NOT NULL DEFAULT 'STUB',
    "modelName" TEXT NOT NULL,
    "fallbackModel" TEXT,
    "temperature" DOUBLE PRECISION NOT NULL DEFAULT 0.3,
    "maxOutputTokens" INTEGER NOT NULL DEFAULT 1024,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "version" INTEGER NOT NULL DEFAULT 1,
    "updatedBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AiModelConfig_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AiUsageEvent" (
    "id" TEXT NOT NULL,
    "feature" "AiFeatureKey" NOT NULL,
    "role" TEXT NOT NULL,
    "locale" "LocaleCode" NOT NULL DEFAULT 'EN',
    "userId" TEXT,
    "modelConfigId" TEXT,
    "promptVersionId" TEXT,
    "promptTokens" INTEGER NOT NULL DEFAULT 0,
    "completionTokens" INTEGER NOT NULL DEFAULT 0,
    "latencyMs" INTEGER NOT NULL DEFAULT 0,
    "outcome" "AiUsageOutcome" NOT NULL,
    "estimatedCostUsd" DECIMAL(12,6) NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AiUsageEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AiCostBudget" (
    "id" TEXT NOT NULL,
    "scope" "AiBudgetScope" NOT NULL DEFAULT 'GLOBAL',
    "feature" "AiFeatureKey",
    "monthlyUsd" DECIMAL(12,2) NOT NULL,
    "alertThreshold" INTEGER NOT NULL DEFAULT 80,
    "hardCap" BOOLEAN NOT NULL DEFAULT false,
    "breachedAt" TIMESTAMP(3),
    "updatedBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AiCostBudget_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AiGuardrailEvent" (
    "id" TEXT NOT NULL,
    "trigger" "AiGuardrailTrigger" NOT NULL,
    "feature" "AiFeatureKey" NOT NULL,
    "role" TEXT NOT NULL,
    "category" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AiGuardrailEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AiFeedback" (
    "id" TEXT NOT NULL,
    "messageId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "rating" "AiFeedbackRating" NOT NULL,
    "category" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AiFeedback_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AiKnowledgeDoc" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "locale" "LocaleCode" NOT NULL DEFAULT 'EN',
    "kind" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PUBLISHED',
    "content" TEXT NOT NULL,
    "contentHash" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AiKnowledgeDoc_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AiKnowledgeChunk" (
    "id" TEXT NOT NULL,
    "docId" TEXT NOT NULL,
    "ordinal" INTEGER NOT NULL,
    "content" TEXT NOT NULL,
    "locale" "LocaleCode" NOT NULL DEFAULT 'EN',
    "embeddingModel" TEXT NOT NULL,
    "embedding" vector(1536),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AiKnowledgeChunk_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "AiSymptomSession_patientUserId_createdAt_idx" ON "AiSymptomSession"("patientUserId", "createdAt");

-- CreateIndex
CREATE INDEX "AiRecommendation_patientUserId_status_idx" ON "AiRecommendation"("patientUserId", "status");

-- CreateIndex
CREATE INDEX "AiDraftArtifact_doctorUserId_status_createdAt_idx" ON "AiDraftArtifact"("doctorUserId", "status", "createdAt");

-- CreateIndex
CREATE INDEX "AiDraftArtifact_patientUserId_kind_idx" ON "AiDraftArtifact"("patientUserId", "kind");

-- CreateIndex
CREATE UNIQUE INDEX "AiPromptTemplate_feature_key" ON "AiPromptTemplate"("feature");

-- CreateIndex
CREATE INDEX "AiPromptVersion_templateId_status_idx" ON "AiPromptVersion"("templateId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "AiPromptVersion_templateId_version_key" ON "AiPromptVersion"("templateId", "version");

-- CreateIndex
CREATE INDEX "AiModelConfig_feature_active_idx" ON "AiModelConfig"("feature", "active");

-- CreateIndex
CREATE INDEX "AiUsageEvent_createdAt_feature_idx" ON "AiUsageEvent"("createdAt", "feature");

-- CreateIndex
CREATE INDEX "AiUsageEvent_feature_outcome_createdAt_idx" ON "AiUsageEvent"("feature", "outcome", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "AiCostBudget_scope_feature_key" ON "AiCostBudget"("scope", "feature");

-- CreateIndex
CREATE INDEX "AiGuardrailEvent_createdAt_trigger_idx" ON "AiGuardrailEvent"("createdAt", "trigger");

-- CreateIndex
CREATE UNIQUE INDEX "AiFeedback_messageId_userId_key" ON "AiFeedback"("messageId", "userId");

-- CreateIndex
CREATE UNIQUE INDEX "AiKnowledgeDoc_slug_key" ON "AiKnowledgeDoc"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "AiKnowledgeChunk_docId_ordinal_key" ON "AiKnowledgeChunk"("docId", "ordinal");

-- CreateIndex
CREATE INDEX "AiConversation_patientUserId_status_updatedAt_idx" ON "AiConversation"("patientUserId", "status", "updatedAt");

-- HNSW cosine index for KB retrieval (pgvector)
CREATE INDEX "ai_knowledge_chunk_embedding_hnsw"
  ON "AiKnowledgeChunk" USING hnsw ("embedding" vector_cosine_ops);

-- AddForeignKey
ALTER TABLE "AiMessage" ADD CONSTRAINT "AiMessage_promptVersionId_fkey" FOREIGN KEY ("promptVersionId") REFERENCES "AiPromptVersion"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AiMessage" ADD CONSTRAINT "AiMessage_modelConfigId_fkey" FOREIGN KEY ("modelConfigId") REFERENCES "AiModelConfig"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AiSymptomSession" ADD CONSTRAINT "AiSymptomSession_patientUserId_fkey" FOREIGN KEY ("patientUserId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AiSymptomSession" ADD CONSTRAINT "AiSymptomSession_appointmentId_fkey" FOREIGN KEY ("appointmentId") REFERENCES "Appointment"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AiRecommendation" ADD CONSTRAINT "AiRecommendation_patientUserId_fkey" FOREIGN KEY ("patientUserId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AiDraftArtifact" ADD CONSTRAINT "AiDraftArtifact_doctorUserId_fkey" FOREIGN KEY ("doctorUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AiDraftArtifact" ADD CONSTRAINT "AiDraftArtifact_patientUserId_fkey" FOREIGN KEY ("patientUserId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AiDraftArtifact" ADD CONSTRAINT "AiDraftArtifact_appointmentId_fkey" FOREIGN KEY ("appointmentId") REFERENCES "Appointment"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AiPromptVersion" ADD CONSTRAINT "AiPromptVersion_templateId_fkey" FOREIGN KEY ("templateId") REFERENCES "AiPromptTemplate"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AiFeedback" ADD CONSTRAINT "AiFeedback_messageId_fkey" FOREIGN KEY ("messageId") REFERENCES "AiMessage"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AiFeedback" ADD CONSTRAINT "AiFeedback_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AiKnowledgeChunk" ADD CONSTRAINT "AiKnowledgeChunk_docId_fkey" FOREIGN KEY ("docId") REFERENCES "AiKnowledgeDoc"("id") ON DELETE CASCADE ON UPDATE CASCADE;
