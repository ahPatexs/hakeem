import { prisma } from "@/lib/prisma";
import type { LocaleCode } from "@prisma/client";

export type PortalSettingsInput = {
  locale?: LocaleCode;
  theme?: string;
  notifyAppointmentEmail?: boolean;
  notifyClinicalEmail?: boolean;
  notifyPrescriptionEmail?: boolean;
  notifyPaymentEmail?: boolean;
  notifySystemEmail?: boolean;
};

export async function upsertPortalSettings(userId: string, data: PortalSettingsInput) {
  await prisma.portalSettings.upsert({
    where: { userId },
    create: { userId, ...data },
    update: data,
  });
}
