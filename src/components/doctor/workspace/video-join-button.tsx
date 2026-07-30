"use client";

import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Video, UserCheck } from "lucide-react";
import { joinVideoAsHost, admitVideoPatient } from "@/actions/doctor/video";

export function VideoJoinButton({ appointmentId }: { appointmentId: string }) {
  const t = useTranslations("doctor.video");
  const [pending, startTransition] = useTransition();
  const [admitPending, startAdmitTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [admitted, setAdmitted] = useState(false);

  return (
    <div className="flex flex-col items-start gap-1">
      <div className="flex flex-wrap gap-2">
        <Button
          variant="soft"
          disabled={pending}
          onClick={() => {
            setError(null);
            startTransition(async () => {
              const res = await joinVideoAsHost({ appointmentId });
              if (!res.ok) {
                setError(res.code === "JOIN_WINDOW_CLOSED" ? t("windowClosed") : t("loadError"));
                return;
              }
              window.open(res.data.url, "_blank", "noopener,noreferrer");
            });
          }}
        >
          <Video className="me-2 h-4 w-4" aria-hidden />
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
