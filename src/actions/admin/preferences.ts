"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { withAdmin, withAdminMutation } from "@/actions/admin/_helpers";
import { upsertPortalSettings } from "@/lib/platform/portal-settings";

const prefsSchema = z.object({
  locale: z.enum(["EN", "AR"]),
  theme: z.enum(["system", "light", "dark"]),
  notifyAppointmentEmail: z.boolean(),
  notifyClinicalEmail: z.boolean(),
  notifyPrescriptionEmail: z.boolean(),
  notifySystemEmail: z.boolean(),
});

export async function getAdminPortalSettings() {
  return withAdmin((admin) => prisma.portalSettings.findUnique({ where: { userId: admin.id } }));
}

export async function updateAdminPortalSettings(input: unknown) {
  const parsed = prefsSchema.safeParse(input);
  if (!parsed.success) return { ok: false as const, code: "VALIDATION_ERROR" };
  return withAdminMutation("admin:portal:access", async (admin) => {
    await upsertPortalSettings(admin.id, parsed.data);
    revalidatePath("/[locale]/admin", "layout");
  });
}
