-- CreateEnum
CREATE TYPE "HealthOverallStatus" AS ENUM ('HEALTHY', 'DEGRADED', 'DOWN');

-- CreateEnum
CREATE TYPE "HealthComponentKey" AS ENUM ('APP', 'DATABASE', 'PAYMENTS', 'AI', 'TELEMEDICINE');

-- CreateEnum
CREATE TYPE "AnnouncementSegment" AS ENUM ('PATIENT', 'DOCTOR', 'ALL');

-- CreateEnum
CREATE TYPE "PlatformSettingValueType" AS ENUM ('BOOLEAN', 'STRING', 'JSON');

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "NotificationCategory" ADD VALUE 'SECURITY';
ALTER TYPE "NotificationCategory" ADD VALUE 'HEALTH';
ALTER TYPE "NotificationCategory" ADD VALUE 'AI_GOVERNANCE';
ALTER TYPE "NotificationCategory" ADD VALUE 'ADMIN_OPS';

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "PaymentStatus" ADD VALUE 'PARTIALLY_REFUNDED';
ALTER TYPE "PaymentStatus" ADD VALUE 'DISPUTED';

-- AlterTable
ALTER TABLE "PaymentObligation" ADD COLUMN     "disputeNote" TEXT,
ADD COLUMN     "disputedAt" TIMESTAMP(3),
ADD COLUMN     "disputedByUserId" TEXT,
ADD COLUMN     "refundReason" TEXT,
ADD COLUMN     "refundedAmountCents" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "refundedAt" TIMESTAMP(3),
ADD COLUMN     "refundedByUserId" TEXT;

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "aiDisabledAt" TIMESTAMP(3),
ADD COLUMN     "aiDisabledByUserId" TEXT,
ADD COLUMN     "aiDisabledReason" TEXT;

-- CreateTable
CREATE TABLE "PlatformSetting" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "valueType" "PlatformSettingValueType" NOT NULL,
    "value" TEXT NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "updatedByUserId" TEXT,

    CONSTRAINT "PlatformSetting_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SystemHealthSnapshot" (
    "id" TEXT NOT NULL,
    "overall" "HealthOverallStatus" NOT NULL,
    "checkedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "components" JSONB NOT NULL,

    CONSTRAINT "SystemHealthSnapshot_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AiFlaggedConversation" (
    "id" TEXT NOT NULL,
    "source" TEXT NOT NULL,
    "conversationId" TEXT NOT NULL,
    "reason" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "reviewedAt" TIMESTAMP(3),
    "reviewedByUserId" TEXT,
    "reviewNote" TEXT,

    CONSTRAINT "AiFlaggedConversation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PlatformAnnouncement" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "segment" "AnnouncementSegment" NOT NULL,
    "publishedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "publishedByUserId" TEXT NOT NULL,
    "locale" "LocaleCode",

    CONSTRAINT "PlatformAnnouncement_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "PlatformSetting_key_key" ON "PlatformSetting"("key");

-- CreateIndex
CREATE INDEX "PlatformSetting_key_idx" ON "PlatformSetting"("key");

-- CreateIndex
CREATE INDEX "SystemHealthSnapshot_checkedAt_idx" ON "SystemHealthSnapshot"("checkedAt");

-- CreateIndex
CREATE INDEX "AiFlaggedConversation_reviewedAt_createdAt_idx" ON "AiFlaggedConversation"("reviewedAt", "createdAt");

-- CreateIndex
CREATE INDEX "PaymentObligation_status_createdAt_idx" ON "PaymentObligation"("status", "createdAt");
