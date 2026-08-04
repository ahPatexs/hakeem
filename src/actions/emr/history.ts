"use server";

import { z } from "zod";
import {
  listAllergies,
  upsertAllergy,
  softDeleteAllergy,
  listConditions,
  upsertCondition,
  softDeleteCondition,
  listImmunizations,
  upsertImmunization,
  softDeleteImmunization,
  listFamilyHistory,
  upsertFamilyHistory,
  softDeleteFamilyHistory,
  getLifestyle,
  updateLifestyle,
  getEmergencyInfo,
  updateEmergencyInfo,
} from "@/lib/emr/history";
import { resolveEmrActor, toActionResult } from "./_actor";

const patientIdSchema = z.object({ patientUserId: z.string().cuid() });
const sourceSchema = z.enum(["PATIENT_REPORTED", "CLINICIAN_ATTESTED"]);
const severitySchema = z.enum(["MILD", "MODERATE", "SEVERE", "CRITICAL"]).nullable().optional();
const conditionStatusSchema = z.enum(["ACTIVE", "RESOLVED", "INACTIVE"]).optional();

export async function emrListAllergies(raw: unknown) {
  const parsed = patientIdSchema.safeParse(raw);
  if (!parsed.success) return { ok: false as const, code: "VALIDATION_ERROR" };
  const actor = await resolveEmrActor();
  if (!actor.ok) return { ok: false as const, code: actor.code };
  return toActionResult(await listAllergies(actor.data, parsed.data.patientUserId));
}

export async function emrUpsertAllergy(raw: unknown) {
  const schema = z.object({
    patientUserId: z.string().cuid(),
    id: z.string().cuid().optional(),
    substance: z.string().min(1).max(200),
    reaction: z.string().max(500).nullable().optional(),
    severity: severitySchema,
    source: sourceSchema,
    criticalFlag: z.boolean().optional(),
  });
  const parsed = schema.safeParse(raw);
  if (!parsed.success) return { ok: false as const, code: "VALIDATION_ERROR" };
  const actor = await resolveEmrActor();
  if (!actor.ok) return { ok: false as const, code: actor.code };
  return toActionResult(await upsertAllergy(actor.data, parsed.data));
}

export async function emrSoftDeleteAllergy(raw: unknown) {
  const schema = z.object({
    patientUserId: z.string().cuid(),
    id: z.string().cuid(),
    source: sourceSchema,
  });
  const parsed = schema.safeParse(raw);
  if (!parsed.success) return { ok: false as const, code: "VALIDATION_ERROR" };
  const actor = await resolveEmrActor();
  if (!actor.ok) return { ok: false as const, code: actor.code };
  return toActionResult(await softDeleteAllergy(actor.data, parsed.data));
}

export async function emrListConditions(raw: unknown) {
  const parsed = patientIdSchema.safeParse(raw);
  if (!parsed.success) return { ok: false as const, code: "VALIDATION_ERROR" };
  const actor = await resolveEmrActor();
  if (!actor.ok) return { ok: false as const, code: actor.code };
  return toActionResult(await listConditions(actor.data, parsed.data.patientUserId));
}

export async function emrUpsertCondition(raw: unknown) {
  const schema = z.object({
    patientUserId: z.string().cuid(),
    id: z.string().cuid().optional(),
    display: z.string().min(1).max(300),
    icd10Code: z.string().max(32).nullable().optional(),
    status: conditionStatusSchema,
    source: sourceSchema,
    onsetDate: z.coerce.date().nullable().optional(),
  });
  const parsed = schema.safeParse(raw);
  if (!parsed.success) return { ok: false as const, code: "VALIDATION_ERROR" };
  const actor = await resolveEmrActor();
  if (!actor.ok) return { ok: false as const, code: actor.code };
  return toActionResult(await upsertCondition(actor.data, parsed.data));
}

export async function emrSoftDeleteCondition(raw: unknown) {
  const schema = z.object({
    patientUserId: z.string().cuid(),
    id: z.string().cuid(),
    source: sourceSchema,
  });
  const parsed = schema.safeParse(raw);
  if (!parsed.success) return { ok: false as const, code: "VALIDATION_ERROR" };
  const actor = await resolveEmrActor();
  if (!actor.ok) return { ok: false as const, code: actor.code };
  return toActionResult(await softDeleteCondition(actor.data, parsed.data));
}

export async function emrListImmunizations(raw: unknown) {
  const parsed = patientIdSchema.safeParse(raw);
  if (!parsed.success) return { ok: false as const, code: "VALIDATION_ERROR" };
  const actor = await resolveEmrActor();
  if (!actor.ok) return { ok: false as const, code: actor.code };
  return toActionResult(await listImmunizations(actor.data, parsed.data.patientUserId));
}

export async function emrUpsertImmunization(raw: unknown) {
  const schema = z.object({
    patientUserId: z.string().cuid(),
    id: z.string().cuid().optional(),
    vaccineName: z.string().min(1).max(200),
    administeredOn: z.coerce.date().nullable().optional(),
    source: sourceSchema,
    lotNumber: z.string().max(100).nullable().optional(),
  });
  const parsed = schema.safeParse(raw);
  if (!parsed.success) return { ok: false as const, code: "VALIDATION_ERROR" };
  const actor = await resolveEmrActor();
  if (!actor.ok) return { ok: false as const, code: actor.code };
  return toActionResult(await upsertImmunization(actor.data, parsed.data));
}

export async function emrSoftDeleteImmunization(raw: unknown) {
  const schema = z.object({
    patientUserId: z.string().cuid(),
    id: z.string().cuid(),
    source: sourceSchema,
  });
  const parsed = schema.safeParse(raw);
  if (!parsed.success) return { ok: false as const, code: "VALIDATION_ERROR" };
  const actor = await resolveEmrActor();
  if (!actor.ok) return { ok: false as const, code: actor.code };
  return toActionResult(await softDeleteImmunization(actor.data, parsed.data));
}

export async function emrListFamilyHistory(raw: unknown) {
  const parsed = patientIdSchema.safeParse(raw);
  if (!parsed.success) return { ok: false as const, code: "VALIDATION_ERROR" };
  const actor = await resolveEmrActor();
  if (!actor.ok) return { ok: false as const, code: actor.code };
  return toActionResult(await listFamilyHistory(actor.data, parsed.data.patientUserId));
}

export async function emrUpsertFamilyHistory(raw: unknown) {
  const schema = z.object({
    patientUserId: z.string().cuid(),
    id: z.string().cuid().optional(),
    relation: z.string().min(1).max(100),
    conditionDisplay: z.string().min(1).max(300),
    notes: z.string().max(1000).nullable().optional(),
    source: sourceSchema.optional(),
  });
  const parsed = schema.safeParse(raw);
  if (!parsed.success) return { ok: false as const, code: "VALIDATION_ERROR" };
  const actor = await resolveEmrActor();
  if (!actor.ok) return { ok: false as const, code: actor.code };
  return toActionResult(await upsertFamilyHistory(actor.data, parsed.data));
}

export async function emrSoftDeleteFamilyHistory(raw: unknown) {
  const schema = z.object({
    patientUserId: z.string().cuid(),
    id: z.string().cuid(),
    source: sourceSchema.optional(),
  });
  const parsed = schema.safeParse(raw);
  if (!parsed.success) return { ok: false as const, code: "VALIDATION_ERROR" };
  const actor = await resolveEmrActor();
  if (!actor.ok) return { ok: false as const, code: actor.code };
  return toActionResult(await softDeleteFamilyHistory(actor.data, parsed.data));
}

export async function emrGetLifestyle(raw: unknown) {
  const parsed = patientIdSchema.safeParse(raw);
  if (!parsed.success) return { ok: false as const, code: "VALIDATION_ERROR" };
  const actor = await resolveEmrActor();
  if (!actor.ok) return { ok: false as const, code: actor.code };
  return toActionResult(await getLifestyle(actor.data, parsed.data.patientUserId));
}

export async function emrUpdateLifestyle(raw: unknown) {
  const schema = z.object({
    patientUserId: z.string().cuid(),
    smoking: z.string().max(200).nullable().optional(),
    alcohol: z.string().max(200).nullable().optional(),
    activity: z.string().max(200).nullable().optional(),
    notes: z.string().max(2000).nullable().optional(),
  });
  const parsed = schema.safeParse(raw);
  if (!parsed.success) return { ok: false as const, code: "VALIDATION_ERROR" };
  const actor = await resolveEmrActor();
  if (!actor.ok) return { ok: false as const, code: actor.code };
  return toActionResult(await updateLifestyle(actor.data, parsed.data));
}

export async function emrGetEmergencyInfo(raw: unknown) {
  const parsed = patientIdSchema.safeParse(raw);
  if (!parsed.success) return { ok: false as const, code: "VALIDATION_ERROR" };
  const actor = await resolveEmrActor();
  if (!actor.ok) return { ok: false as const, code: actor.code };
  return toActionResult(await getEmergencyInfo(actor.data, parsed.data.patientUserId));
}

export async function emrUpdateEmergencyInfo(raw: unknown) {
  const schema = z.object({
    patientUserId: z.string().cuid(),
    contactName: z.string().max(200).nullable().optional(),
    contactPhone: z.string().max(50).nullable().optional(),
    criticalAlertsText: z.string().max(2000).nullable().optional(),
    clinicianCriticalFlag: z.boolean().optional(),
  });
  const parsed = schema.safeParse(raw);
  if (!parsed.success) return { ok: false as const, code: "VALIDATION_ERROR" };
  const actor = await resolveEmrActor();
  if (!actor.ok) return { ok: false as const, code: actor.code };
  return toActionResult(await updateEmergencyInfo(actor.data, parsed.data));
}
