"use server";

import { withDoctor } from "./_helpers";
import { getWorkspaceBundle } from "@/lib/doctor/workspace";
import { appointmentIdSchema } from "@/lib/doctor/schemas";
import { DomainRuleError } from "@/domain/doctor/errors";
import { auditDoctorEvent } from "@/lib/doctor/phi-audit";

export async function getWorkspace(raw: { appointmentId: string }) {
  const input = appointmentIdSchema.parse(raw);
  return withDoctor(async (ctx) => {
    const bundle = await getWorkspaceBundle(ctx.doctorId, input.appointmentId);
    if (!bundle) throw new DomainRuleError("NOT_FOUND");
    await auditDoctorEvent(
      "doctor.chart.view",
      ctx.userId,
      { surface: "workspace", appointmentId: input.appointmentId },
      bundle.appointment.patientUserId,
    );
    return bundle;
  });
}
