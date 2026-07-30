-- Rename Notification recipient column (T124)
ALTER TABLE "Notification" RENAME COLUMN "patientUserId" TO "recipientUserId";

ALTER INDEX "Notification_patientUserId_createdAt_idx" RENAME TO "Notification_recipientUserId_createdAt_idx";
ALTER INDEX "Notification_patientUserId_readAt_idx" RENAME TO "Notification_recipientUserId_readAt_idx";
ALTER TABLE "Notification" RENAME CONSTRAINT "Notification_patientUserId_fkey" TO "Notification_recipientUserId_fkey";
