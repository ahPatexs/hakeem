"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { withDoctor } from "./_helpers";
import { getOwnedAppointment } from "@/lib/doctor/schedule";
import { isTerminalForClinicalWork } from "@/domain/doctor/consultation";
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

/** Create or update a SOAP draft via EMR notes facade (T045). */
export async function saveSoapDraft(raw: SaveSoapInput) {
  const input = saveSoapDraftSchema.parse(raw);
  return withDoctor(async (ctx) => {
    const appointment = await getOwnedAppointment(ctx.doctorId, input.appointmentId);
    if (!appointment) throw new DomainRuleError("NOT_FOUND");
    if (isTerminalForClinicalWork(appointment.status)) throw new DomainRuleError("INVALID_STATUS");

    const { saveSoapDraft: emrSave } = await import("@/lib/emr/notes");
    const result = await emrSave(
      { userId: ctx.userId, role: "DOCTOR", doctorId: ctx.doctorId },
      {
        appointmentId: input.appointmentId,
        noteId: input.noteId,
        expectedVersion: input.expectedVersion,
        subjective: input.subjective,
        objective: input.objective,
        assessment: input.assessment,
        plan: input.plan,
        aiAssisted: input.aiAssisted,
      },
    );
    if (!result.ok) {
      if (result.code === "NOT_FOUND") throw new DomainRuleError("NOT_FOUND");
      if (result.code === "CONFLICT") throw new DomainRuleError("CONFLICT");
      if (result.code === "FORBIDDEN") throw new DomainRuleError("NOT_FOUND");
      throw new DomainRuleError("VALIDATION_ERROR", result.message);
    }

    await auditDoctorEvent(
      "doctor.soap.save",
      ctx.userId,
      { noteId: result.data.noteId },
      appointment.patientUserId,
    );
    return {
      noteId: result.data.noteId,
      version: result.data.version,
      savedAt: result.data.savedAt.toISOString(),
    };
  });
}

export async function finalizeSoap(raw: { noteId: string; expectedVersion: number }) {
  const input = finalizeSoapSchema.parse(raw);
  return withDoctor(async (ctx) => {
    const { signSoapNote } = await import("@/lib/emr/notes");
    const result = await signSoapNote(
      { userId: ctx.userId, role: "DOCTOR", doctorId: ctx.doctorId },
      { noteId: input.noteId, expectedVersion: input.expectedVersion },
    );
    if (!result.ok) {
      if (result.code === "NOT_FOUND") throw new DomainRuleError("NOT_FOUND");
      if (result.code === "CONFLICT") throw new DomainRuleError("CONFLICT");
      if (result.code === "FORBIDDEN") throw new DomainRuleError("NOT_FOUND");
      throw new DomainRuleError("VALIDATION_ERROR", result.message);
    }

    const note = await prisma.soapNote.findUnique({
      where: { id: result.data.noteId },
      select: { patientUserId: true, contentHash: true },
    });
    await auditDoctorEvent(
      "doctor.soap.finalize",
      ctx.userId,
      { noteId: result.data.noteId, contentHash: note?.contentHash },
      note?.patientUserId,
    );
    revalidatePath("/[locale]/doctor", "layout");
    revalidatePath("/[locale]/patient", "layout");
    return { noteId: result.data.noteId };
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
    const { amendSoapNote } = await import("@/lib/emr/notes");
    const result = await amendSoapNote(
      { userId: ctx.userId, role: "DOCTOR", doctorId: ctx.doctorId },
      {
        noteId: input.noteId,
        reason: input.reason,
        subjective: input.subjective,
        objective: input.objective,
        assessment: input.assessment,
        plan: input.plan,
      },
    );
    if (!result.ok) {
      if (result.code === "NOT_FOUND") throw new DomainRuleError("NOT_FOUND");
      if (result.code === "CONFLICT") throw new DomainRuleError("CONFLICT");
      if (result.code === "FORBIDDEN") throw new DomainRuleError("NOT_FOUND");
      throw new DomainRuleError("VALIDATION_ERROR", result.message);
    }

    const amendment = await prisma.soapNote.findUnique({
      where: { id: result.data.noteId },
      select: { patientUserId: true, parentNoteId: true, lateAmendment: true },
    });
    await auditDoctorEvent(
      "doctor.soap.amend",
      ctx.userId,
      {
        noteId: result.data.noteId,
        parentNoteId: amendment?.parentNoteId,
        late: amendment?.lateAmendment,
      },
      amendment?.patientUserId,
    );
    revalidatePath("/[locale]/doctor", "layout");
    revalidatePath("/[locale]/patient", "layout");
    return { noteId: result.data.noteId };
  });
}

/** Discard a draft SOAP note without finalizing — EMR notes facade (T134). */
export async function dismissSoap(raw: { noteId: string; reason: string }) {
  const input = dismissSoapSchema.parse(raw);
  return withDoctor(async (ctx) => {
    const { dismissSoapNote } = await import("@/lib/emr/notes");
    const result = await dismissSoapNote(
      { userId: ctx.userId, role: "DOCTOR", doctorId: ctx.doctorId },
      { noteId: input.noteId, reason: input.reason },
    );
    if (!result.ok) {
      if (result.code === "NOT_FOUND") throw new DomainRuleError("NOT_FOUND");
      if (result.code === "CONFLICT") throw new DomainRuleError("CONFLICT");
      if (result.code === "FORBIDDEN") throw new DomainRuleError("NOT_FOUND");
      throw new DomainRuleError("VALIDATION_ERROR", result.message);
    }

    const note = await prisma.soapNote.findUnique({
      where: { id: result.data.noteId },
      select: { patientUserId: true },
    });
    await auditDoctorEvent(
      "doctor.soap.dismiss",
      ctx.userId,
      { noteId: result.data.noteId, reason: input.reason },
      note?.patientUserId,
    );
    revalidatePath("/[locale]/doctor", "layout");
    return { noteId: result.data.noteId };
  });
}

// ── Clinical summary ──────────────────────────────────────────────────────

/** Create or update a clinical summary draft via EMR notes facade (T122). */
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

    const { saveSummaryDraft: emrSaveSummary } = await import("@/lib/emr/notes");
    const result = await emrSaveSummary(
      { userId: ctx.userId, role: "DOCTOR", doctorId: ctx.doctorId },
      {
        appointmentId: input.appointmentId,
        summaryId: input.summaryId,
        expectedVersion: input.expectedVersion,
        body: input.body,
        aiAssisted: input.aiAssisted,
      },
    );
    if (!result.ok) {
      if (result.code === "NOT_FOUND") throw new DomainRuleError("NOT_FOUND");
      if (result.code === "CONFLICT") throw new DomainRuleError("CONFLICT");
      if (result.code === "FORBIDDEN") throw new DomainRuleError("NOT_FOUND");
      throw new DomainRuleError("VALIDATION_ERROR", result.message);
    }

    await auditDoctorEvent(
      "doctor.summary.save",
      ctx.userId,
      { summaryId: result.data.summaryId },
      appointment.patientUserId,
    );
    return {
      summaryId: result.data.summaryId,
      version: result.data.version,
      savedAt: result.data.savedAt.toISOString(),
    };
  });
}

/** Finalizing the summary releases it to the patient timeline (FR-011). Routed through EMR notes facade (T122). */
export async function finalizeSummary(raw: { summaryId: string; expectedVersion: number }) {
  const input = finalizeSummarySchema.parse(raw);
  return withDoctor(async (ctx) => {
    const { finalizeClinicalSummary } = await import("@/lib/emr/notes");
    const result = await finalizeClinicalSummary(
      { userId: ctx.userId, role: "DOCTOR", doctorId: ctx.doctorId },
      { summaryId: input.summaryId, expectedVersion: input.expectedVersion },
    );
    if (!result.ok) {
      if (result.code === "NOT_FOUND") throw new DomainRuleError("NOT_FOUND");
      if (result.code === "CONFLICT") throw new DomainRuleError("CONFLICT");
      if (result.code === "FORBIDDEN") throw new DomainRuleError("NOT_FOUND");
      throw new DomainRuleError("VALIDATION_ERROR", result.message);
    }

    const summary = await prisma.clinicalSummary.findUnique({
      where: { id: result.data.summaryId },
      select: { patientUserId: true },
    });
    await auditDoctorEvent(
      "doctor.summary.finalize",
      ctx.userId,
      { summaryId: result.data.summaryId },
      summary?.patientUserId,
    );
    revalidatePath("/[locale]/doctor", "layout");
    revalidatePath("/[locale]/patient", "layout");
    return { summaryId: result.data.summaryId };
  });
}

/** Discard a draft clinical summary without releasing to the patient (EMR facade, T122). */
export async function dismissSummary(raw: { summaryId: string; reason: string }) {
  const input = dismissSummarySchema.parse(raw);
  return withDoctor(async (ctx) => {
    const { dismissClinicalSummary } = await import("@/lib/emr/notes");
    const result = await dismissClinicalSummary(
      { userId: ctx.userId, role: "DOCTOR", doctorId: ctx.doctorId },
      { summaryId: input.summaryId, reason: input.reason },
    );
    if (!result.ok) {
      if (result.code === "NOT_FOUND") throw new DomainRuleError("NOT_FOUND");
      if (result.code === "CONFLICT") throw new DomainRuleError("CONFLICT");
      if (result.code === "FORBIDDEN") throw new DomainRuleError("NOT_FOUND");
      throw new DomainRuleError("VALIDATION_ERROR", result.message);
    }

    const summary = await prisma.clinicalSummary.findUnique({
      where: { id: result.data.summaryId },
      select: { patientUserId: true },
    });
    await auditDoctorEvent(
      "doctor.summary.dismiss",
      ctx.userId,
      { summaryId: result.data.summaryId, reason: input.reason },
      summary?.patientUserId,
    );
    revalidatePath("/[locale]/doctor", "layout");
    return { summaryId: result.data.summaryId };
  });
}
