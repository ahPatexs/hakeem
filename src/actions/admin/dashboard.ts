"use server";

import { withAdmin, type AdminActionResult } from "@/actions/admin/_helpers";
import { buildDashboardSnapshot, type DashboardSnapshot } from "@/domain/admin/dashboard";

export async function getDashboardSnapshot(): Promise<AdminActionResult<DashboardSnapshot>> {
  return withAdmin(async (admin) => buildDashboardSnapshot(admin.id));
}
