"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { withDoctor } from "./_helpers";
import { getOwnedAppointment } from "@/lib/doctor/schedule";
import { isTerminalForClinicalWork } from "@/domain/doctor/consultation";
import {
  assertSoapFinalizable,
  assertSummaryFinalizable,
  hashSoapContent,
  hashSummaryContent,
  isLateAmendment,
} from "@/domain/doctor/soap";
import { DomainRuleError } from "@/domain/doctor/errors";
import {
  saveSoapDraftSchema,
  finalizeSoapSchema,
  amendSoapSchema,
  saveSummarySchema,
  finalizeSummarySchema,
  dismissSoapSchema,
  dismissSummarySchema,
} from "@/lib/doctor/schemas";
import { auditDoctorEvent } from "@/lib/doctor/phi-audit";

type SaveSoapInput = {
  appointmentId: string;
  noteId?: string;
  expectedVersion?: number;
  subjective: string;
  objective: string;
  assessment: string;
  plan: string;
  aiAssisted?: boolean;
};

/** Create or update a SOAP draft with optimistic concurrency (FR-013). */
export async function saveSoapDraft(raw: SaveSoapInput) {
  const input = saveSoapDraftSchema.parse(raw);
  return withDoctor(async (ctx) => {
    const appointment = await getOwnedAppointment(ctx.doctorId, input.appointmentId);
    if (!appointment) throw new DomainRuleError("NOT_FOUND");
    if (isTerminalForClinicalWork(appointment.status)) throw new DomainRuleError("INVALID_STATUS");

    const content = {
      subjective: input.subjective,
      objective: input.objective,
      assessment: input.assessment,
      plan: input.plan,
    };

    let note;
    if (input.noteId) {
      const { assertSignedArtifactMutable } = await import("@/lib/platform/documents");
      const mutable = await assertSignedArtifactMutable({ kind: "soap", id: input.noteId });
      if (!mutable.ok) throw new DomainRuleError("CONFLICT");

      const updated = await prisma.soapNote.updateMany({
        where: {
          id: input.noteId,
          doctorId: ctx.doctorId,
          status: "DRAFT",
          ...(input.expectedVersion ? { version: input.expectedVersion } : {}),
        },
        data: { ...content, aiAssisted: input.aiAssisted },
      });
      if (updated.count === 0) throw new DomainRuleError("CONFLICT");
      note = await prisma.soapNote.findUnique({ where: { id: input.noteId } });
    } else {
      note = await prisma.soapNote.create({
        data: {
          appointmentId: appointment.id,
          patientUserId: appointment.patientUserId,
          doctorId: ctx.doctorId,
          authorUserId: ctx.userId,
          status: "DRAFT",
          aiAssisted: input.aiAssisted,
          ...content,
        },
      });
    }

    await auditDoctorEvent("doctor.soap.save", ctx.userId, { noteId: note!.id }, appointment.patientUserId);
    return { noteId: note!.id, version: note!.version, savedAt: note!.updatedAt.toISOString() };
  });
}

export async function finalizeSoap(raw: { noteId: string; expectedVersion: number }) {
  const input = finalizeSoapSchema.parse(raw);
  return withDoctor(async (ctx) => {
    const note = await prisma.soapNote.findFirst({
      where: { id: input.noteId, doctorId: ctx.doctorId, status: "DRAFT" },
    });
    if (!note) throw new DomainRuleError("NOT_FOUND");
    if (note.version !== input.expectedVersion) throw new DomainRuleError("CONFLICT");

    assertSoapFinalizable(note);

    const contentHash = hashSoapContent(note);
    const updated = await prisma.soapNote.updateMany({
      where: { id: note.id, version: input.expectedVersion, status: "DRAFT" },
      data: { status: "FINAL", signedAt: new Date(), signerUserId: ctx.userId, contentHash },
    });
    if (updated.count === 0) throw new DomainRuleError("CONFLICT");

    await auditDoctorEvent("doctor.soap.finalize", ctx.userId, { noteId: note.id, contentHash }, note.patientUserId);
    revalidatePath("/[locale]/doctor", "layout");
    return { noteId: note.id };
  });
}

/** Amendment creates a new version; the original remains immutable (FR-012). */
export async function amendSoap(raw: {
  noteId: string;
  reason: string;
  subjective: string;
  objective: string;
  assessment: string;
  plan: string;
}) {
  const input = amendSoapSchema.parse(raw);
  return withDoctor(async (ctx) => {
    const original = await prisma.soapNote.findFirst({
      where: { id: input.noteId, doctorId: ctx.doctorId, status: "FINAL" },
    });
    if (!original?.signedAt) throw new DomainRuleError("NOT_FOUND");

    const content = {
      subjective: input.subjective,
      objective: input.objective,
      assessment: input.assessment,
      plan: input.plan,
    };
    assertSoapFinalizable(content);

    const late = isLateAmendment(original.signedAt);
    const amendment = await prisma.soapNote.create({
      data: {
        appointmentId: original.appointmentId,
        patientUserId: original.patientUserId,
        doctorId: ctx.doctorId,
        authorUserId: ctx.userId,
        status: "FINAL",
        version: original.version + 1,
        parentNoteId: original.id,
        signedAt: new Date(),
        signerUserId: ctx.userId,
        amendmentReason: input.reason,
        lateAmendment: late,
        contentHash: hashSoapContent(content),
        ...content,
      },
    });

    await auditDoctorEvent(
      "doctor.soap.amend",
      ctx.userId,
      { noteId: amendment.id, parentNoteId: original.id, late },
      original.patientUserId,
    );
    revalidatePath("/[locale]/doctor", "layout");
    return { noteId: amendment.id };
  });
}

/** Discard a draft SOAP note without finalizing (FR-013). */
export async function dismissSoap(raw: { noteId: string; reason: string }) {
  const input = dismissSoapSchema.parse(raw);
  return withDoctor(async (ctx) => {
    const note = await prisma.soapNote.findFirst({
      where: { id: input.noteId, doctorId: ctx.doctorId, status: "DRAFT" },
    });
    if (!note) throw new DomainRuleError("NOT_FOUND");

    const updated = await prisma.soapNote.updateMany({
      where: { id: note.id, status: "DRAFT" },
      data: { status: "DISMISSED", dismissedAt: new Date(), dismissReason: input.reason },
    });
    if (updated.count === 0) throw new DomainRuleError("CONFLICT");

    await auditDoctorEvent("doctor.soap.dismiss", ctx.userId, { noteId: note.id, reason: input.reason }, note.patientUserId);
    revalidatePath("/[locale]/doctor", "layout");
    return { noteId: note.id };
  });
}

// ── Clinical summary ──────────────────────────────────────────────────────

export async function saveSummaryDraft(raw: {
  appointmentId: string;
  summaryId?: string;
  expectedVersion?: number;
  body: string;
  aiAssisted?: boolean;
}) {
  const input = saveSummarySchema.parse(raw);
  return withDoctor(async (ctx) => {
    const appointment = await getOwnedAppointment(ctx.doctorId, input.appointmentId);
    if (!appointment) throw new DomainRuleError("NOT_FOUND");
    if (isTerminalForClinicalWork(appointment.status)) throw new DomainRuleError("INVALID_STATUS");

    let summary;
    if (input.summaryId) {
      const updated = await prisma.clinicalSummary.updateMany({
        where: {
          id: input.summaryId,
          doctorId: ctx.doctorId,
          status: "DRAFT",
          ...(input.expectedVersion ? { version: input.expectedVersion } : {}),
        },
        data: { body: input.body, aiAssisted: input.aiAssisted },
      });
      if (updated.count === 0) throw new DomainRuleError("CONFLICT");
      summary = await prisma.clinicalSummary.findUnique({ where: { id: input.summaryId } });
    } else {
      summary = await prisma.clinicalSummary.create({
        data: {
          appointmentId: appointment.id,
          patientUserId: appointment.patientUserId,
          doctorId: ctx.doctorId,
          authorUserId: ctx.userId,
          status: "DRAFT",
          body: input.body,
          aiAssisted: input.aiAssisted,
        },
      });
    }

    return { summaryId: summary!.id, version: summary!.version, savedAt: summary!.updatedAt.toISOString() };
  });
}

/** Finalizing the summary releases it to the patient timeline (FR-011). */
export async function finalizeSummary(raw: { summaryId: string; expectedVersion: number }) {
  const input = finalizeSummarySchema.parse(raw);
  return withDoctor(async (ctx) => {
    const summary = await prisma.clinicalSummary.findFirst({
      where: { id: input.summaryId, doctorId: ctx.doctorId, status: "DRAFT" },
    });
    if (!summary) throw new DomainRuleError("NOT_FOUND");
    if (summary.version !== input.expectedVersion) throw new DomainRuleError("CONFLICT");

    assertSummaryFinalizable(summary.body);

    await prisma.$transaction(async (tx) => {
      const updated = await tx.clinicalSummary.updateMany({
        where: { id: summary.id, version: input.expectedVersion, status: "DRAFT" },
        data: {
          status: "FINAL",
          signedAt: new Date(),
          signerUserId: ctx.userId,
          contentHash: hashSummaryContent(summary.body),
        },
      });
      if (updated.count === 0) throw new DomainRuleError("CONFLICT");

      // Release to patient's medical timeline
      await tx.medicalRecord.create({
        data: {
          patientUserId: summary.patientUserId,
          title: "Visit summary",
          recordType: "VISIT_SUMMARY",
          summary: summary.body.slice(0, 2_000),
          recordedAt: new Date(),
          doctorId: ctx.doctorId,
        },
      });

      await tx.notification.create({
        data: {
          recipientUserId: summary.patientUserId,
          category: "CLINICAL",
          title: "Visit summary available",
          body: "Your doctor has published a summary of your recent visit.",
          href: "/patient/records",
        },
      });
    });

    await auditDoctorEvent("doctor.summary.finalize", ctx.userId, { summaryId: summary.id }, summary.patientUserId);
    revalidatePath("/[locale]/doctor", "layout");
    return { summaryId: summary.id };
  });
}

/** Discard a draft clinical summary without releasing to the patient. */
export async function dismissSummary(raw: { summaryId: string; reason: string }) {
  const input = dismissSummarySchema.parse(raw);
  return withDoctor(async (ctx) => {
    const summary = await prisma.clinicalSummary.findFirst({
      where: { id: input.summaryId, doctorId: ctx.doctorId, status: "DRAFT" },
    });
    if (!summary) throw new DomainRuleError("NOT_FOUND");

    const updated = await prisma.clinicalSummary.updateMany({
      where: { id: summary.id, status: "DRAFT" },
      data: { status: "DISMISSED", dismissedAt: new Date(), dismissReason: input.reason },
    });
    if (updated.count === 0) throw new DomainRuleError("CONFLICT");

    await auditDoctorEvent(
      "doctor.summary.dismiss",
      ctx.userId,
      { summaryId: summary.id, reason: input.reason },
      summary.patientUserId,
    );
    revalidatePath("/[locale]/doctor", "layout");
    return { summaryId: summary.id };
  });
}
