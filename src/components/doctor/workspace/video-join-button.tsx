"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { VideoSessionShell } from "@/components/platform/video";

export function VideoJoinButton({ appointmentId }: { appointmentId: string }) {
  const t = useTranslations("doctor.video");
  const [showSession, setShowSession] = useState(false);

  if (showSession) {
    return <VideoSessionShell appointmentId={appointmentId} role="doctor" />;
  }

  return (
    <div className="flex flex-col items-start gap-2">
      <Button variant="soft" onClick={() => setShowSession(true)}>
        {t("joinAsHost")}
      </Button>
    </div>
  );
}
