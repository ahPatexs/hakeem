-- CreateEnum
CREATE TYPE "VideoSessionState" AS ENUM ('SCHEDULED', 'WAITING', 'IN_CALL', 'ENDED', 'CANCELLED');

-- CreateTable
CREATE TABLE "VideoSession" (
    "id" TEXT NOT NULL,
    "appointmentId" TEXT NOT NULL,
    "provider" TEXT NOT NULL DEFAULT 'stub',
    "roomId" TEXT NOT NULL,
    "roomName" TEXT NOT NULL,
    "state" "VideoSessionState" NOT NULL DEFAULT 'SCHEDULED',
    "recordingEnabled" BOOLEAN NOT NULL DEFAULT false,
    "startedAt" TIMESTAMP(3),
    "endedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "VideoSession_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VideoCallEvent" (
    "id" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "actorUserId" TEXT,
    "kind" TEXT NOT NULL,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "VideoCallEvent_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "VideoSession_appointmentId_key" ON "VideoSession"("appointmentId");

-- CreateIndex
CREATE INDEX "VideoSession_state_createdAt_idx" ON "VideoSession"("state", "createdAt");

-- CreateIndex
CREATE INDEX "VideoSession_provider_createdAt_idx" ON "VideoSession"("provider", "createdAt");

-- CreateIndex
CREATE INDEX "VideoCallEvent_sessionId_createdAt_idx" ON "VideoCallEvent"("sessionId", "createdAt");

-- CreateIndex
CREATE INDEX "VideoCallEvent_kind_createdAt_idx" ON "VideoCallEvent"("kind", "createdAt");

-- AddForeignKey
ALTER TABLE "VideoSession" ADD CONSTRAINT "VideoSession_appointmentId_fkey" FOREIGN KEY ("appointmentId") REFERENCES "Appointment"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VideoCallEvent" ADD CONSTRAINT "VideoCallEvent_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "VideoSession"("id") ON DELETE CASCADE ON UPDATE CASCADE;
