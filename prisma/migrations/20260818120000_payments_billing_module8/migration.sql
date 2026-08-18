-- CreateEnum
CREATE TYPE "RefundRequestStatus" AS ENUM ('PENDING_REVIEW', 'APPROVED', 'REJECTED');

-- AlterEnum PaymentStatus (rebuild to add PROCESSING + CANCELLED)
CREATE TYPE "PaymentStatus_new" AS ENUM (
  'PENDING',
  'PROCESSING',
  'PAID',
  'FAILED',
  'CANCELLED',
  'REFUNDED',
  'PARTIALLY_REFUNDED',
  'DISPUTED'
);

ALTER TABLE "PaymentObligation" ALTER COLUMN "status" DROP DEFAULT;
ALTER TABLE "PaymentAttempt" ALTER COLUMN "status" DROP DEFAULT;
ALTER TABLE "PaymentObligation" ALTER COLUMN "status" TYPE "PaymentStatus_new" USING ("status"::text::"PaymentStatus_new");
ALTER TABLE "PaymentAttempt" ALTER COLUMN "status" TYPE "PaymentStatus_new" USING ("status"::text::"PaymentStatus_new");
ALTER TYPE "PaymentStatus" RENAME TO "PaymentStatus_old";
ALTER TYPE "PaymentStatus_new" RENAME TO "PaymentStatus";
DROP TYPE "PaymentStatus_old";
ALTER TABLE "PaymentObligation" ALTER COLUMN "status" SET DEFAULT 'PENDING';
ALTER TABLE "PaymentAttempt" ALTER COLUMN "status" SET DEFAULT 'PENDING';

-- AlterTable PaymentObligation
ALTER TABLE "PaymentObligation" ADD COLUMN IF NOT EXISTS "invoiceNumber" TEXT;
ALTER TABLE "PaymentObligation" ADD COLUMN IF NOT EXISTS "invoicedAt" TIMESTAMP(3);
ALTER TABLE "PaymentObligation" ADD COLUMN IF NOT EXISTS "processingStartedAt" TIMESTAMP(3);
ALTER TABLE "PaymentObligation" ADD COLUMN IF NOT EXISTS "lastReconciledAt" TIMESTAMP(3);

CREATE UNIQUE INDEX IF NOT EXISTS "PaymentObligation_appointmentId_key" ON "PaymentObligation"("appointmentId");
CREATE UNIQUE INDEX IF NOT EXISTS "PaymentObligation_invoiceNumber_key" ON "PaymentObligation"("invoiceNumber");
CREATE INDEX IF NOT EXISTS "PaymentObligation_status_processingStartedAt_idx" ON "PaymentObligation"("status", "processingStartedAt");

-- CreateTable InvoiceSequence
CREATE TABLE "InvoiceSequence" (
    "kind" TEXT NOT NULL,
    "year" INTEGER NOT NULL,
    "lastNumber" INTEGER NOT NULL DEFAULT 0,
    CONSTRAINT "InvoiceSequence_pkey" PRIMARY KEY ("kind","year")
);

-- CreateTable RefundRequest
CREATE TABLE "RefundRequest" (
    "id" TEXT NOT NULL,
    "obligationId" TEXT NOT NULL,
    "patientUserId" TEXT NOT NULL,
    "requestedAmountCents" INTEGER NOT NULL,
    "status" "RefundRequestStatus" NOT NULL DEFAULT 'PENDING_REVIEW',
    "patientNote" TEXT,
    "decisionReason" TEXT,
    "decidedByUserId" TEXT,
    "decidedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "RefundRequest_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "RefundRequest_obligationId_status_idx" ON "RefundRequest"("obligationId", "status");
CREATE INDEX "RefundRequest_status_createdAt_idx" ON "RefundRequest"("status", "createdAt");

-- CreateTable PaymentRefund
CREATE TABLE "PaymentRefund" (
    "id" TEXT NOT NULL,
    "obligationId" TEXT NOT NULL,
    "amountCents" INTEGER NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'SAR',
    "creditNoteNumber" TEXT NOT NULL,
    "reason" TEXT NOT NULL,
    "actorUserId" TEXT NOT NULL,
    "refundRequestId" TEXT,
    "providerRefundId" TEXT,
    "providerHandled" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "PaymentRefund_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "PaymentRefund_creditNoteNumber_key" ON "PaymentRefund"("creditNoteNumber");
CREATE INDEX "PaymentRefund_obligationId_createdAt_idx" ON "PaymentRefund"("obligationId", "createdAt");

ALTER TABLE "RefundRequest" ADD CONSTRAINT "RefundRequest_obligationId_fkey" FOREIGN KEY ("obligationId") REFERENCES "PaymentObligation"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "PaymentRefund" ADD CONSTRAINT "PaymentRefund_obligationId_fkey" FOREIGN KEY ("obligationId") REFERENCES "PaymentObligation"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "PaymentRefund" ADD CONSTRAINT "PaymentRefund_refundRequestId_fkey" FOREIGN KEY ("refundRequestId") REFERENCES "RefundRequest"("id") ON DELETE SET NULL ON UPDATE CASCADE;
