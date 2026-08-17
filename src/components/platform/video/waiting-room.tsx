"use client";

import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { CameraPreview } from "./camera-preview";
import { DeviceSelector, type MediaDeviceSelection } from "./device-selector";

type Props = {
  role: "patient" | "doctor";
  devices: MediaDeviceSelection;
  onDevicesChange: (next: MediaDeviceSelection) => void;
  onReady: () => void;
  onAcceptConsent?: () => void;
  needsConsent?: boolean;
  pending?: boolean;
  error?: string | null;
  demoHint?: boolean;
  compact?: boolean;
};

export function VideoWaitingRoom({
  role,
  devices,
  onDevicesChange,
  onReady,
  onAcceptConsent,
  needsConsent,
  pending,
  error,
  demoHint,
  compact,
}: Props) {
  const t = useTranslations("platform.video");

  return (
    <section className={compact ? "space-y-4" : "mx-auto max-w-2xl space-y-6"}>
      <header className={compact ? "" : "text-center"}>
        <h2 className={compact ? "font-headline text-lg text-primary" : "font-headline text-2xl text-primary"}>
          {t("waitingTitle")}
        </h2>
        <p className="mt-1 text-sm text-on-surface-variant">
          {role === "doctor" ? t("waitingDoctorHint") : t("waitingPatientHint")}
        </p>
        {demoHint ? (
          <p className="mt-2 text-sm font-medium text-primary" role="status">
            {t("demoWaitingHint")}
          </p>
        ) : null}
      </header>

      <CameraPreview deviceId={devices.videoInputId} />
      <DeviceSelector value={devices} onChange={onDevicesChange} />

      <div className={compact ? "flex flex-col items-stretch gap-3" : "flex flex-col items-center gap-3"}>
        {needsConsent && onAcceptConsent ? (
          <Button variant="soft" disabled={pending} onClick={onAcceptConsent} aria-busy={pending} className="rounded-full">
            {pending ? t("joining") : t("acceptConsentAndJoin")}
          </Button>
        ) : (
          <Button variant="soft" disabled={pending} onClick={onReady} aria-busy={pending} className="rounded-full">
            {pending ? t("joining") : t("joinCall")}
          </Button>
        )}
      </div>
      {error ? (
        <p className="text-sm text-red-600" role="alert">
          {error}
        </p>
      ) : null}
    </section>
  );
}
