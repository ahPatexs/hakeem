"use server";

import { withDoctor } from "./_helpers";
import { searchPanelPatients, getPatientChart } from "@/lib/doctor/patients";
import { patientSearchSchema, patientIdSchema } from "@/lib/doctor/schemas";
import { DomainRuleError } from "@/domain/doctor/errors";
import { auditDoctorEvent } from "@/lib/doctor/phi-audit";

export async function searchPatients(raw: { query?: string; page?: number }) {
  const input = patientSearchSchema.parse({ query: raw.query ?? "", page: raw.page ?? 1 });
  return withDoctor((ctx) => searchPanelPatients(ctx.doctorId, input.query, input.page));
}

export async function getChart(raw: { patientUserId: string }) {
  const input = patientIdSchema.parse(raw);
  return withDoctor(async (ctx) => {
    const chart = await getPatientChart(ctx.doctorId, input.patientUserId);
    if (!chart) throw new DomainRuleError("NOT_FOUND");
    await auditDoctorEvent("doctor.chart.view", ctx.userId, { patientUserId: input.patientUserId }, input.patientUserId);
    return chart;
  });
}

/** Care-facing activity timeline (platform FR-021) — distinct from security audit. */
export async function getPatientActivityTimeline(raw: { patientUserId: string }) {
  const input = patientIdSchema.parse(raw);
  return withDoctor(async (ctx) => {
    const { getPatientTimeline } = await import("@/lib/platform/timeline");
    const result = await getPatientTimeline({
      patientUserId: input.patientUserId,
      viewerUserId: ctx.userId,
      viewerRole: "DOCTOR",
      doctorId: ctx.doctorId,
      limit: 30,
    });
    if (!result.ok) throw new DomainRuleError("NOT_FOUND");
    return result.data;
  });
}
