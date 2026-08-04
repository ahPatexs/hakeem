-- CreateEnum
CREATE TYPE "EmrAttestationSource" AS ENUM ('PATIENT_REPORTED', 'CLINICIAN_ATTESTED');

-- CreateEnum
CREATE TYPE "EmrSeverity" AS ENUM ('MILD', 'MODERATE', 'SEVERE', 'CRITICAL');

-- CreateEnum
CREATE TYPE "EmrConditionStatus" AS ENUM ('ACTIVE', 'RESOLVED', 'INACTIVE');

-- CreateEnum
CREATE TYPE "EmrPlanStatus" AS ENUM ('DRAFT', 'ACTIVE', 'COMPLETED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "EmrConsentEventKind" AS ENUM ('ACKNOWLEDGE', 'WITHDRAW');

-- CreateEnum
CREATE TYPE "EmrTimelineEventType" AS ENUM ('ENCOUNTER', 'APPOINTMENT', 'PRESCRIPTION', 'LAB', 'IMAGING', 'DOCUMENT', 'CONSENT', 'DIAGNOSIS', 'PLAN', 'NOTE', 'SYSTEM');

-- CreateEnum
CREATE TYPE "EmrTimelineVisibility" AS ENUM ('PATIENT', 'CLINICIAN', 'ADMIN', 'ALL_AUTHORIZED');

-- CreateEnum
CREATE TYPE "EmrTimelineEventStatus" AS ENUM ('ACTIVE', 'SUPERSEDED', 'HIDDEN');

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "ClinicalDocumentKind" ADD VALUE 'REFERRAL';
ALTER TYPE "ClinicalDocumentKind" ADD VALUE 'CERTIFICATE';
ALTER TYPE "ClinicalDocumentKind" ADD VALUE 'CONSENT_EVIDENCE';
ALTER TYPE "ClinicalDocumentKind" ADD VALUE 'IMAGING_REPORT';
ALTER TYPE "ClinicalDocumentKind" ADD VALUE 'OTHER';

-- AlterTable
ALTER TABLE "ClinicalDocument" ADD COLUMN     "classification" TEXT,
ADD COLUMN     "deletedAt" TIMESTAMP(3),
ADD COLUMN     "deletedByUserId" TEXT,
ADD COLUMN     "legalHold" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "Prescription" ADD COLUMN     "deletedAt" TIMESTAMP(3),
ADD COLUMN     "renewedFromId" TEXT;

-- AlterTable
ALTER TABLE "WebhookReceipt" ADD COLUMN     "freshnessValid" BOOLEAN;

-- CreateTable
CREATE TABLE "AllergyEntry" (
    "id" TEXT NOT NULL,
    "patientUserId" TEXT NOT NULL,
    "substance" TEXT NOT NULL,
    "reaction" TEXT,
    "severity" "EmrSeverity",
    "source" "EmrAttestationSource" NOT NULL,
    "criticalFlag" BOOLEAN NOT NULL DEFAULT false,
    "recordedByUserId" TEXT NOT NULL,
    "deletedAt" TIMESTAMP(3),
    "deletedByUserId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AllergyEntry_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ConditionEntry" (
    "id" TEXT NOT NULL,
    "patientUserId" TEXT NOT NULL,
    "display" TEXT NOT NULL,
    "icd10Code" TEXT,
    "status" "EmrConditionStatus" NOT NULL DEFAULT 'ACTIVE',
    "source" "EmrAttestationSource" NOT NULL,
    "onsetDate" TIMESTAMP(3),
    "recordedByUserId" TEXT NOT NULL,
    "deletedAt" TIMESTAMP(3),
    "deletedByUserId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ConditionEntry_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ImmunizationEntry" (
    "id" TEXT NOT NULL,
    "patientUserId" TEXT NOT NULL,
    "vaccineName" TEXT NOT NULL,
    "administeredOn" TIMESTAMP(3),
    "source" "EmrAttestationSource" NOT NULL,
    "lotNumber" TEXT,
    "recordedByUserId" TEXT NOT NULL,
    "deletedAt" TIMESTAMP(3),
    "deletedByUserId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ImmunizationEntry_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FamilyHistoryEntry" (
    "id" TEXT NOT NULL,
    "patientUserId" TEXT NOT NULL,
    "relation" TEXT NOT NULL,
    "conditionDisplay" TEXT NOT NULL,
    "notes" TEXT,
    "source" "EmrAttestationSource" NOT NULL DEFAULT 'PATIENT_REPORTED',
    "recordedByUserId" TEXT NOT NULL,
    "deletedAt" TIMESTAMP(3),
    "deletedByUserId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FamilyHistoryEntry_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LifestyleProfile" (
    "patientUserId" TEXT NOT NULL,
    "smoking" TEXT,
    "alcohol" TEXT,
    "activity" TEXT,
    "notes" TEXT,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "LifestyleProfile_pkey" PRIMARY KEY ("patientUserId")
);

-- CreateTable
CREATE TABLE "EmergencyInfo" (
    "patientUserId" TEXT NOT NULL,
    "contactName" TEXT,
    "contactPhone" TEXT,
    "criticalAlertsText" TEXT,
    "clinicianCriticalFlag" BOOLEAN NOT NULL DEFAULT false,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "EmergencyInfo_pkey" PRIMARY KEY ("patientUserId")
);

-- CreateTable
CREATE TABLE "Diagnosis" (
    "id" TEXT NOT NULL,
    "patientUserId" TEXT NOT NULL,
    "appointmentId" TEXT,
    "display" TEXT NOT NULL,
    "icd10Code" TEXT,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "recordedByUserId" TEXT NOT NULL,
    "recordedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deletedAt" TIMESTAMP(3),
    "deletedByUserId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Diagnosis_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DoctorNote" (
    "id" TEXT NOT NULL,
    "appointmentId" TEXT,
    "patientUserId" TEXT NOT NULL,
    "doctorId" TEXT NOT NULL,
    "authorUserId" TEXT NOT NULL,
    "status" "ClinicalNoteStatus" NOT NULL DEFAULT 'DRAFT',
    "version" INTEGER NOT NULL DEFAULT 1,
    "parentNoteId" TEXT,
    "body" TEXT NOT NULL DEFAULT '',
    "contentHash" TEXT,
    "signedAt" TIMESTAMP(3),
    "signerUserId" TEXT,
    "amendmentReason" TEXT,
    "deletedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DoctorNote_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CarePlan" (
    "id" TEXT NOT NULL,
    "patientUserId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "kind" TEXT NOT NULL DEFAULT 'CARE',
    "status" "EmrPlanStatus" NOT NULL DEFAULT 'DRAFT',
    "goals" JSONB,
    "interventions" JSONB,
    "version" INTEGER NOT NULL DEFAULT 1,
    "parentPlanId" TEXT,
    "signedAt" TIMESTAMP(3),
    "signerUserId" TEXT,
    "recordedByUserId" TEXT NOT NULL,
    "deletedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CarePlan_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ConsentType" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "nameEn" TEXT NOT NULL,
    "nameAr" TEXT NOT NULL,

    CONSTRAINT "ConsentType_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ConsentTextVersion" (
    "id" TEXT NOT NULL,
    "typeId" TEXT NOT NULL,
    "version" INTEGER NOT NULL,
    "locale" "LocaleCode" NOT NULL DEFAULT 'AR',
    "body" TEXT NOT NULL,
    "bodyHash" TEXT NOT NULL,
    "effectiveAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ConsentTextVersion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ConsentEvent" (
    "id" TEXT NOT NULL,
    "patientUserId" TEXT NOT NULL,
    "textVersionId" TEXT NOT NULL,
    "kind" "EmrConsentEventKind" NOT NULL,
    "actorUserId" TEXT NOT NULL,
    "at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "evidenceDocumentId" TEXT,

    CONSTRAINT "ConsentEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EmrTimelineEvent" (
    "id" TEXT NOT NULL,
    "patientUserId" TEXT NOT NULL,
    "type" "EmrTimelineEventType" NOT NULL,
    "effectiveAt" TIMESTAMP(3) NOT NULL,
    "actorUserId" TEXT,
    "refType" TEXT NOT NULL,
    "refId" TEXT NOT NULL,
    "visibility" "EmrTimelineVisibility" NOT NULL DEFAULT 'ALL_AUTHORIZED',
    "status" "EmrTimelineEventStatus" NOT NULL DEFAULT 'ACTIVE',
    "title" TEXT NOT NULL,
    "summary" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "EmrTimelineEvent_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "AllergyEntry_patientUserId_deletedAt_idx" ON "AllergyEntry"("patientUserId", "deletedAt");

-- CreateIndex
CREATE INDEX "ConditionEntry_patientUserId_status_deletedAt_idx" ON "ConditionEntry"("patientUserId", "status", "deletedAt");

-- CreateIndex
CREATE INDEX "ImmunizationEntry_patientUserId_deletedAt_idx" ON "ImmunizationEntry"("patientUserId", "deletedAt");

-- CreateIndex
CREATE INDEX "FamilyHistoryEntry_patientUserId_deletedAt_idx" ON "FamilyHistoryEntry"("patientUserId", "deletedAt");

-- CreateIndex
CREATE INDEX "Diagnosis_patientUserId_recordedAt_idx" ON "Diagnosis"("patientUserId", "recordedAt");

-- CreateIndex
CREATE INDEX "Diagnosis_appointmentId_idx" ON "Diagnosis"("appointmentId");

-- CreateIndex
CREATE INDEX "DoctorNote_patientUserId_createdAt_idx" ON "DoctorNote"("patientUserId", "createdAt");

-- CreateIndex
CREATE INDEX "DoctorNote_appointmentId_version_idx" ON "DoctorNote"("appointmentId", "version");

-- CreateIndex
CREATE INDEX "CarePlan_patientUserId_status_idx" ON "CarePlan"("patientUserId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "ConsentType_code_key" ON "ConsentType"("code");

-- CreateIndex
CREATE UNIQUE INDEX "ConsentTextVersion_typeId_version_locale_key" ON "ConsentTextVersion"("typeId", "version", "locale");

-- CreateIndex
CREATE INDEX "ConsentEvent_patientUserId_at_idx" ON "ConsentEvent"("patientUserId", "at");

-- CreateIndex
CREATE INDEX "ConsentEvent_textVersionId_idx" ON "ConsentEvent"("textVersionId");

-- CreateIndex
CREATE INDEX "EmrTimelineEvent_patientUserId_effectiveAt_idx" ON "EmrTimelineEvent"("patientUserId", "effectiveAt");

-- CreateIndex
CREATE INDEX "EmrTimelineEvent_patientUserId_type_status_idx" ON "EmrTimelineEvent"("patientUserId", "type", "status");

-- CreateIndex
CREATE UNIQUE INDEX "EmrTimelineEvent_refType_refId_type_key" ON "EmrTimelineEvent"("refType", "refId", "type");

-- CreateIndex
CREATE INDEX "ClinicalDocument_patientUserId_deletedAt_idx" ON "ClinicalDocument"("patientUserId", "deletedAt");

-- CreateIndex
CREATE INDEX "Prescription_renewedFromId_idx" ON "Prescription"("renewedFromId");

-- AddForeignKey
ALTER TABLE "Prescription" ADD CONSTRAINT "Prescription_renewedFromId_fkey" FOREIGN KEY ("renewedFromId") REFERENCES "Prescription"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AllergyEntry" ADD CONSTRAINT "AllergyEntry_patientUserId_fkey" FOREIGN KEY ("patientUserId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ConditionEntry" ADD CONSTRAINT "ConditionEntry_patientUserId_fkey" FOREIGN KEY ("patientUserId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ImmunizationEntry" ADD CONSTRAINT "ImmunizationEntry_patientUserId_fkey" FOREIGN KEY ("patientUserId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FamilyHistoryEntry" ADD CONSTRAINT "FamilyHistoryEntry_patientUserId_fkey" FOREIGN KEY ("patientUserId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LifestyleProfile" ADD CONSTRAINT "LifestyleProfile_patientUserId_fkey" FOREIGN KEY ("patientUserId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EmergencyInfo" ADD CONSTRAINT "EmergencyInfo_patientUserId_fkey" FOREIGN KEY ("patientUserId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Diagnosis" ADD CONSTRAINT "Diagnosis_patientUserId_fkey" FOREIGN KEY ("patientUserId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DoctorNote" ADD CONSTRAINT "DoctorNote_patientUserId_fkey" FOREIGN KEY ("patientUserId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CarePlan" ADD CONSTRAINT "CarePlan_patientUserId_fkey" FOREIGN KEY ("patientUserId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ConsentTextVersion" ADD CONSTRAINT "ConsentTextVersion_typeId_fkey" FOREIGN KEY ("typeId") REFERENCES "ConsentType"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ConsentEvent" ADD CONSTRAINT "ConsentEvent_patientUserId_fkey" FOREIGN KEY ("patientUserId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ConsentEvent" ADD CONSTRAINT "ConsentEvent_textVersionId_fkey" FOREIGN KEY ("textVersionId") REFERENCES "ConsentTextVersion"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EmrTimelineEvent" ADD CONSTRAINT "EmrTimelineEvent_patientUserId_fkey" FOREIGN KEY ("patientUserId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

