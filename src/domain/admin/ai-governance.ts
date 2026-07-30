import { getPlatformSettingBoolean } from "@/lib/admin/maintenance";
import { prisma } from "@/lib/prisma";

export async function isGlobalAiEnabled(scope: "patient" | "doctorDocumentation" | "doctorPrescription") {
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

export async function assertAiAllowed(userId: string, scope: "patient" | "doctorDocumentation" | "doctorPrescription") {
  if (!(await isGlobalAiEnabled(scope))) return false;
  if (await isUserAiDisabled(userId)) return false;
  return true;
}

export function aiFailClosed(enabled: boolean) {
  return enabled;
}
