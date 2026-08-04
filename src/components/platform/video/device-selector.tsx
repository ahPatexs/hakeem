"use client";

import { useEffect, useState } from "react";
import { Label } from "@/components/ui/label";

export type MediaDeviceSelection = {
  audioInputId?: string;
  videoInputId?: string;
  audioOutputId?: string;
};

type Props = {
  value: MediaDeviceSelection;
  onChange: (next: MediaDeviceSelection) => void;
  className?: string;
};

function DeviceSelect({
  label,
  ariaLabel,
  devices,
  value,
  onChange,
}: {
  label: string;
  ariaLabel: string;
  devices: MediaDeviceInfo[];
  value?: string;
  onChange: (id: string) => void;
}) {
  return (
    <div className="space-y-1.5">
      <Label>{label}</Label>
      <select
        aria-label={ariaLabel}
        className="w-full rounded-lg border border-outline-variant/30 bg-transparent px-3 py-2 text-sm"
        value={value ?? devices[0]?.deviceId ?? ""}
        onChange={(e) => onChange(e.target.value)}
      >
        {devices.length === 0 ? <option value="">Unavailable</option> : null}
        {devices.map((d) => (
          <option key={d.deviceId} value={d.deviceId}>
            {d.label || label}
          </option>
        ))}
      </select>
    </div>
  );
}

export function DeviceSelector({ value, onChange, className }: Props) {
  const [audioInputs, setAudioInputs] = useState<MediaDeviceInfo[]>([]);
  const [videoInputs, setVideoInputs] = useState<MediaDeviceInfo[]>([]);
  const [audioOutputs, setAudioOutputs] = useState<MediaDeviceInfo[]>([]);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: true });
        stream.getTracks().forEach((t) => t.stop());
      } catch {
        // Permission may be denied; still try enumerate.
      }
      const devices = await navigator.mediaDevices.enumerateDevices();
      if (cancelled) return;
      setAudioInputs(devices.filter((d) => d.kind === "audioinput"));
      setVideoInputs(devices.filter((d) => d.kind === "videoinput"));
      setAudioOutputs(devices.filter((d) => d.kind === "audiooutput"));
    }
    void load();
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div className={className ?? "grid gap-3 sm:grid-cols-3"}>
      <DeviceSelect
        label="Microphone"
        ariaLabel="Microphone"
        devices={audioInputs}
        value={value.audioInputId}
        onChange={(audioInputId) => onChange({ ...value, audioInputId })}
      />
      <DeviceSelect
        label="Camera"
        ariaLabel="Camera"
        devices={videoInputs}
        value={value.videoInputId}
        onChange={(videoInputId) => onChange({ ...value, videoInputId })}
      />
      <DeviceSelect
        label="Speaker"
        ariaLabel="Speaker"
        devices={audioOutputs}
        value={value.audioOutputId}
        onChange={(audioOutputId) => onChange({ ...value, audioOutputId })}
      />
    </div>
  );
}
