"use server";

import { withDoctor } from "./_helpers";
import { getDoctorDashboardBundle } from "@/lib/doctor/dashboard";

export async function getDoctorDashboard() {
  return withDoctor((ctx) => getDoctorDashboardBundle(ctx.userId, ctx.doctorId));
}
