"use client";

import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { canJoinVideo } from "@/domain/patient/video";
import { joinPatientVideo } from "@/actions/patient/video";
import type { Appointment } from "@prisma/client";

export function VideoConsultation({
  appointment,
}: {
  appointment: Pick<Appointment, "id" | "mode" | "status" | "startAt" | "endAt" | "videoRoomId">;
}) {
  const t = useTranslations("patient.consultations");
  const canJoin = canJoinVideo(appointment);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  return (
    <div className="mx-auto max-w-lg space-y-6">
      <header className="text-center">
        <h1 className="font-headline text-2xl text-primary">{t("title")}</h1>
        <p className="mt-2 text-on-surface-variant">{t("subtitle")}</p>
      </header>

      <section className="glass-card space-y-4 rounded-2xl border border-outline-variant/20 p-8 text-center">
        <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-primary/10">
          <span className="text-3xl" aria-hidden>
            📹
          </span>
        </div>
        {canJoin ? (
          <>
            <p className="text-sm text-on-surface-variant">{t("waitingRoom")}</p>
            <Button
              variant="soft"
              disabled={pending}
              onClick={() => {
                setError(null);
                startTransition(async () => {
                  const res = await joinPatientVideo({ appointmentId: appointment.id });
                  if (!res.ok) {
                    setError(
                      res.code === "JOIN_WINDOW_CLOSED" ? t("windowClosed") : t("loadError"),
                    );
                    return;
                  }
                  window.open(res.url, "_blank", "noopener,noreferrer");
                });
              }}
            >
              {t("joinCall")}
            </Button>
            {error ? (
              <p className="text-xs text-red-600" role="alert">
                {error}
              </p>
            ) : null}
          </>
        ) : (
          <p className="text-sm text-red-600">{t("windowClosed")}</p>
        )}
      </section>
    </div>
  );
}
