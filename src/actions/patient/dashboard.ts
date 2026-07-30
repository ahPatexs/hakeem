"use server";

import { getDashboardBundle } from "@/lib/patient/dashboard";
import { withPatient } from "@/actions/patient/_helpers";

export async function getDashboard() {
  return withPatient((userId) => getDashboardBundle(userId));
}

export { getDashboardBundle };
