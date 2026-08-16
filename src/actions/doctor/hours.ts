"use server";

import { z } from "zod";
import { withDoctor } from "@/actions/doctor/_helpers";
import {
  addDoctorUnavailableDayRecord,
  getDoctorHoursRecord,
  removeDoctorUnavailableDayRecord,
  saveDoctorHoursRecord,
} from "@/lib/doctor/hours";

const windowSchema = z.object({
  weekday: z.number().int().min(0).max(6),
  startMinutes: z.number().int().min(0).max(1439),
  endMinutes: z.number().int().min(1).max(1440),
});

const saveSchema = z.object({
  timezone: z.string().min(1).max(80).optional(),
  week: z.array(windowSchema),
});

const dateSchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  reason: z.string().max(200).optional(),
});

export async function getDoctorHours() {
  return withDoctor(async (ctx) => getDoctorHoursRecord(ctx.doctorId));
}

export async function saveDoctorHours(input: unknown) {
  const parsed = saveSchema.safeParse(input);
  if (!parsed.success) return { ok: false as const, code: "VALIDATION_ERROR" };
  return withDoctor(async (ctx) => saveDoctorHoursRecord(ctx.doctorId, parsed.data));
}

export async function addDoctorUnavailableDay(input: unknown) {
  const parsed = dateSchema.safeParse(input);
  if (!parsed.success) return { ok: false as const, code: "VALIDATION_ERROR" };
  return withDoctor(async (ctx) => addDoctorUnavailableDayRecord(ctx.doctorId, parsed.data));
}

export async function removeDoctorUnavailableDay(input: unknown) {
  const parsed = dateSchema.pick({ date: true }).safeParse(input);
  if (!parsed.success) return { ok: false as const, code: "VALIDATION_ERROR" };
  return withDoctor(async (ctx) => removeDoctorUnavailableDayRecord(ctx.doctorId, parsed.data.date));
}
