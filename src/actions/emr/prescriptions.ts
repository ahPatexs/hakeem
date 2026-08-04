"use server";

import { z } from "zod";
import {
  listPrescriptions,
  renewPrescription,
  denyPatientPrescriptionMutation,
  savePrescriptionDraft,
  signPrescription,
  getPrescription,
  listPrescriptionVersions,
} from "@/lib/emr/prescriptions";
import { resolveEmrActor, toActionResult } from "./_actor";

const lineSchema = z.object({
  medicationName: z.string().min(1).max(200),
  dose: z.string().max(100).optional(),
  route: z.string().max(100).optional(),
  frequency: z.string().max(100).optional(),
  duration: z.string().max(100).optional(),
  quantity: z.string().max(100).optional(),
  instructions: z.string().max(500).optional(),
});

export async function emrListPrescriptions(raw: unknown) {
  const schema = z.object({
    patientUserId: z.string().cuid(),
    bucket: z.enum(["active", "history", "all"]).optional(),
    page: z.number().int().min(1).optional(),
    q: z.string().max(200).optional(),
  });
  const parsed = schema.safeParse(raw);
  if (!parsed.success) return { ok: false as const, code: "VALIDATION_ERROR" };
  const actor = await resolveEmrActor();
  if (!actor.ok) return { ok: false as const, code: actor.code };
  const { patientUserId, ...opts } = parsed.data;
  return toActionResult(await listPrescriptions(actor.data, patientUserId, opts));
}

export async function emrGetPrescription(raw: unknown) {
  const schema = z.object({ prescriptionId: z.string().cuid() });
  const parsed = schema.safeParse(raw);
  if (!parsed.success) return { ok: false as const, code: "VALIDATION_ERROR" };
  const actor = await resolveEmrActor();
  if (!actor.ok) return { ok: false as const, code: actor.code };
  return toActionResult(await getPrescription(actor.data, parsed.data.prescriptionId));
}

export async function emrListPrescriptionVersions(raw: unknown) {
  const schema = z.object({ prescriptionId: z.string().cuid() });
  const parsed = schema.safeParse(raw);
  if (!parsed.success) return { ok: false as const, code: "VALIDATION_ERROR" };
  const actor = await resolveEmrActor();
  if (!actor.ok) return { ok: false as const, code: actor.code };
  return toActionResult(await listPrescriptionVersions(actor.data, parsed.data.prescriptionId));
}

export async function emrRenewPrescription(raw: unknown) {
  const schema = z.object({ fromPrescriptionId: z.string().cuid() });
  const parsed = schema.safeParse(raw);
  if (!parsed.success) return { ok: false as const, code: "VALIDATION_ERROR" };
  const actor = await resolveEmrActor();
  if (!actor.ok) return { ok: false as const, code: actor.code };

  const denied = denyPatientPrescriptionMutation(actor.data);
  if (denied) return toActionResult(denied);

  return toActionResult(await renewPrescription(actor.data, parsed.data));
}

export async function emrSavePrescriptionDraft(raw: unknown) {
  const schema = z.object({
    patientUserId: z.string().cuid(),
    prescriptionId: z.string().cuid().optional(),
    appointmentId: z.string().cuid().nullable().optional(),
    expectedVersion: z.number().int().positive().optional(),
    instructions: z.string().max(2000).optional(),
    aiAssisted: z.boolean().optional(),
    lines: z.array(lineSchema).min(1),
  });
  const parsed = schema.safeParse(raw);
  if (!parsed.success) return { ok: false as const, code: "VALIDATION_ERROR" };
  const actor = await resolveEmrActor();
  if (!actor.ok) return { ok: false as const, code: actor.code };

  const denied = denyPatientPrescriptionMutation(actor.data);
  if (denied) return toActionResult(denied);

  return toActionResult(await savePrescriptionDraft(actor.data, parsed.data));
}

export async function emrSignPrescription(raw: unknown) {
  const schema = z.object({
    prescriptionId: z.string().cuid(),
    expectedVersion: z.number().int().positive(),
    password: z.string().min(1),
    interactionAck: z.boolean().optional(),
    allergyDataUnavailableAck: z.boolean().optional(),
  });
  const parsed = schema.safeParse(raw);
  if (!parsed.success) return { ok: false as const, code: "VALIDATION_ERROR" };
  const actor = await resolveEmrActor();
  if (!actor.ok) return { ok: false as const, code: actor.code };

  const denied = denyPatientPrescriptionMutation(actor.data);
  if (denied) return toActionResult(denied);

  return toActionResult(await signPrescription(actor.data, parsed.data));
}
