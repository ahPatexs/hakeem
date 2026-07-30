import { getPlatformSettingBoolean } from "@/lib/platform/settings";
import { isPushEnabled } from "@/domain/platform/flags";

/** Feature flags backed by PlatformSetting rows (admin-managed) + env. */
export async function isPlatformPushEnabled(): Promise<boolean> {
  if (isPushEnabled()) return true;
  return getPlatformSettingBoolean("platform.pushEnabled");
}

export async function isPlatformVideoRecordingEnabled(): Promise<boolean> {
  return (
    process.env.PLATFORM_VIDEO_RECORDING_ENABLED === "true" ||
    (await getPlatformSettingBoolean("platform.videoRecordingEnabled"))
  );
}

export async function isPlatformAiPatientEnabled(): Promise<boolean> {
  return getPlatformSettingBoolean("ai.patientEnabled");
}

export async function isPlatformAiDoctorDocumentationEnabled(): Promise<boolean> {
  return getPlatformSettingBoolean("ai.doctorDocumentationEnabled");
}

export async function isPlatformAiDoctorPrescriptionEnabled(): Promise<boolean> {
  return getPlatformSettingBoolean("ai.doctorPrescriptionEnabled");
}
