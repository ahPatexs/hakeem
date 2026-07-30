"use server";

import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { withPatient, withPatientMutation } from "@/actions/patient/_helpers";

const settingsSchema = z.object({
  locale: z.enum(["EN", "AR"]).optional(),
  theme: z.enum(["system", "light", "dark"]).optional(),
  notifyAppointmentEmail: z.boolean().optional(),
  notifyClinicalEmail: z.boolean().optional(),
  notifyPrescriptionEmail: z.boolean().optional(),
  notifyPaymentEmail: z.boolean().optional(),
  notifySystemEmail: z.boolean().optional(),
});

export async function getPortalSettings() {
  return withPatient((userId) =>
    prisma.portalSettings.findUnique({ where: { userId } }),
  );
}

export async function updatePortalSettings(input: unknown) {
  const parsed = settingsSchema.safeParse(input);
  if (!parsed.success) return { ok: false as const, code: "VALIDATION_ERROR" };

  return withPatientMutation(async (userId) => {
    await prisma.portalSettings.upsert({
      where: { userId },
      create: { userId, ...parsed.data },
      update: parsed.data,
    });
  });
}
