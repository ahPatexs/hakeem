-- CreateEnum
CREATE TYPE "AppointmentStatus" AS ENUM ('HELD', 'CONFIRMED', 'CANCELLED', 'COMPLETED', 'NO_SHOW', 'IN_PROGRESS');

-- CreateEnum
CREATE TYPE "AppointmentMode" AS ENUM ('IN_PERSON', 'VIDEO');

-- CreateEnum
CREATE TYPE "LabReleaseStatus" AS ENUM ('PENDING_REVIEW', 'RELEASED', 'RETRACTED', 'SUPERSEDED');

-- CreateEnum
CREATE TYPE "LabResultPhase" AS ENUM ('PRELIMINARY', 'FINAL');

-- CreateEnum
CREATE TYPE "PrescriptionStatus" AS ENUM ('ACTIVE', 'COMPLETED', 'CANCELLED', 'EXPIRED');

-- CreateEnum
CREATE TYPE "PaymentStatus" AS ENUM ('PENDING', 'PAID', 'FAILED', 'REFUNDED');

-- CreateEnum
CREATE TYPE "NotificationCategory" AS ENUM ('APPOINTMENT', 'CLINICAL', 'PRESCRIPTION', 'PAYMENT', 'SYSTEM');

-- CreateEnum
CREATE TYPE "UploadScanStatus" AS ENUM ('PENDING', 'CLEAN', 'REJECTED');

-- CreateEnum
CREATE TYPE "ClinicalDocumentKind" AS ENUM ('RECORD_ATTACHMENT', 'LAB_ATTACHMENT', 'PATIENT_UPLOAD', 'RECEIPT');

-- CreateTable
CREATE TABLE "PatientProfile" (
    "userId" TEXT NOT NULL,
    "phone" TEXT,
    "dateOfBirth" TIMESTAMP(3),
    "sexAtBirth" TEXT,
    "addressLine1" TEXT,
    "city" TEXT,
    "region" TEXT,
    "emergencyContactName" TEXT,
    "emergencyContactPhone" TEXT,
    "insuranceProvider" TEXT,
    "insurancePolicyNumber" TEXT,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PatientProfile_pkey" PRIMARY KEY ("userId")
);

-- CreateTable
CREATE TABLE "MedicalProfile" (
    "userId" TEXT NOT NULL,
    "bloodType" TEXT,
    "allergies" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "conditions" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "currentMedications" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "notes" TEXT,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MedicalProfile_pkey" PRIMARY KEY ("userId")
);

-- CreateTable
CREATE TABLE "PortalSettings" (
    "userId" TEXT NOT NULL,
    "locale" "LocaleCode" NOT NULL DEFAULT 'AR',
    "theme" TEXT NOT NULL DEFAULT 'system',
    "notifyAppointmentEmail" BOOLEAN NOT NULL DEFAULT true,
    "notifyClinicalEmail" BOOLEAN NOT NULL DEFAULT true,
    "notifyPrescriptionEmail" BOOLEAN NOT NULL DEFAULT true,
    "notifyPaymentEmail" BOOLEAN NOT NULL DEFAULT true,
    "notifySystemEmail" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "PortalSettings_pkey" PRIMARY KEY ("userId")
);

-- CreateTable
CREATE TABLE "PatientUpload" (
    "id" TEXT NOT NULL,
    "patientUserId" TEXT NOT NULL,
    "fileName" TEXT NOT NULL,
    "contentType" TEXT NOT NULL,
    "sizeBytes" INTEGER NOT NULL,
    "storageKey" TEXT NOT NULL,
    "scanStatus" "UploadScanStatus" NOT NULL DEFAULT 'PENDING',
    "purpose" TEXT NOT NULL DEFAULT 'other',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PatientUpload_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Appointment" (
    "id" TEXT NOT NULL,
    "patientUserId" TEXT NOT NULL,
    "doctorId" TEXT NOT NULL,
    "mode" "AppointmentMode" NOT NULL,
    "status" "AppointmentStatus" NOT NULL DEFAULT 'HELD',
    "startAt" TIMESTAMP(3) NOT NULL,
    "endAt" TIMESTAMP(3) NOT NULL,
    "holdExpiresAt" TIMESTAMP(3),
    "locationText" TEXT,
    "reason" TEXT,
    "cancellationReason" TEXT,
    "rescheduledFromId" TEXT,
    "videoRoomId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Appointment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ClinicalDocument" (
    "id" TEXT NOT NULL,
    "patientUserId" TEXT NOT NULL,
    "kind" "ClinicalDocumentKind" NOT NULL,
    "title" TEXT NOT NULL,
    "contentType" TEXT NOT NULL,
    "storageKey" TEXT NOT NULL,
    "byteSize" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ClinicalDocument_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MedicalRecord" (
    "id" TEXT NOT NULL,
    "patientUserId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "recordType" TEXT NOT NULL,
    "summary" TEXT,
    "recordedAt" TIMESTAMP(3) NOT NULL,
    "doctorId" TEXT,
    "documentId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MedicalRecord_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LabResult" (
    "id" TEXT NOT NULL,
    "patientUserId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "panelCode" TEXT,
    "releaseStatus" "LabReleaseStatus" NOT NULL DEFAULT 'PENDING_REVIEW',
    "phase" "LabResultPhase" NOT NULL DEFAULT 'FINAL',
    "criticalFlag" BOOLEAN NOT NULL DEFAULT false,
    "resultedAt" TIMESTAMP(3) NOT NULL,
    "summary" TEXT,
    "documentId" TEXT,
    "supersededById" TEXT,

    CONSTRAINT "LabResult_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Prescription" (
    "id" TEXT NOT NULL,
    "patientUserId" TEXT NOT NULL,
    "medicationName" TEXT NOT NULL,
    "instructions" TEXT NOT NULL,
    "status" "PrescriptionStatus" NOT NULL DEFAULT 'ACTIVE',
    "prescribedAt" TIMESTAMP(3) NOT NULL,
    "startsAt" TIMESTAMP(3),
    "endsAt" TIMESTAMP(3),
    "doctorId" TEXT,
    "documentId" TEXT,

    CONSTRAINT "Prescription_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PaymentObligation" (
    "id" TEXT NOT NULL,
    "patientUserId" TEXT NOT NULL,
    "appointmentId" TEXT,
    "description" TEXT NOT NULL,
    "amountCents" INTEGER NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'SAR',
    "status" "PaymentStatus" NOT NULL DEFAULT 'PENDING',
    "providerRef" TEXT,
    "idempotencyKey" TEXT NOT NULL,
    "receiptDocumentId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PaymentObligation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PaymentAttempt" (
    "id" TEXT NOT NULL,
    "obligationId" TEXT NOT NULL,
    "providerIntentId" TEXT NOT NULL,
    "status" "PaymentStatus" NOT NULL DEFAULT 'PENDING',
    "rawEventId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PaymentAttempt_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Notification" (
    "id" TEXT NOT NULL,
    "patientUserId" TEXT NOT NULL,
    "category" "NotificationCategory" NOT NULL,
    "title" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "href" TEXT,
    "readAt" TIMESTAMP(3),
    "dismissedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Notification_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AiConversation" (
    "id" TEXT NOT NULL,
    "patientUserId" TEXT NOT NULL,
    "locale" "LocaleCode" NOT NULL DEFAULT 'AR',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AiConversation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AiMessage" (
    "id" TEXT NOT NULL,
    "conversationId" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AiMessage_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "PatientUpload_patientUserId_createdAt_idx" ON "PatientUpload"("patientUserId", "createdAt");

-- CreateIndex
CREATE INDEX "Appointment_patientUserId_startAt_idx" ON "Appointment"("patientUserId", "startAt");

-- CreateIndex
CREATE INDEX "Appointment_doctorId_startAt_idx" ON "Appointment"("doctorId", "startAt");

-- CreateIndex
CREATE INDEX "Appointment_status_holdExpiresAt_idx" ON "Appointment"("status", "holdExpiresAt");

-- CreateIndex
CREATE INDEX "ClinicalDocument_patientUserId_createdAt_idx" ON "ClinicalDocument"("patientUserId", "createdAt");

-- CreateIndex
CREATE INDEX "MedicalRecord_patientUserId_recordedAt_idx" ON "MedicalRecord"("patientUserId", "recordedAt");

-- CreateIndex
CREATE INDEX "LabResult_patientUserId_resultedAt_idx" ON "LabResult"("patientUserId", "resultedAt");

-- CreateIndex
CREATE INDEX "LabResult_patientUserId_releaseStatus_idx" ON "LabResult"("patientUserId", "releaseStatus");

-- CreateIndex
CREATE INDEX "Prescription_patientUserId_status_idx" ON "Prescription"("patientUserId", "status");

-- CreateIndex
CREATE INDEX "Prescription_patientUserId_prescribedAt_idx" ON "Prescription"("patientUserId", "prescribedAt");

-- CreateIndex
CREATE UNIQUE INDEX "PaymentObligation_idempotencyKey_key" ON "PaymentObligation"("idempotencyKey");

-- CreateIndex
CREATE INDEX "PaymentObligation_patientUserId_createdAt_idx" ON "PaymentObligation"("patientUserId", "createdAt");

-- CreateIndex
CREATE INDEX "PaymentObligation_patientUserId_status_idx" ON "PaymentObligation"("patientUserId", "status");

-- CreateIndex
CREATE INDEX "PaymentAttempt_obligationId_createdAt_idx" ON "PaymentAttempt"("obligationId", "createdAt");

-- CreateIndex
CREATE INDEX "Notification_patientUserId_createdAt_idx" ON "Notification"("patientUserId", "createdAt");

-- CreateIndex
CREATE INDEX "Notification_patientUserId_readAt_idx" ON "Notification"("patientUserId", "readAt");

-- CreateIndex
CREATE INDEX "AiConversation_patientUserId_updatedAt_idx" ON "AiConversation"("patientUserId", "updatedAt");

-- CreateIndex
CREATE INDEX "AiMessage_conversationId_createdAt_idx" ON "AiMessage"("conversationId", "createdAt");

-- AddForeignKey
ALTER TABLE "PatientProfile" ADD CONSTRAINT "PatientProfile_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MedicalProfile" ADD CONSTRAINT "MedicalProfile_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PortalSettings" ADD CONSTRAINT "PortalSettings_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PatientUpload" ADD CONSTRAINT "PatientUpload_patientUserId_fkey" FOREIGN KEY ("patientUserId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Appointment" ADD CONSTRAINT "Appointment_patientUserId_fkey" FOREIGN KEY ("patientUserId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Appointment" ADD CONSTRAINT "Appointment_doctorId_fkey" FOREIGN KEY ("doctorId") REFERENCES "Doctor"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClinicalDocument" ADD CONSTRAINT "ClinicalDocument_patientUserId_fkey" FOREIGN KEY ("patientUserId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MedicalRecord" ADD CONSTRAINT "MedicalRecord_patientUserId_fkey" FOREIGN KEY ("patientUserId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MedicalRecord" ADD CONSTRAINT "MedicalRecord_doctorId_fkey" FOREIGN KEY ("doctorId") REFERENCES "Doctor"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MedicalRecord" ADD CONSTRAINT "MedicalRecord_documentId_fkey" FOREIGN KEY ("documentId") REFERENCES "ClinicalDocument"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LabResult" ADD CONSTRAINT "LabResult_patientUserId_fkey" FOREIGN KEY ("patientUserId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LabResult" ADD CONSTRAINT "LabResult_documentId_fkey" FOREIGN KEY ("documentId") REFERENCES "ClinicalDocument"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Prescription" ADD CONSTRAINT "Prescription_patientUserId_fkey" FOREIGN KEY ("patientUserId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Prescription" ADD CONSTRAINT "Prescription_doctorId_fkey" FOREIGN KEY ("doctorId") REFERENCES "Doctor"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Prescription" ADD CONSTRAINT "Prescription_documentId_fkey" FOREIGN KEY ("documentId") REFERENCES "ClinicalDocument"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PaymentObligation" ADD CONSTRAINT "PaymentObligation_patientUserId_fkey" FOREIGN KEY ("patientUserId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PaymentObligation" ADD CONSTRAINT "PaymentObligation_appointmentId_fkey" FOREIGN KEY ("appointmentId") REFERENCES "Appointment"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PaymentObligation" ADD CONSTRAINT "PaymentObligation_receiptDocumentId_fkey" FOREIGN KEY ("receiptDocumentId") REFERENCES "ClinicalDocument"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PaymentAttempt" ADD CONSTRAINT "PaymentAttempt_obligationId_fkey" FOREIGN KEY ("obligationId") REFERENCES "PaymentObligation"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Notification" ADD CONSTRAINT "Notification_patientUserId_fkey" FOREIGN KEY ("patientUserId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AiConversation" ADD CONSTRAINT "AiConversation_patientUserId_fkey" FOREIGN KEY ("patientUserId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AiMessage" ADD CONSTRAINT "AiMessage_conversationId_fkey" FOREIGN KEY ("conversationId") REFERENCES "AiConversation"("id") ON DELETE CASCADE ON UPDATE CASCADE;
