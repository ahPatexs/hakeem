import { PlatformSettingValueType } from "@prisma/client";
import { AdminDomainError } from "@/domain/admin/errors";

export function parseSettingValue(valueType: PlatformSettingValueType, value: string) {
  switch (valueType) {
    case "BOOLEAN":
      if (value !== "true" && value !== "false") throw new AdminDomainError("VALIDATION_ERROR");
      return value;
    case "STRING":
      if (!value.trim()) throw new AdminDomainError("VALIDATION_ERROR");
      return value.trim();
    case "JSON":
      try {
        JSON.parse(value);
      } catch {
        throw new AdminDomainError("VALIDATION_ERROR");
      }
      return value;
    default:
      throw new AdminDomainError("VALIDATION_ERROR");
  }
}

export const SETTING_KEYS = [
  "maintenanceMode",
  "maintenanceMessage",
  "supportEmail",
  "supportPhone",
  "ai.patientEnabled",
  "ai.doctorDocumentationEnabled",
  "ai.doctorPrescriptionEnabled",
  "billing.consultationFeeCents",
] as const;
