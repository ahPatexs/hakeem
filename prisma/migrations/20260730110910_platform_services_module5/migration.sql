-- CreateEnum
CREATE TYPE "BackgroundJobState" AS ENUM ('QUEUED', 'RUNNING', 'SUCCEEDED', 'FAILED');

-- CreateEnum
CREATE TYPE "OutboundChannel" AS ENUM ('EMAIL', 'SMS', 'PUSH');

-- CreateEnum
CREATE TYPE "OutboundMessageStatus" AS ENUM ('QUEUED', 'SENT', 'FAILED', 'SKIPPED');

-- CreateEnum
CREATE TYPE "PushDevicePlatform" AS ENUM ('WEB', 'IOS', 'ANDROID');

-- CreateTable
CREATE TABLE "BackgroundJob" (
    "id" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "idempotencyKey" TEXT NOT NULL,
    "payload" JSONB NOT NULL,
    "state" "BackgroundJobState" NOT NULL DEFAULT 'QUEUED',
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "maxAttempts" INTEGER NOT NULL DEFAULT 5,
    "runAfter" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastError" TEXT,
    "lockedAt" TIMESTAMP(3),
    "lockedBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BackgroundJob_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WebhookReceipt" (
    "id" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "providerEventId" TEXT NOT NULL,
    "eventType" TEXT NOT NULL,
    "signatureValid" BOOLEAN NOT NULL,
    "processedAt" TIMESTAMP(3),
    "obligationId" TEXT,
    "rawHash" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "WebhookReceipt_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OutboundMessage" (
    "id" TEXT NOT NULL,
    "channel" "OutboundChannel" NOT NULL,
    "purpose" TEXT NOT NULL,
    "recipientUserId" TEXT,
    "toAddress" TEXT NOT NULL,
    "locale" "LocaleCode" NOT NULL DEFAULT 'AR',
    "templateKey" TEXT,
    "status" "OutboundMessageStatus" NOT NULL DEFAULT 'QUEUED',
    "idempotencyKey" TEXT NOT NULL,
    "providerMessageId" TEXT,
    "relatedNotificationId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "sentAt" TIMESTAMP(3),

    CONSTRAINT "OutboundMessage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SearchDoctorProjection" (
    "doctorId" TEXT NOT NULL,
    "nameEn" TEXT NOT NULL,
    "nameAr" TEXT NOT NULL,
    "specialtyKeys" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "city" TEXT,
    "isBookable" BOOLEAN NOT NULL DEFAULT false,
    "isPublished" BOOLEAN NOT NULL DEFAULT false,
    "searchText" TEXT NOT NULL,
    "indexedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SearchDoctorProjection_pkey" PRIMARY KEY ("doctorId")
);

-- CreateTable
CREATE TABLE "PushDeviceRegistration" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "platform" "PushDevicePlatform" NOT NULL DEFAULT 'WEB',
    "lastSeenAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "revokedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PushDeviceRegistration_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "BackgroundJob_state_runAfter_idx" ON "BackgroundJob"("state", "runAfter");

-- CreateIndex
CREATE UNIQUE INDEX "BackgroundJob_type_idempotencyKey_key" ON "BackgroundJob"("type", "idempotencyKey");

-- CreateIndex
CREATE INDEX "WebhookReceipt_createdAt_idx" ON "WebhookReceipt"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "WebhookReceipt_provider_providerEventId_key" ON "WebhookReceipt"("provider", "providerEventId");

-- CreateIndex
CREATE UNIQUE INDEX "OutboundMessage_idempotencyKey_key" ON "OutboundMessage"("idempotencyKey");

-- CreateIndex
CREATE INDEX "OutboundMessage_recipientUserId_createdAt_idx" ON "OutboundMessage"("recipientUserId", "createdAt");

-- CreateIndex
CREATE INDEX "OutboundMessage_status_createdAt_idx" ON "OutboundMessage"("status", "createdAt");

-- CreateIndex
CREATE INDEX "SearchDoctorProjection_isBookable_isPublished_idx" ON "SearchDoctorProjection"("isBookable", "isPublished");

-- CreateIndex
CREATE INDEX "PushDeviceRegistration_userId_revokedAt_idx" ON "PushDeviceRegistration"("userId", "revokedAt");

-- CreateIndex
CREATE UNIQUE INDEX "PushDeviceRegistration_userId_tokenHash_key" ON "PushDeviceRegistration"("userId", "tokenHash");

-- AddForeignKey
ALTER TABLE "PushDeviceRegistration" ADD CONSTRAINT "PushDeviceRegistration_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
