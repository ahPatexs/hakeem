import type { Prisma } from "@prisma/client";
import { auditLog } from "@/auth/audit";

/** PHI access audit event types — retained ≥6 years per HIPAA-ready policy. */
export type PhiAccessType =
  | "phi.view.record"
  | "phi.view.lab"
  | "phi.view.prescription"
  | "phi.view.document"
  | "phi.download.document"
  | "phi.upload"
  | "phi.video.join"
  | "phi.dashboard.load";

export async function auditPhiAccess(
  type: PhiAccessType,
  userId: string,
  meta?: Record<string, unknown>,
): Promise<void> {
  await auditLog({
    type,
    outcome: "SUCCESS",
    actorUserId: userId,
    targetUserId: userId,
    meta: meta as Prisma.InputJsonValue | undefined,
  });
}
