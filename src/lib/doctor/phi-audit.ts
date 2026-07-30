import type { Prisma } from "@prisma/client";
import { auditLog } from "@/auth/audit";

/**
 * Doctor clinical audit events — immutable, retained ≥6 years (FR-029).
 * Catalog aligns with specs/004-doctor-portal/data-model.md.
 */
export type DoctorAuditType =
  | "doctor.access.denied"
  | "doctor.chart.view"
  | "doctor.visit.start"
  | "doctor.visit.complete"
  | "doctor.visit.noshow"
  | "doctor.soap.save"
  | "doctor.soap.finalize"
  | "doctor.soap.amend"
  | "doctor.soap.dismiss"
  | "doctor.summary.finalize"
  | "doctor.summary.dismiss"
  | "doctor.rx.create"
  | "doctor.rx.sign"
  | "doctor.ai.generate"
  | "doctor.ai.accept"
  | "doctor.ai.discard"
  | "doctor.video.join"
  | "doctor.video.admit"
  | "doctor.lab.view"
  | "doctor.lab.reviewed"
  | "doctor.record.view"
  | "doctor.doc.download";

export async function auditDoctorEvent(
  type: DoctorAuditType,
  doctorUserId: string,
  meta?: Record<string, unknown>,
  targetUserId?: string,
): Promise<void> {
  await auditLog({
    type,
    outcome: type === "doctor.access.denied" ? "DENIED" : "SUCCESS",
    actorUserId: doctorUserId,
    targetUserId: targetUserId ?? doctorUserId,
    meta: meta as Prisma.InputJsonValue | undefined,
  });
}
