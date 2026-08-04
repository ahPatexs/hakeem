"use server";

import { revalidatePath } from "next/cache";
import { withDoctor } from "./_helpers";
import { DomainRuleError, type DomainRuleCode } from "@/domain/doctor/errors";
import {
  savePrescriptionDraftSchema,
  signPrescriptionSchema,
  cuidSchema,
} from "@/lib/doctor/schemas";
import { auditDoctorEvent } from "@/lib/doctor/phi-audit";
import type { z } from "zod";

function toDomainError(code: string, message?: string): never {
  const allowed: DomainRuleCode[] = [
    "NOT_FOUND",
    "INVALID_STATUS",
    "SIGN_REQUIREMENTS",
    "CONFLICT",
    "VALIDATION_ERROR",
  ];
  const mapped = (allowed.includes(code as DomainRuleCode)
    ? code
    : code === "FORBIDDEN"
      ? "SIGN_REQUIREMENTS"
      : "VALIDATION_ERROR") as DomainRuleCode;
  throw new DomainRuleError(mapped, message);
}

/** Doctor prescription inbox via EMR facade (T127) — softDeleteWhere + audit. */
export async function listPrescriptions(raw?: { page?: number; status?: "DRAFT" | "ACTIVE" | "ALL" }) {
  const page = Math.max(1, raw?.page ?? 1);
  const status = raw?.status ?? "ALL";
  return withDoctor(async (ctx) => {
    const { listPrescriptionsForDoctor } = await import("@/lib/emr/prescriptions");
    const result = await listPrescriptionsForDoctor(
      { userId: ctx.userId, role: "DOCTOR", doctorId: ctx.doctorId },
      { page, status },
    );
    if (!result.ok) toDomainError(result.code, result.message);
    return result.data;
  });
}

/** Doctor prescription detail (own panel) via EMR facade (T127). */
export async function getPrescription(raw: { prescriptionId: string }) {
  const prescriptionId = cuidSchema.parse(raw.prescriptionId);
  return withDoctor(async (ctx) => {
    const { getPrescriptionForDoctor } = await import("@/lib/emr/prescriptions");
    const result = await getPrescriptionForDoctor(
      { userId: ctx.userId, role: "DOCTOR", doctorId: ctx.doctorId },
      prescriptionId,
    );
    if (!result.ok) toDomainError(result.code, result.message);
    return result.data;
  });
}

/** Read-only renewal lineage for the version history panel (T132). */
export async function listPrescriptionVersions(raw: { prescriptionId: string }) {
  const prescriptionId = cuidSchema.parse(raw.prescriptionId);
  return withDoctor(async (ctx) => {
    const { listPrescriptionVersions: emrListVersions } = await import("@/lib/emr/prescriptions");
    const result = await emrListVersions(
      { userId: ctx.userId, role: "DOCTOR", doctorId: ctx.doctorId },
      prescriptionId,
    );
    if (!result.ok) toDomainError(result.code, result.message);
    return result.data;
  });
}

/** Create or update an unsigned draft via EMR facade (T059). */
export async function savePrescriptionDraft(raw: z.input<typeof savePrescriptionDraftSchema>) {
  const input = savePrescriptionDraftSchema.parse(raw);
  return withDoctor(async (ctx) => {
    const { savePrescriptionDraft: emrSave } = await import("@/lib/emr/prescriptions");
    const result = await emrSave(
      { userId: ctx.userId, role: "DOCTOR", doctorId: ctx.doctorId },
      {
        patientUserId: input.patientUserId,
        prescriptionId: input.prescriptionId,
        appointmentId: input.appointmentId,
        expectedVersion: input.expectedVersion,
        instructions: input.instructions,
        aiAssisted: input.aiAssisted,
        lines: input.lines,
      },
    );
    if (!result.ok) toDomainError(result.code, result.message);
    revalidatePath("/[locale]/doctor", "layout");
    return { prescriptionId: result.data.prescriptionId, version: result.data.version };
  });
}

/** Sign & issue via EMR facade (password verified inside facade). */
export async function signPrescription(raw: z.input<typeof signPrescriptionSchema>) {
  const input = signPrescriptionSchema.parse(raw);
  return withDoctor(async (ctx) => {
    const { signPrescription: emrSign } = await import("@/lib/emr/prescriptions");
    const result = await emrSign(
      { userId: ctx.userId, role: "DOCTOR", doctorId: ctx.doctorId },
      {
        prescriptionId: input.prescriptionId,
        expectedVersion: input.expectedVersion,
        password: input.password,
        interactionAck: input.interactionAck,
        allergyDataUnavailableAck: input.allergyDataUnavailableAck,
      },
    );
    if (!result.ok) {
      if (result.code === "FORBIDDEN") {
        await auditDoctorEvent("doctor.access.denied", ctx.userId, {
          reason: "rx.sign",
          prescriptionId: input.prescriptionId,
        });
      }
      toDomainError(result.code, result.message);
    }
    revalidatePath("/[locale]/doctor", "layout");
    return {
      prescriptionId: result.data.prescriptionId,
      signedAt: result.data.signedAt.toISOString(),
    };
  });
}
