import type { AiFeatureKey } from "@prisma/client";
import { getPlatformSettingBoolean } from "@/lib/admin/maintenance";
import { prisma } from "@/lib/prisma";

export type AiGovernanceScope = "patient" | "doctorDocumentation" | "doctorPrescription";

export function aiScopeForFeature(feature: AiFeatureKey): AiGovernanceScope {
  switch (feature) {
    case "DOCTOR_SOAP":
    case "DOCTOR_SUMMARY":
      return "doctorDocumentation";
    case "RX_ASSIST":
    case "CDS":
      return "doctorPrescription";
    default:
      return "patient";
  }
}

export async function isGlobalAiEnabled(scope: AiGovernanceScope) {
  const key =
    scope === "patient"
      ? "ai.patientEnabled"
      : scope === "doctorDocumentation"
        ? "ai.doctorDocumentationEnabled"
        : "ai.doctorPrescriptionEnabled";
  return getPlatformSettingBoolean(key);
}

export async function isUserAiDisabled(userId: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { aiDisabledAt: true },
  });
  return Boolean(user?.aiDisabledAt);
}

export async function assertAiAllowed(userId: string, scope: AiGovernanceScope) {
  if (!(await isGlobalAiEnabled(scope))) return false;
  if (await isUserAiDisabled(userId)) return false;
  return true;
}

export async function assertFeatureAiAllowed(userId: string, feature: AiFeatureKey) {
  return assertAiAllowed(userId, aiScopeForFeature(feature));
}

export function aiFailClosed(enabled: boolean) {
  return enabled;
}
