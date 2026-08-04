import { createHash } from "crypto";
import {
  assertSoapFinalizable,
  assertSummaryFinalizable,
  hashSoapContent,
  hashSummaryContent,
  isLateAmendment,
} from "@/domain/doctor/soap";
import { assertEmrAccess, type EmrActor } from "@/domain/emr/access";
import { softDeleteWhere } from "@/domain/emr/soft-delete";
import { canAmendSigned, checkSoftConcurrency, requireAmendmentReason } from "@/domain/emr/versioning";
import { platformFail, platformOk, type PlatformResult } from "@/domain/platform/outcomes";
import { prisma } from "@/lib/prisma";
import { emrAudit } from "./audit";
import { upsertTimelineEvent } from "./timeline";

function hashNoteBody(body: string): string {
  return createHash("sha256").update(body).digest("hex");
}

export async function getSoapNote(actor: EmrActor, noteId: string) {
  const note = await prisma.soapNote.findUnique({ where: { id: noteId } });
  if (!note) return platformFail("NOT_FOUND", "SOAP note not found");

  const access = await assertEmrAccess(actor, note.patientUserId, "read");
  if (!access.ok) return access;

  return platformOk(note);
}

export async function saveSoapDraft(
  actor: EmrActor,
  input: {
    appointmentId: string;
    noteId?: string;
    expectedVersion?: number;
    subjective: string;
    objective: string;
    assessment: string;
    plan: string;
    aiAssisted?: boolean;
  },
) {
  const appointment = await prisma.appointment.findUnique({
    where: { id: input.appointmentId },
    select: { id: true, patientUserId: true, doctorId: true },
  });
  if (!appointment) return platformFail("NOT_FOUND", "Appointment not found");

  const access = await assertEmrAccess(actor, appointment.patientUserId, "write_clinical");
  if (!access.ok) return access;
  if (!actor.doctorId || actor.doctorId !== appointment.doctorId) {
    return platformFail("FORBIDDEN", "Doctor does not own this appointment");
  }

  const content = {
    subjective: input.subjective,
    objective: input.objective,
    assessment: input.assessment,
    plan: input.plan,
  };

  let note;
  if (input.noteId) {
    const existing = await prisma.soapNote.findFirst({
      where: { id: input.noteId, doctorId: actor.doctorId, status: "DRAFT" },
    });
    if (!existing) return platformFail("NOT_FOUND", "Draft SOAP note not found");
    if (input.expectedVersion != null) {
      const concurrency = checkSoftConcurrency(input.expectedVersion, existing.version);
      if (!concurrency.ok) return concurrency;
    }

    const updated = await prisma.soapNote.updateMany({
      where: {
        id: existing.id,
        status: "DRAFT",
        ...(input.expectedVersion != null ? { version: input.expectedVersion } : {}),
      },
      data: { ...content, aiAssisted: input.aiAssisted ?? existing.aiAssisted },
    });
    if (updated.count === 0) return platformFail("CONFLICT", "Draft was modified");
    note = await prisma.soapNote.findUnique({ where: { id: existing.id } });
  } else {
    note = await prisma.soapNote.create({
      data: {
        appointmentId: appointment.id,
        patientUserId: appointment.patientUserId,
        doctorId: actor.doctorId,
        authorUserId: actor.userId,
        status: "DRAFT",
        aiAssisted: input.aiAssisted ?? false,
        ...content,
      },
    });
  }

  if (!note) return platformFail("INTERNAL_FAILURE", "Failed to save SOAP draft");

  await emrAudit({
    type: "notes.soap.save",
    outcome: "SUCCESS",
    actorUserId: actor.userId,
    targetUserId: note.patientUserId,
    meta: { noteId: note.id, version: note.version },
  });

  return platformOk({ noteId: note.id, version: note.version, savedAt: note.updatedAt });
}

export async function signSoapNote(
  actor: EmrActor,
  input: { noteId: string; expectedVersion: number },
) {
  const note = await prisma.soapNote.findFirst({
    where: {
      id: input.noteId,
      doctorId: actor.doctorId ?? undefined,
      status: "DRAFT",
    },
  });
  if (!note) return platformFail("NOT_FOUND", "Draft SOAP note not found");

  const access = await assertEmrAccess(actor, note.patientUserId, "sign");
  if (!access.ok) return access;

  const concurrency = checkSoftConcurrency(input.expectedVersion, note.version);
  if (!concurrency.ok) return concurrency;

  try {
    assertSoapFinalizable(note);
  } catch {
    return platformFail("VALIDATION_ERROR", "Assessment and Plan are required to sign");
  }

  const contentHash = hashSoapContent(note);
  const signedAt = new Date();
  const updated = await prisma.soapNote.updateMany({
    where: { id: note.id, version: input.expectedVersion, status: "DRAFT" },
    data: {
      status: "FINAL",
      signedAt,
      signerUserId: actor.userId,
      contentHash,
    },
  });
  if (updated.count === 0) return platformFail("CONFLICT", "Note could not be signed");

  await upsertTimelineEvent({
    patientUserId: note.patientUserId,
    type: "NOTE",
    effectiveAt: signedAt,
    refType: "SoapNote",
    refId: note.id,
    title: "SOAP note signed",
    summary: note.assessment.slice(0, 200) || null,
    actorUserId: actor.userId,
    visibility: "CLINICIAN",
  });

  await emrAudit({
    type: "notes.soap.sign",
    outcome: "SUCCESS",
    actorUserId: actor.userId,
    targetUserId: note.patientUserId,
    meta: { noteId: note.id, contentHash },
  });

  return platformOk({ noteId: note.id, signedAt });
}

export async function amendSoapNote(
  actor: EmrActor,
  input: {
    noteId: string;
    reason: string;
    subjective: string;
    objective: string;
    assessment: string;
    plan: string;
  },
): Promise<PlatformResult<{ noteId: string }>> {
  const original = await prisma.soapNote.findFirst({
    where: {
      id: input.noteId,
      doctorId: actor.doctorId ?? undefined,
      status: "FINAL",
    },
  });
  if (!original?.signedAt) return platformFail("NOT_FOUND", "Signed SOAP note not found");

  const access = await assertEmrAccess(actor, original.patientUserId, "write_clinical");
  if (!access.ok) return access;

  if (!canAmendSigned(original.signedAt)) {
    return platformFail("CONFLICT", "Note is not amendable");
  }

  const reasonResult = requireAmendmentReason(input.reason);
  if (!reasonResult.ok) return reasonResult;

  const content = {
    subjective: input.subjective,
    objective: input.objective,
    assessment: input.assessment,
    plan: input.plan,
  };
  try {
    assertSoapFinalizable(content);
  } catch {
    return platformFail("VALIDATION_ERROR", "Assessment and Plan are required");
  }

  const signedAt = new Date();
  const amendment = await prisma.soapNote.create({
    data: {
      appointmentId: original.appointmentId,
      patientUserId: original.patientUserId,
      doctorId: original.doctorId,
      authorUserId: actor.userId,
      status: "FINAL",
      version: original.version + 1,
      parentNoteId: original.id,
      signedAt,
      signerUserId: actor.userId,
      amendmentReason: reasonResult.data.reason,
      lateAmendment: isLateAmendment(original.signedAt),
      contentHash: hashSoapContent(content),
      ...content,
    },
  });

  await upsertTimelineEvent({
    patientUserId: original.patientUserId,
    type: "NOTE",
    effectiveAt: signedAt,
    refType: "SoapNote",
    refId: amendment.id,
    title: "SOAP note amended",
    summary: reasonResult.data.reason.slice(0, 200),
    actorUserId: actor.userId,
    visibility: "CLINICIAN",
  });

  await emrAudit({
    type: "notes.soap.amend",
    outcome: "SUCCESS",
    actorUserId: actor.userId,
    targetUserId: original.patientUserId,
    meta: { noteId: amendment.id, parentNoteId: original.id },
  });

  return platformOk({ noteId: amendment.id });
}

export async function listDoctorNotes(actor: EmrActor, patientUserId: string) {
  const access = await assertEmrAccess(actor, patientUserId, "read");
  if (!access.ok) return access;

  const items = await prisma.doctorNote.findMany({
    where: { patientUserId, ...softDeleteWhere() },
    orderBy: { updatedAt: "desc" },
    take: 50,
  });

  // Patients only see FINAL notes
  const visible =
    actor.role === "PATIENT" ? items.filter((n) => n.status === "FINAL") : items;

  return platformOk({ items: visible });
}

// ── Clinical summary (T122) ───────────────────────────────────────────────

/** Create or update a clinical-summary draft, mirroring `saveSoapDraft`. */
export async function saveSummaryDraft(
  actor: EmrActor,
  input: {
    appointmentId: string;
    summaryId?: string;
    expectedVersion?: number;
    body: string;
    aiAssisted?: boolean;
  },
): Promise<PlatformResult<{ summaryId: string; version: number; savedAt: Date }>> {
  const appointment = await prisma.appointment.findUnique({
    where: { id: input.appointmentId },
    select: { id: true, patientUserId: true, doctorId: true },
  });
  if (!appointment) return platformFail("NOT_FOUND", "Appointment not found");

  const access = await assertEmrAccess(actor, appointment.patientUserId, "write_clinical");
  if (!access.ok) return access;
  if (!actor.doctorId || actor.doctorId !== appointment.doctorId) {
    return platformFail("FORBIDDEN", "Doctor does not own this appointment");
  }

  let summary;
  if (input.summaryId) {
    const existing = await prisma.clinicalSummary.findFirst({
      where: { id: input.summaryId, doctorId: actor.doctorId, status: "DRAFT" },
    });
    if (!existing) return platformFail("NOT_FOUND", "Draft summary not found");
    if (input.expectedVersion != null) {
      const concurrency = checkSoftConcurrency(input.expectedVersion, existing.version);
      if (!concurrency.ok) return concurrency;
    }

    const updated = await prisma.clinicalSummary.updateMany({
      where: {
        id: existing.id,
        status: "DRAFT",
        ...(input.expectedVersion != null ? { version: input.expectedVersion } : {}),
      },
      data: { body: input.body, aiAssisted: input.aiAssisted ?? existing.aiAssisted },
    });
    if (updated.count === 0) return platformFail("CONFLICT", "Draft was modified");
    summary = await prisma.clinicalSummary.findUnique({ where: { id: existing.id } });
  } else {
    summary = await prisma.clinicalSummary.create({
      data: {
        appointmentId: appointment.id,
        patientUserId: appointment.patientUserId,
        doctorId: actor.doctorId,
        authorUserId: actor.userId,
        status: "DRAFT",
        body: input.body,
        aiAssisted: input.aiAssisted ?? false,
      },
    });
  }
  if (!summary) return platformFail("INTERNAL_FAILURE", "Failed to save summary draft");

  await emrAudit({
    type: "notes.summary.save",
    outcome: "SUCCESS",
    actorUserId: actor.userId,
    targetUserId: summary.patientUserId,
    meta: { summaryId: summary.id, version: summary.version },
  });

  return platformOk({ summaryId: summary.id, version: summary.version, savedAt: summary.updatedAt });
}

/**
 * Finalize a clinical summary: releases it to the patient (legacy `MedicalRecord`
 * for backward compatibility) and upserts an EMR timeline NOTE event.
 */
export async function finalizeClinicalSummary(
  actor: EmrActor,
  input: { summaryId: string; expectedVersion: number },
): Promise<PlatformResult<{ summaryId: string }>> {
  const summary = await prisma.clinicalSummary.findFirst({
    where: { id: input.summaryId, doctorId: actor.doctorId ?? undefined, status: "DRAFT" },
  });
  if (!summary) return platformFail("NOT_FOUND", "Draft summary not found");

  const access = await assertEmrAccess(actor, summary.patientUserId, "sign");
  if (!access.ok) return access;

  const concurrency = checkSoftConcurrency(input.expectedVersion, summary.version);
  if (!concurrency.ok) return concurrency;

  try {
    assertSummaryFinalizable(summary.body);
  } catch {
    return platformFail("VALIDATION_ERROR", "Summary body is required to finalize");
  }

  const signedAt = new Date();
  const contentHash = hashSummaryContent(summary.body);
  const finalized = await prisma.$transaction(async (tx) => {
    const updated = await tx.clinicalSummary.updateMany({
      where: { id: summary.id, version: input.expectedVersion, status: "DRAFT" },
      data: { status: "FINAL", signedAt, signerUserId: actor.userId, contentHash },
    });
    if (updated.count === 0) return false;

    await tx.medicalRecord.create({
      data: {
        patientUserId: summary.patientUserId,
        title: "Visit summary",
        recordType: "VISIT_SUMMARY",
        summary: summary.body.slice(0, 2_000),
        recordedAt: signedAt,
        doctorId: summary.doctorId,
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
    return true;
  });
  if (!finalized) return platformFail("CONFLICT", "Summary could not be finalized");

  await upsertTimelineEvent({
    patientUserId: summary.patientUserId,
    type: "NOTE",
    effectiveAt: signedAt,
    refType: "ClinicalSummary",
    refId: summary.id,
    title: "Visit summary published",
    summary: summary.body.slice(0, 200) || null,
    actorUserId: actor.userId,
    visibility: "ALL_AUTHORIZED",
  });

  await emrAudit({
    type: "notes.summary.finalize",
    outcome: "SUCCESS",
    actorUserId: actor.userId,
    targetUserId: summary.patientUserId,
    meta: { summaryId: summary.id, contentHash },
  });

  return platformOk({ summaryId: summary.id });
}

/** Discard a draft clinical summary without releasing it to the patient (T122). */
export async function dismissClinicalSummary(
  actor: EmrActor,
  input: { summaryId: string; reason: string },
): Promise<PlatformResult<{ summaryId: string }>> {
  const summary = await prisma.clinicalSummary.findFirst({
    where: { id: input.summaryId, doctorId: actor.doctorId ?? undefined, status: "DRAFT" },
  });
  if (!summary) return platformFail("NOT_FOUND", "Draft summary not found");

  const access = await assertEmrAccess(actor, summary.patientUserId, "write_clinical");
  if (!access.ok) return access;

  const updated = await prisma.clinicalSummary.updateMany({
    where: { id: summary.id, status: "DRAFT" },
    data: { status: "DISMISSED", dismissedAt: new Date(), dismissReason: input.reason },
  });
  if (updated.count === 0) return platformFail("CONFLICT", "Summary could not be dismissed");

  await emrAudit({
    type: "notes.summary.dismiss",
    outcome: "SUCCESS",
    actorUserId: actor.userId,
    targetUserId: summary.patientUserId,
    meta: { summaryId: summary.id, reason: input.reason },
  });

  return platformOk({ summaryId: summary.id });
}

/** Discard a draft SOAP note without finalizing (T134). */
export async function dismissSoapNote(
  actor: EmrActor,
  input: { noteId: string; reason: string },
): Promise<PlatformResult<{ noteId: string }>> {
  const note = await prisma.soapNote.findFirst({
    where: { id: input.noteId, doctorId: actor.doctorId ?? undefined, status: "DRAFT" },
  });
  if (!note) return platformFail("NOT_FOUND", "Draft SOAP note not found");

  const access = await assertEmrAccess(actor, note.patientUserId, "write_clinical");
  if (!access.ok) return access;

  const updated = await prisma.soapNote.updateMany({
    where: { id: note.id, status: "DRAFT" },
    data: { status: "DISMISSED", dismissedAt: new Date(), dismissReason: input.reason },
  });
  if (updated.count === 0) return platformFail("CONFLICT", "SOAP note could not be dismissed");

  await emrAudit({
    type: "notes.soap.dismiss",
    outcome: "SUCCESS",
    actorUserId: actor.userId,
    targetUserId: note.patientUserId,
    meta: { noteId: note.id, reason: input.reason },
  });

  return platformOk({ noteId: note.id });
}

// ── Doctor free-text notes (T124) ─────────────────────────────────────────

/** Create or update a doctor free-text note draft (unstructured, beside SOAP). */
export async function saveDoctorNote(
  actor: EmrActor,
  input: {
    patientUserId: string;
    appointmentId?: string | null;
    noteId?: string;
    expectedVersion?: number;
    body: string;
  },
): Promise<PlatformResult<{ noteId: string; version: number; savedAt: Date }>> {
  const access = await assertEmrAccess(actor, input.patientUserId, "write_clinical");
  if (!access.ok) return access;
  if (!actor.doctorId) return platformFail("FORBIDDEN", "Doctor profile required");

  const body = input.body ?? "";

  let note;
  if (input.noteId) {
    const existing = await prisma.doctorNote.findFirst({
      where: { id: input.noteId, doctorId: actor.doctorId, status: "DRAFT", ...softDeleteWhere() },
    });
    if (!existing) return platformFail("NOT_FOUND", "Draft note not found");
    if (input.expectedVersion != null) {
      const concurrency = checkSoftConcurrency(input.expectedVersion, existing.version);
      if (!concurrency.ok) return concurrency;
    }

    const updated = await prisma.doctorNote.updateMany({
      where: {
        id: existing.id,
        status: "DRAFT",
        ...(input.expectedVersion != null ? { version: input.expectedVersion } : {}),
      },
      data: { body },
    });
    if (updated.count === 0) return platformFail("CONFLICT", "Draft was modified");
    note = await prisma.doctorNote.findUnique({ where: { id: existing.id } });
  } else {
    note = await prisma.doctorNote.create({
      data: {
        patientUserId: input.patientUserId,
        appointmentId: input.appointmentId ?? null,
        doctorId: actor.doctorId,
        authorUserId: actor.userId,
        status: "DRAFT",
        body,
      },
    });
  }
  if (!note) return platformFail("INTERNAL_FAILURE", "Failed to save note");

  await emrAudit({
    type: "notes.doctor.save",
    outcome: "SUCCESS",
    actorUserId: actor.userId,
    targetUserId: note.patientUserId,
    meta: { noteId: note.id, version: note.version },
  });

  return platformOk({ noteId: note.id, version: note.version, savedAt: note.updatedAt });
}

/** Sign a doctor note (FINAL), append to timeline as a CLINICIAN-visible NOTE. */
export async function signDoctorNote(
  actor: EmrActor,
  input: { noteId: string; expectedVersion: number },
): Promise<PlatformResult<{ noteId: string }>> {
  const note = await prisma.doctorNote.findFirst({
    where: {
      id: input.noteId,
      doctorId: actor.doctorId ?? undefined,
      status: "DRAFT",
      ...softDeleteWhere(),
    },
  });
  if (!note) return platformFail("NOT_FOUND", "Draft note not found");

  const access = await assertEmrAccess(actor, note.patientUserId, "sign");
  if (!access.ok) return access;

  const concurrency = checkSoftConcurrency(input.expectedVersion, note.version);
  if (!concurrency.ok) return concurrency;

  if (!note.body.trim()) {
    return platformFail("VALIDATION_ERROR", "Note body is required to sign");
  }

  const signedAt = new Date();
  const contentHash = hashNoteBody(note.body);
  const updated = await prisma.doctorNote.updateMany({
    where: { id: note.id, version: input.expectedVersion, status: "DRAFT" },
    data: { status: "FINAL", signedAt, signerUserId: actor.userId, contentHash },
  });
  if (updated.count === 0) return platformFail("CONFLICT", "Note could not be signed");

  await upsertTimelineEvent({
    patientUserId: note.patientUserId,
    type: "NOTE",
    effectiveAt: signedAt,
    refType: "DoctorNote",
    refId: note.id,
    title: "Doctor note signed",
    summary: note.body.slice(0, 200) || null,
    actorUserId: actor.userId,
    visibility: "CLINICIAN",
  });

  await emrAudit({
    type: "notes.doctor.sign",
    outcome: "SUCCESS",
    actorUserId: actor.userId,
    targetUserId: note.patientUserId,
    meta: { noteId: note.id, contentHash },
  });

  return platformOk({ noteId: note.id });
}
