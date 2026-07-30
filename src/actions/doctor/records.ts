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

/** Lab review inbox: unreviewed results for panel patients, critical first (FR-021). */
export async function getLabInbox() {
  return withDoctor(async (ctx) => {
    const ids = await panelPatientIds(ctx.doctorId);
    if (ids.length === 0) return { pending: [], reviewed: [] };

    const labs = await prisma.labResult.findMany({
      where: {
        patientUserId: { in: ids },
        releaseStatus: { in: ["PENDING_REVIEW", "RELEASED"] },
      },
      orderBy: [{ criticalFlag: "desc" }, { resultedAt: "desc" }],
      take: 100,
      include: {
        patient: { select: { id: true, name: true } },
        reviewAcks: { where: { doctorUserId: ctx.userId }, select: { reviewedAt: true } },
      },
    });

    const pending = labs.filter((l) => l.reviewAcks.length === 0);
    const reviewed = labs.filter((l) => l.reviewAcks.length > 0).slice(0, 20);
    return { pending, reviewed };
  });
}

export async function markLabReviewed(raw: { labResultId: string }) {
  const input = markLabReviewedSchema.parse(raw);
  return withDoctorMutation(async (ctx) => {
    const ids = await panelPatientIds(ctx.doctorId);
    const lab = await prisma.labResult.findFirst({
      where: { id: input.labResultId, patientUserId: { in: ids } },
      select: { id: true, patientUserId: true, releaseStatus: true },
    });
    if (!lab) throw new DomainRuleError("NOT_FOUND");

    await prisma.$transaction(async (tx) => {
      await tx.labReviewAcknowledgement.upsert({
        where: { labResultId_doctorUserId: { labResultId: lab.id, doctorUserId: ctx.userId } },
        update: {},
        create: { labResultId: lab.id, doctorUserId: ctx.userId },
      });
      // Doctor review releases pending results to the patient (FR-021)
      if (lab.releaseStatus === "PENDING_REVIEW") {
        await tx.labResult.update({
          where: { id: lab.id },
          data: { releaseStatus: "RELEASED" },
        });
        await tx.notification.create({
          data: {
            recipientUserId: lab.patientUserId,
            category: "RESULTS",
            title: "Lab result available",
            body: "A new lab result has been reviewed and released by your doctor.",
            href: "/patient/labs",
          },
        });
      }
    });

    await auditDoctorEvent("doctor.lab.reviewed", ctx.userId, { labResultId: lab.id }, lab.patientUserId);
    revalidatePath("/[locale]/doctor", "layout");
  });
}
