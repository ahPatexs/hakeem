import {
  claimDueJobs,
  completeJob,
  enqueueJob,
  failJob,
  isBackgroundJobType,
  type EnqueueJobInput,
} from "@/domain/platform/jobs";
import { handleBackgroundJob } from "@/domain/platform/job-handlers";
import { notifyAdmins } from "@/lib/admin/notify-admins";
import type { PlatformResult } from "@/domain/platform/outcomes";

export { enqueueJob, claimDueJobs, completeJob, failJob };
export type { EnqueueJobInput, BackgroundJobType } from "@/domain/platform/jobs";

export async function processDueJobs(limit = 25): Promise<{
  processed: number;
  failed: number;
  deadLetter: number;
}> {
  const jobs = await claimDueJobs(limit);
  let processed = 0;
  let failed = 0;
  let deadLetter = 0;

  for (const job of jobs) {
    if (!isBackgroundJobType(job.type)) {
      const result = await failJob(job.id, new Error(`UNSUPPORTED_JOB_TYPE:${job.type}`));
      failed += 1;
      if (result.deadLetter) deadLetter += 1;
      continue;
    }

    try {
      await handleBackgroundJob(job.type, job.payload);
      await completeJob(job.id);
      processed += 1;
    } catch (error) {
      const result = await failJob(job.id, error);
      failed += 1;
      if (result.deadLetter) {
        deadLetter += 1;
        await notifyAdmins({
          category: "HEALTH",
          title: "Background job failed",
          body: `Job ${job.type} (${job.id}) exhausted retries.`,
          href: "/admin/health",
        }).catch(() => undefined);
      }
    }
  }

  return { processed, failed, deadLetter };
}

export type EnqueueJobFacadeInput = EnqueueJobInput;

export async function enqueuePlatformJob(
  input: EnqueueJobFacadeInput,
): Promise<PlatformResult<{ jobId: string }>> {
  return enqueueJob(input);
}

/** Facade alias used by notification/email/sms/push modules. */
export async function enqueue(input: {
  type: string;
  idempotencyKey: string;
  payload: EnqueueJobInput["payload"];
  runAfter?: Date;
  maxAttempts?: number;
}): Promise<PlatformResult<{ jobId: string }>> {
  if (!isBackgroundJobType(input.type)) {
    return { ok: false, code: "VALIDATION_ERROR", message: `Unsupported job type: ${input.type}` };
  }
  return enqueueJob({
    type: input.type,
    idempotencyKey: input.idempotencyKey,
    payload: input.payload,
    runAfter: input.runAfter,
    maxAttempts: input.maxAttempts,
  });
}
