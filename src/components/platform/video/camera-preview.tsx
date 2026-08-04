"use client";

import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";

type Props = {
  className?: string;
  deviceId?: string;
  mirrored?: boolean;
};

export function CameraPreview({ className, deviceId, mirrored = true }: Props) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let stream: MediaStream | null = null;
    let cancelled = false;

    async function start() {
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          audio: false,
          video: deviceId ? { deviceId: { exact: deviceId } } : true,
        });
        if (cancelled) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
        }
        setError(null);
      } catch {
        setError("camera_unavailable");
      }
    }

    void start();
    return () => {
      cancelled = true;
      stream?.getTracks().forEach((t) => t.stop());
    };
  }, [deviceId]);

  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-2xl border border-outline-variant/20 bg-surface-container-low aspect-video",
        className,
      )}
    >
      <video
        ref={videoRef}
        autoPlay
        playsInline
        muted
        className={cn("h-full w-full object-cover", mirrored && "scale-x-[-1]")}
      />
      {error ? (
        <div className="absolute inset-0 flex items-center justify-center bg-surface/80 p-4 text-center text-sm text-on-surface-variant">
          Camera preview unavailable
        </div>
      ) : null}
    </div>
  );
}
