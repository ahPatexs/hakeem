"use client";

import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { UserCheck } from "lucide-react";
import { admitVideoPatient } from "@/actions/doctor/video";
import { VideoSessionShell } from "@/components/platform/video";

export function VideoJoinButton({ appointmentId }: { appointmentId: string }) {
  const t = useTranslations("doctor.video");
  const [admitPending, startAdmitTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [admitted, setAdmitted] = useState(false);
  const [showSession, setShowSession] = useState(false);

  if (showSession) {
    return <VideoSessionShell appointmentId={appointmentId} role="doctor" />;
  }

  return (
    <div className="flex flex-col items-start gap-2">
      <div className="flex flex-wrap gap-2">
        <Button variant="soft" onClick={() => setShowSession(true)}>
          {t("joinAsHost")}
        </Button>
        <Button
          variant="outline"
          disabled={admitPending || admitted}
          onClick={() => {
            setError(null);
            startAdmitTransition(async () => {
              const res = await admitVideoPatient({ appointmentId });
              if (!res.ok) {
                setError(t("loadError"));
                return;
              }
              setAdmitted(true);
            });
          }}
        >
          <UserCheck className="me-2 h-4 w-4" aria-hidden />
          {admitted ? t("admitted") : t("admitPatient")}
        </Button>
      </div>
      {error ? (
        <p className="text-xs text-red-600" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}
