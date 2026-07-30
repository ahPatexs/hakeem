"use server";

import { revenueSummary } from "@/actions/admin/billing";

export async function getRevenueSummary(input?: unknown) {
  return revenueSummary(input);
}
