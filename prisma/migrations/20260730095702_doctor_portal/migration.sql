-- CreateEnum
CREATE TYPE "ClinicalNoteStatus" AS ENUM ('DRAFT', 'FINAL', 'DISMISSED');

-- CreateEnum
CREATE TYPE "DoctorAiMode" AS ENUM ('MEDICAL', 'DOCUMENTATION', 'PRESCRIPTION');

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "AppointmentStatus" ADD VALUE 'CHECKED_IN';
ALTER TYPE "AppointmentStatus" ADD VALUE 'RESCHEDULED';

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "NotificationCategory" ADD VALUE 'QUEUE';
ALTER TYPE "NotificationCategory" ADD VALUE 'DOCUMENTATION';
ALTER TYPE "NotificationCategory" ADD VALUE 'RESULTS';

-- AlterEnum
ALTER TYPE "PrescriptionStatus" ADD VALUE 'DRAFT';

-- AlterTable
ALTER TABLE "Appointment" ADD COLUMN     "checkedInAt" TIMESTAMP(3),
ADD COLUMN     "completedAt" TIMESTAMP(3),
ADD COLUMN     "noShowAt" TIMESTAMP(3),
ADD COLUMN     "noShowReason" TEXT;

-- AlterTable
ALTER TABLE "Prescription" ADD COLUMN     "aiAssisted" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "allergyAckAt" TIMESTAMP(3),
ADD COLUMN     "appointmentId" TEXT,
ADD COLUMN     "contentVersion" INTEGER NOT NULL DEFAULT 1,
ADD COLUMN     "interactionAckAt" TIMESTAMP(3),
ADD COLUMN     "signedAt" TIMESTAMP(3),
ADD COLUMN     "signerUserId" TEXT;

-- CreateTable
CREATE TABLE "PrescriptionLine" (
    "id" TEXT NOT NULL,
    "prescriptionId" TEXT NOT NULL,
    "medicationName" TEXT NOT NULL,
    "dose" TEXT,
    "route" TEXT,
    "frequency" TEXT,
    "duration" TEXT,
    "quantity" TEXT,
    "instructions" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "PrescriptionLine_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SoapNote" (
    "id" TEXT NOT NULL,
    "appointmentId" TEXT NOT NULL,
    "patientUserId" TEXT NOT NULL,
    "doctorId" TEXT NOT NULL,
    "authorUserId" TEXT NOT NULL,
    "status" "ClinicalNoteStatus" NOT NULL DEFAULT 'DRAFT',
    "version" INTEGER NOT NULL DEFAULT 1,
    "parentNoteId" TEXT,
    "subjective" TEXT NOT NULL DEFAULT '',
    "objective" TEXT NOT NULL DEFAULT '',
    "assessment" TEXT NOT NULL DEFAULT '',
    "plan" TEXT NOT NULL DEFAULT '',
    "contentHash" TEXT,
    "signedAt" TIMESTAMP(3),
    "signerUserId" TEXT,
    "amendmentReason" TEXT,
    "lateAmendment" BOOLEAN NOT NULL DEFAULT false,
    "dismissedAt" TIMESTAMP(3),
    "dismissReason" TEXT,
    "aiAssisted" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SoapNote_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ClinicalSummary" (
    "id" TEXT NOT NULL,
    "appointmentId" TEXT NOT NULL,
    "patientUserId" TEXT NOT NULL,
    "doctorId" TEXT NOT NULL,
    "authorUserId" TEXT NOT NULL,
    "status" "ClinicalNoteStatus" NOT NULL DEFAULT 'DRAFT',
    "version" INTEGER NOT NULL DEFAULT 1,
    "parentSummaryId" TEXT,
    "body" TEXT NOT NULL DEFAULT '',
    "contentHash" TEXT,
    "signedAt" TIMESTAMP(3),
    "signerUserId" TEXT,
    "amendmentReason" TEXT,
    "lateAmendment" BOOLEAN NOT NULL DEFAULT false,
    "dismissedAt" TIMESTAMP(3),
    "dismissReason" TEXT,
    "aiAssisted" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ClinicalSummary_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LabReviewAcknowledgement" (
    "id" TEXT NOT NULL,
    "labResultId" TEXT NOT NULL,
    "doctorUserId" TEXT NOT NULL,
    "reviewedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "LabReviewAcknowledgement_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DoctorAiConversation" (
    "id" TEXT NOT NULL,
    "doctorUserId" TEXT NOT NULL,
    "mode" "DoctorAiMode" NOT NULL DEFAULT 'MEDICAL',
    "patientUserId" TEXT,
    "appointmentId" TEXT,
    "locale" "LocaleCode" NOT NULL DEFAULT 'EN',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DoctorAiConversation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DoctorAiMessage" (
    "id" TEXT NOT NULL,
    "conversationId" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DoctorAiMessage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DoctorPatientPanel" (
    "id" TEXT NOT NULL,
    "doctorId" TEXT NOT NULL,
    "patientUserId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DoctorPatientPanel_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DoctorProfileExtras" (
    "userId" TEXT NOT NULL,
    "bio" TEXT,
    "languages" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "consultationPrefs" JSONB,
    "timezone" TEXT,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DoctorProfileExtras_pkey" PRIMARY KEY ("userId")
);

-- CreateIndex
CREATE INDEX "PrescriptionLine_prescriptionId_sortOrder_idx" ON "PrescriptionLine"("prescriptionId", "sortOrder");

-- CreateIndex
CREATE INDEX "SoapNote_appointmentId_version_idx" ON "SoapNote"("appointmentId", "version");

-- CreateIndex
CREATE INDEX "SoapNote_doctorId_status_idx" ON "SoapNote"("doctorId", "status");

-- CreateIndex
CREATE INDEX "SoapNote_patientUserId_createdAt_idx" ON "SoapNote"("patientUserId", "createdAt");

-- CreateIndex
CREATE INDEX "ClinicalSummary_appointmentId_version_idx" ON "ClinicalSummary"("appointmentId", "version");

-- CreateIndex
CREATE INDEX "ClinicalSummary_doctorId_status_idx" ON "ClinicalSummary"("doctorId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "LabReviewAcknowledgement_labResultId_doctorUserId_key" ON "LabReviewAcknowledgement"("labResultId", "doctorUserId");

-- CreateIndex
CREATE INDEX "DoctorAiConversation_doctorUserId_updatedAt_idx" ON "DoctorAiConversation"("doctorUserId", "updatedAt");

-- CreateIndex
CREATE INDEX "DoctorAiMessage_conversationId_createdAt_idx" ON "DoctorAiMessage"("conversationId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "DoctorPatientPanel_doctorId_patientUserId_key" ON "DoctorPatientPanel"("doctorId", "patientUserId");

-- CreateIndex
CREATE INDEX "Appointment_doctorId_status_idx" ON "Appointment"("doctorId", "status");

-- CreateIndex
CREATE INDEX "Appointment_doctorId_checkedInAt_idx" ON "Appointment"("doctorId", "checkedInAt");

-- CreateIndex
CREATE INDEX "Prescription_doctorId_status_idx" ON "Prescription"("doctorId", "status");

-- CreateIndex
CREATE INDEX "Prescription_appointmentId_idx" ON "Prescription"("appointmentId");

-- AddForeignKey
ALTER TABLE "Prescription" ADD CONSTRAINT "Prescription_appointmentId_fkey" FOREIGN KEY ("appointmentId") REFERENCES "Appointment"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PrescriptionLine" ADD CONSTRAINT "PrescriptionLine_prescriptionId_fkey" FOREIGN KEY ("prescriptionId") REFERENCES "Prescription"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SoapNote" ADD CONSTRAINT "SoapNote_appointmentId_fkey" FOREIGN KEY ("appointmentId") REFERENCES "Appointment"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SoapNote" ADD CONSTRAINT "SoapNote_patientUserId_fkey" FOREIGN KEY ("patientUserId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClinicalSummary" ADD CONSTRAINT "ClinicalSummary_appointmentId_fkey" FOREIGN KEY ("appointmentId") REFERENCES "Appointment"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClinicalSummary" ADD CONSTRAINT "ClinicalSummary_patientUserId_fkey" FOREIGN KEY ("patientUserId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LabReviewAcknowledgement" ADD CONSTRAINT "LabReviewAcknowledgement_labResultId_fkey" FOREIGN KEY ("labResultId") REFERENCES "LabResult"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LabReviewAcknowledgement" ADD CONSTRAINT "LabReviewAcknowledgement_doctorUserId_fkey" FOREIGN KEY ("doctorUserId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DoctorAiConversation" ADD CONSTRAINT "DoctorAiConversation_doctorUserId_fkey" FOREIGN KEY ("doctorUserId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DoctorAiMessage" ADD CONSTRAINT "DoctorAiMessage_conversationId_fkey" FOREIGN KEY ("conversationId") REFERENCES "DoctorAiConversation"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DoctorPatientPanel" ADD CONSTRAINT "DoctorPatientPanel_patientUserId_fkey" FOREIGN KEY ("patientUserId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DoctorProfileExtras" ADD CONSTRAINT "DoctorProfileExtras_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
