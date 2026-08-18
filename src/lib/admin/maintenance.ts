import { prisma } from "@/lib/prisma";
import { PlatformSettingValueType } from "@prisma/client";
import {
  CONSULT_FEE_SETTING_KEY,
  DEFAULT_CONSULTATION_FEE_CENTS,
  parseConsultFeeCents,
} from "@/domain/billing/constants";

const DEFAULT_SETTINGS: Record<string, { valueType: PlatformSettingValueType; value: string }> = {
  maintenanceMode: { valueType: "BOOLEAN", value: "false" },
  maintenanceMessage: { valueType: "STRING", value: "Platform is under maintenance. Please try again later." },
  supportEmail: { valueType: "STRING", value: "support@hakeem.example" },
  supportPhone: { valueType: "STRING", value: "+966500000000" },
  "ai.patientEnabled": { valueType: "BOOLEAN", value: "true" },
  "ai.doctorDocumentationEnabled": { valueType: "BOOLEAN", value: "true" },
  "ai.doctorPrescriptionEnabled": { valueType: "BOOLEAN", value: "true" },
  [CONSULT_FEE_SETTING_KEY]: { valueType: "STRING", value: String(DEFAULT_CONSULTATION_FEE_CENTS) },
};

export async function getPlatformSetting(key: string): Promise<string | null> {
  const row = await prisma.platformSetting.findUnique({ where: { key } });
  if (row) return row.value;
  return DEFAULT_SETTINGS[key]?.value ?? null;
}

export async function getPlatformSettingBoolean(key: string): Promise<boolean> {
  const raw = await getPlatformSetting(key);
  return raw === "true";
}

export async function isMaintenanceMode(): Promise<boolean> {
  return getPlatformSettingBoolean("maintenanceMode");
}

export async function ensureDefaultPlatformSettings() {
  for (const [key, def] of Object.entries(DEFAULT_SETTINGS)) {
    await prisma.platformSetting.upsert({
      where: { key },
      update: {},
      create: { key, valueType: def.valueType, value: def.value },
    });
  }
}

export async function getAllPlatformSettings() {
  await ensureDefaultPlatformSettings();
  return prisma.platformSetting.findMany({ orderBy: { key: "asc" } });
}

export async function getConsultationFeeCents(): Promise<number> {
  const raw = await getPlatformSetting(CONSULT_FEE_SETTING_KEY);
  return parseConsultFeeCents(raw);
}
