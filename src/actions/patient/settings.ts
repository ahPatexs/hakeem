"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { withPatient, withPatientMutation } from "@/actions/patient/_helpers";
import { upsertPortalSettings } from "@/lib/platform/portal-settings";

const settingsSchema = z.object({
  locale: z.enum(["EN", "AR"]),
  theme: z.enum(["system", "light", "dark"]),
  notifyAppointmentEmail: z.boolean(),
  notifyClinicalEmail: z.boolean(),
  notifyPrescriptionEmail: z.boolean(),
  notifyPaymentEmail: z.boolean(),
  notifySystemEmail: z.boolean(),
});

export async function getPortalSettings() {
  return withPatient((userId) => prisma.portalSettings.findUnique({ where: { userId } }));
}

export async function updatePortalSettings(input: unknown) {
  const parsed = settingsSchema.safeParse(input);
  if (!parsed.success) return { ok: false as const, code: "VALIDATION_ERROR" };

  return withPatientMutation(async (userId) => {
    await upsertPortalSettings(userId, parsed.data);
    revalidatePath("/[locale]/patient", "layout");
  });
}
