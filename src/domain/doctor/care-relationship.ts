import { prisma } from "@/lib/prisma";
import { DomainRuleError } from "./errors";

/** Rolling clinical window for schedule-based care relationships. */
export const CARE_WINDOW_MONTHS = 24;

/**
 * A doctor may access a patient chart when:
 * 1. an appointment assigned to this doctor exists for the patient within the
 *    rolling 24-month window (any non-expired-hold status), or
 * 2. an explicit DoctorPatientPanel assignment exists.
 *
 * Denials MUST NOT reveal whether the patient exists (anti-enumeration).
 */
export async function hasCareRelationship(doctorId: string, patientUserId: string): Promise<boolean> {
  const windowStart = new Date();
  windowStart.setMonth(windowStart.getMonth() - CARE_WINDOW_MONTHS);

  const [appointment, panel] = await Promise.all([
    prisma.appointment.findFirst({
      where: {
        doctorId,
        patientUserId,
        status: { notIn: ["HELD"] },
        startAt: { gte: windowStart },
      },
      select: { id: true },
    }),
    prisma.doctorPatientPanel.findUnique({
      where: { doctorId_patientUserId: { doctorId, patientUserId } },
      select: { id: true },
    }),
  ]);

  return Boolean(appointment ?? panel);
}

export async function assertCareRelationship(doctorId: string, patientUserId: string): Promise<void> {
  const allowed = await hasCareRelationship(doctorId, patientUserId);
  if (!allowed) {
    throw new DomainRuleError("NOT_FOUND");
  }
}
