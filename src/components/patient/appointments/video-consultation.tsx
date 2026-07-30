"use client";

import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { canJoinVideo } from "@/domain/patient/video";
import type { Appointment } from "@prisma/client";

export function VideoConsultation({
  appointment,
}: {
  appointment: Pick<Appointment, "id" | "mode" | "status" | "startAt" | "endAt" | "videoRoomId">;
}) {
  const t = useTranslations("patient.consultations");
  const canJoin = canJoinVideo(appointment);

  return (
    <div className="mx-auto max-w-lg space-y-6">
      <header className="text-center">
        <h1 className="font-headline text-2xl text-primary">{t("title")}</h1>
        <p className="mt-2 text-on-surface-variant">{t("subtitle")}</p>
      </header>

      <section className="glass-card space-y-4 rounded-2xl border border-outline-variant/20 p-8 text-center">
        <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-primary/10">
          <span className="text-3xl">📹</span>
        </div>
        {canJoin ? (
          <>
            <p className="text-sm text-on-surface-variant">{t("waitingRoom")}</p>
            <p className="text-xs text-on-surface-variant">{t("stubNote")}</p>
            <Button variant="soft" disabled>
              {t("joinStub")}
            </Button>
          </>
        ) : (
          <p className="text-sm text-red-600">{t("windowClosed")}</p>
        )}
      </section>
    </div>
  );
}
