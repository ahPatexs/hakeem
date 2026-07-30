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
