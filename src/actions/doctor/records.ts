"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { withDoctor, withDoctorMutation } from "./_helpers";
import { CARE_WINDOW_MONTHS } from "@/domain/doctor/care-relationship";
import { DomainRuleError } from "@/domain/doctor/errors";
import { markLabReviewedSchema } from "@/lib/doctor/schemas";
import { auditDoctorEvent } from "@/lib/doctor/phi-audit";

/** Panel patient user ids for this doctor (appointments window + panel). */
async function panelPatientIds(doctorId: string): Promise<string[]> {
  const windowStart = new Date();
  windowStart.setMonth(windowStart.getMonth() - CARE_WINDOW_MONTHS);
  const [appts, panel] = await Promise.all([
    prisma.appointment.findMany({
      where: { doctorId, status: { notIn: ["HELD"] }, startAt: { gte: windowStart } },
      select: { patientUserId: true },
      distinct: ["patientUserId"],
    }),
    prisma.doctorPatientPanel.findMany({ where: { doctorId }, select: { patientUserId: true } }),
  ]);
  return [...new Set([...appts, ...panel].map((r) => r.patientUserId))];
}

/**
 * Lab review inbox via EMR diagnostics facade (T127): unreviewed results for
 * panel patients, critical first (FR-021), release-rule aware and audited.
 */
export async function getLabInbox() {
  return withDoctor(async (ctx) => {
    const ids = await panelPatientIds(ctx.doctorId);
    const { listLabInboxForDoctor } = await import("@/lib/emr/diagnostics");
    const result = await listLabInboxForDoctor(
      { userId: ctx.userId, role: "DOCTOR", doctorId: ctx.doctorId },
      ids,
    );
    if (!result.ok) throw new DomainRuleError("NOT_FOUND");
    return result.data;
  });
}

/** Acknowledge lab review and release via EMR diagnostics facade (T135). */
export async function markLabReviewed(raw: { labResultId: string }) {
  const input = markLabReviewedSchema.parse(raw);
  return withDoctorMutation(async (ctx) => {
    const { acknowledgeAndReleaseLab } = await import("@/lib/emr/diagnostics");
    const result = await acknowledgeAndReleaseLab(
      { userId: ctx.userId, role: "DOCTOR", doctorId: ctx.doctorId },
      { labResultId: input.labResultId },
    );
    if (!result.ok) throw new DomainRuleError("NOT_FOUND");

    await auditDoctorEvent(
      "doctor.lab.reviewed",
      ctx.userId,
      { labResultId: result.data.id, released: result.data.released },
    );
    revalidatePath("/[locale]/doctor", "layout");
  });
}
