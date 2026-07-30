"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { verifyPassword } from "@/auth/passwords";
import { withDoctor } from "./_helpers";
import { assertCareRelationship } from "@/domain/doctor/care-relationship";
import { assertHasLines, assertSafeToSign } from "@/domain/doctor/prescriptions";
import { isTerminalForClinicalWork } from "@/domain/doctor/consultation";
import { DomainRuleError } from "@/domain/doctor/errors";
import { stubSafetyCheckAdapter } from "@/adapters/stub-safety-check";
import {
  savePrescriptionDraftSchema,
  signPrescriptionSchema,
  cuidSchema,
} from "@/lib/doctor/schemas";
import { auditDoctorEvent } from "@/lib/doctor/phi-audit";
import type { z } from "zod";

const PAGE_SIZE = 12;

export async function listPrescriptions(raw?: { page?: number; status?: "DRAFT" | "ACTIVE" | "ALL" }) {
  const page = Math.max(1, raw?.page ?? 1);
  const status = raw?.status ?? "ALL";
  return withDoctor(async (ctx) => {
    const where = {
      doctorId: ctx.doctorId,
      ...(status === "ALL" ? {} : { status }),
    };
    const [total, items] = await Promise.all([
      prisma.prescription.count({ where }),
      prisma.prescription.findMany({
        where,
        orderBy: { prescribedAt: "desc" },
        skip: (page - 1) * PAGE_SIZE,
        take: PAGE_SIZE,
        include: {
          lines: { orderBy: { sortOrder: "asc" } },
          patient: { select: { id: true, name: true, email: true } },
        },
      }),
    ]);
    return { items, total, pageCount: Math.ceil(total / PAGE_SIZE) };
  });
}

export async function getPrescription(raw: { prescriptionId: string }) {
  const prescriptionId = cuidSchema.parse(raw.prescriptionId);
  return withDoctor(async (ctx) => {
    const rx = await prisma.prescription.findFirst({
      where: { id: prescriptionId, doctorId: ctx.doctorId },
      include: {
        lines: { orderBy: { sortOrder: "asc" } },
        patient: { select: { id: true, name: true, email: true } },
      },
    });
    if (!rx) throw new DomainRuleError("NOT_FOUND");

    const medicalProfile = await prisma.medicalProfile.findUnique({
      where: { userId: rx.patientUserId },
      select: { allergies: true },
    });
    const safety = await stubSafetyCheckAdapter.check({
      allergies: medicalProfile?.allergies ?? [],
      medications: rx.lines.map((l) => l.medicationName),
    });

    return { rx, safety, allergies: medicalProfile?.allergies ?? [] };
  });
}

/** Create or update an unsigned draft. Signed prescriptions are immutable (FR-016). */
export async function savePrescriptionDraft(raw: z.input<typeof savePrescriptionDraftSchema>) {
  const input = savePrescriptionDraftSchema.parse(raw);
  return withDoctor(async (ctx) => {
    await assertCareRelationship(ctx.doctorId, input.patientUserId);
    assertHasLines(input.lines);

    if (input.appointmentId) {
      const appt = await prisma.appointment.findFirst({
        where: { id: input.appointmentId, doctorId: ctx.doctorId },
        select: { status: true },
      });
      if (!appt) throw new DomainRuleError("NOT_FOUND");
      if (isTerminalForClinicalWork(appt.status)) {
        throw new DomainRuleError("INVALID_STATUS", "Cannot prescribe for cancelled/no-show visits");
      }
    }

    const lineData = input.lines.map((line, i) => ({ ...line, sortOrder: i }));
    const medicationName = input.lines.map((l) => l.medicationName).join(", ").slice(0, 250);

    let rxId: string;
    if (input.prescriptionId) {
      const { assertSignedArtifactMutable } = await import("@/lib/platform/documents");
      const mutable = await assertSignedArtifactMutable({
        kind: "prescription",
        id: input.prescriptionId,
      });
      if (!mutable.ok) throw new DomainRuleError("CONFLICT");

      const existing = await prisma.prescription.findFirst({
        where: { id: input.prescriptionId, doctorId: ctx.doctorId, status: "DRAFT" },
      });
      if (!existing) throw new DomainRuleError("NOT_FOUND");
      if (input.expectedVersion && existing.contentVersion !== input.expectedVersion) {
        throw new DomainRuleError("CONFLICT");
      }
      await prisma.$transaction([
        prisma.prescriptionLine.deleteMany({ where: { prescriptionId: existing.id } }),
        prisma.prescription.update({
          where: { id: existing.id },
          data: {
            medicationName,
            instructions: input.instructions,
            aiAssisted: input.aiAssisted,
            contentVersion: { increment: 1 },
            lines: { create: lineData },
          },
        }),
      ]);
      rxId = existing.id;
    } else {
      const created = await prisma.prescription.create({
        data: {
          patientUserId: input.patientUserId,
          doctorId: ctx.doctorId,
          appointmentId: input.appointmentId ?? null,
          medicationName,
          instructions: input.instructions,
          status: "DRAFT",
          prescribedAt: new Date(),
          aiAssisted: input.aiAssisted,
          lines: { create: lineData },
        },
      });
      rxId = created.id;
      await auditDoctorEvent("doctor.rx.create", ctx.userId, { prescriptionId: rxId }, input.patientUserId);
    }

    const saved = await prisma.prescription.findUnique({
      where: { id: rxId },
      select: { id: true, contentVersion: true },
    });
    revalidatePath("/[locale]/doctor", "layout");
    return { prescriptionId: saved!.id, version: saved!.contentVersion };
  });
}

/**
 * Sign & issue (FR-015..FR-017): password re-auth, allergy hard-block,
 * interaction acknowledgement, content hash binding, patient notification.
 */
export async function signPrescription(raw: z.input<typeof signPrescriptionSchema>) {
  const input = signPrescriptionSchema.parse(raw);
  return withDoctor(async (ctx) => {
    const rx = await prisma.prescription.findFirst({
      where: { id: input.prescriptionId, doctorId: ctx.doctorId, status: "DRAFT" },
      include: { lines: { orderBy: { sortOrder: "asc" } } },
    });
    if (!rx) throw new DomainRuleError("NOT_FOUND");
    if (rx.contentVersion !== input.expectedVersion) throw new DomainRuleError("CONFLICT");
    assertHasLines(
      rx.lines.map((l) => ({
        medicationName: l.medicationName,
        dose: l.dose ?? undefined,
        route: l.route ?? undefined,
        frequency: l.frequency ?? undefined,
        duration: l.duration ?? undefined,
        quantity: l.quantity ?? undefined,
        instructions: l.instructions ?? undefined,
      })),
    );

    // Fresh authentication for digital signature (FR-015)
    const user = await prisma.user.findUnique({
      where: { id: ctx.userId },
      select: { passwordHash: true },
    });
    const passwordOk = user?.passwordHash
      ? await verifyPassword(input.password, user.passwordHash)
      : false;
    if (!passwordOk) {
      await auditDoctorEvent("doctor.access.denied", ctx.userId, {
        reason: "rx.sign.password",
        prescriptionId: rx.id,
      });
      throw new DomainRuleError("SIGN_REQUIREMENTS", "Password verification failed");
    }

    // Safety gate
    const medicalProfile = await prisma.medicalProfile.findUnique({
      where: { userId: rx.patientUserId },
      select: { allergies: true },
    });
    const safety = await stubSafetyCheckAdapter.check({
      allergies: medicalProfile?.allergies ?? [],
      medications: rx.lines.map((l) => l.medicationName),
    });
    assertSafeToSign(safety, {
      interactionAck: input.interactionAck,
      allergyDataUnavailableAck: input.allergyDataUnavailableAck,
    });

    const now = new Date();
    await prisma.$transaction(async (tx) => {
      const updated = await tx.prescription.updateMany({
        where: { id: rx.id, status: "DRAFT", contentVersion: input.expectedVersion },
        data: {
          status: "ACTIVE",
          signedAt: now,
          signerUserId: ctx.userId,
          prescribedAt: now,
          startsAt: now,
          allergyAckAt: input.allergyDataUnavailableAck ? now : null,
          interactionAckAt: input.interactionAck ? now : null,
        },
      });
      if (updated.count === 0) throw new DomainRuleError("CONFLICT");

      await tx.notification.create({
        data: {
          recipientUserId: rx.patientUserId,
          category: "PRESCRIPTION",
          title: "New prescription issued",
          body: "Your doctor has issued a new prescription.",
          href: "/patient/prescriptions",
        },
      });
    });

    await auditDoctorEvent(
      "doctor.rx.sign",
      ctx.userId,
      { prescriptionId: rx.id, lines: rx.lines.length, aiAssisted: rx.aiAssisted },
      rx.patientUserId,
    );
    revalidatePath("/[locale]/doctor", "layout");
    return { prescriptionId: rx.id, signedAt: now.toISOString() };
  });
}
