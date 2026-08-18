import { Prisma, type BackgroundJob, type BackgroundJobState } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { redactErrorMessage } from "@/lib/platform/redact";
import { canRetry, DEFAULT_MAX_ATTEMPTS, nextDelayMs } from "@/domain/platform/retry";
import { platformFail, platformOk, type PlatformResult } from "@/domain/platform/outcomes";

export const BACKGROUND_JOB_TYPES = [
  "OUTBOUND_EMAIL",
  "OUTBOUND_SMS",
  "OUTBOUND_PUSH",
  "MALWARE_SCAN",
  "SEARCH_REFRESH_DOCTOR",
  "WEBHOOK_SIDE_EFFECT",
  "NOTIFY_ADMINS_FANOUT",
  "VIDEO_RECORDING_FINALIZE",
  "PAYMENT_RECONCILE",
  "PAYMENT_RECEIPT_SIDE_EFFECT",
] as const;

export type BackgroundJobType = (typeof BACKGROUND_JOB_TYPES)[number];

export function isBackgroundJobType(value: string): value is BackgroundJobType {
  return (BACKGROUND_JOB_TYPES as readonly string[]).includes(value);
}

export type EnqueueJobInput = {
  type: BackgroundJobType;
  idempotencyKey: string;
  payload: Prisma.InputJsonValue;
  runAfter?: Date;
  maxAttempts?: number;
};

export type ClaimedJob = BackgroundJob;

function resolveWorkerId(): string {
  return process.env.VERCEL_REGION ?? process.env.HOSTNAME ?? "local-worker";
}

export async function enqueueJob(input: EnqueueJobInput): Promise<PlatformResult<{ jobId: string }>> {
  if (!input.idempotencyKey.trim()) {
    return platformFail("VALIDATION_ERROR", "idempotencyKey is required");
  }

  const existing = await prisma.backgroundJob.findUnique({
    where: {
      type_idempotencyKey: {
        type: input.type,
        idempotencyKey: input.idempotencyKey,
      },
    },
    select: { id: true },
  });
  if (existing) {
    return platformOk({ jobId: existing.id });
  }

  try {
    const job = await prisma.backgroundJob.create({
      data: {
        type: input.type,
        idempotencyKey: input.idempotencyKey,
        payload: input.payload,
        runAfter: input.runAfter ?? new Date(),
        maxAttempts: input.maxAttempts ?? DEFAULT_MAX_ATTEMPTS,
      },
      select: { id: true },
    });
    return platformOk({ jobId: job.id });
  } catch (error) {
    if (
      error instanceof Error &&
      "code" in error &&
      (error as { code?: string }).code === "P2002"
    ) {
      const dup = await prisma.backgroundJob.findUnique({
        where: {
          type_idempotencyKey: {
            type: input.type,
            idempotencyKey: input.idempotencyKey,
          },
        },
        select: { id: true },
      });
      if (dup) return platformOk({ jobId: dup.id });
    }
    return platformFail("INTERNAL_FAILURE", redactErrorMessage(error));
  }
}

export async function claimDueJobs(limit: number, workerId = resolveWorkerId()): Promise<ClaimedJob[]> {
  const safeLimit = Math.max(1, Math.min(limit, 100));
  const defaultPerType = Number(process.env.PLATFORM_JOB_CONCURRENCY_PER_TYPE ?? "5");
  const perTypeCap = Math.max(1, Math.min(Number.isFinite(defaultPerType) ? defaultPerType : 5, 50));

  // Soft per-type concurrency: skip types already at RUNNING capacity (FR-048).
  const runningByType = await prisma.backgroundJob.groupBy({
    by: ["type"],
    where: { state: "RUNNING" },
    _count: { _all: true },
  });
  const saturated = new Set(
    runningByType.filter((r) => r._count._all >= perTypeCap).map((r) => r.type),
  );

  const typeFilter =
    saturated.size > 0
      ? prisma.$queryRaw<ClaimedJob[]>`
    UPDATE "BackgroundJob"
    SET
      state = 'RUNNING'::"BackgroundJobState",
      "lockedAt" = NOW(),
      "lockedBy" = ${workerId},
      attempts = attempts + 1,
      "updatedAt" = NOW()
    WHERE id IN (
      SELECT id
      FROM "BackgroundJob"
      WHERE state = 'QUEUED'::"BackgroundJobState"
        AND "runAfter" <= NOW()
        AND attempts < "maxAttempts"
        AND type::text NOT IN (${Prisma.join([...saturated])})
      ORDER BY "runAfter" ASC
      LIMIT ${safeLimit}
      FOR UPDATE SKIP LOCKED
    )
    RETURNING *
  `
      : prisma.$queryRaw<ClaimedJob[]>`
    UPDATE "BackgroundJob"
    SET
      state = 'RUNNING'::"BackgroundJobState",
      "lockedAt" = NOW(),
      "lockedBy" = ${workerId},
      attempts = attempts + 1,
      "updatedAt" = NOW()
    WHERE id IN (
      SELECT id
      FROM "BackgroundJob"
      WHERE state = 'QUEUED'::"BackgroundJobState"
        AND "runAfter" <= NOW()
        AND attempts < "maxAttempts"
      ORDER BY "runAfter" ASC
      LIMIT ${safeLimit}
      FOR UPDATE SKIP LOCKED
    )
    RETURNING *
  `;

  return typeFilter;
}

export async function completeJob(jobId: string): Promise<void> {
  await prisma.backgroundJob.update({
    where: { id: jobId },
    data: {
      state: "SUCCEEDED" satisfies BackgroundJobState,
      lastError: null,
      lockedAt: null,
      lockedBy: null,
    },
  });
}

export async function failJob(jobId: string, error: unknown): Promise<{ deadLetter: boolean }> {
  const job = await prisma.backgroundJob.findUnique({ where: { id: jobId } });
  if (!job) return { deadLetter: false };

  const message = redactErrorMessage(error);
  if (canRetry(job.attempts, job.maxAttempts)) {
    await prisma.backgroundJob.update({
      where: { id: jobId },
      data: {
        state: "QUEUED",
        runAfter: new Date(Date.now() + nextDelayMs(job.attempts)),
        lastError: message,
        lockedAt: null,
        lockedBy: null,
      },
    });
    return { deadLetter: false };
  }

  await prisma.backgroundJob.update({
    where: { id: jobId },
    data: {
      state: "FAILED",
      lastError: message,
      lockedAt: null,
      lockedBy: null,
    },
  });

  try {
    const { notifyAdmins } = await import("@/lib/admin/notify-admins");
    await notifyAdmins({
      category: "HEALTH",
      title: `Background job dead-lettered: ${job.type}`,
      body: `Job ${jobId} failed after ${job.attempts} attempt(s). ${message.slice(0, 200)}`,
      href: "/admin/health",
    });
  } catch {
    // Best-effort admin signal; dead-letter state already persisted.
  }

  return { deadLetter: true };
}
