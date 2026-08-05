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
}: Props) {
  const t = useTranslations("platform.video");

  return (
    <section className="mx-auto max-w-2xl space-y-6">
      <header className="text-center">
        <h1 className="font-headline text-2xl text-primary">{t("waitingTitle")}</h1>
        <p className="mt-2 text-sm text-on-surface-variant">
          {role === "doctor" ? t("waitingDoctorHint") : t("waitingPatientHint")}
        </p>
      </header>

      <CameraPreview deviceId={devices.videoInputId} />
      <DeviceSelector value={devices} onChange={onDevicesChange} />

      <div className="flex flex-col items-center gap-3">
        {needsConsent && onAcceptConsent ? (
          <Button variant="soft" disabled={pending} onClick={onAcceptConsent} aria-busy={pending}>
            {pending ? t("joining") : t("acceptConsentAndJoin")}
          </Button>
        ) : (
          <Button variant="soft" disabled={pending} onClick={onReady} aria-busy={pending}>
            {pending ? t("joining") : t("joinCall")}
          </Button>
        )}
      </div>
      {error ? (
        <p className="text-center text-sm text-red-600" role="alert">
          {error}
        </p>
      ) : null}
    </section>
  );
}
