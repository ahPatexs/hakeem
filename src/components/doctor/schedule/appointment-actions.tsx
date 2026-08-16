"use client";

import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "@/i18n/routing";
import { Link } from "@/i18n/routing";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/doctor/shared";
import { checkInPatient, startConsultation, markNoShow } from "@/actions/doctor/schedule";
import type { AppointmentStatus } from "@prisma/client";

export function AppointmentActions({
  appointmentId,
  status,
  size = "sm",
}: {
  appointmentId: string;
  status: AppointmentStatus;
  size?: "sm" | "default";
}) {
  const t = useTranslations("doctor.schedule");
  const tc = useTranslations("doctor.common");
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [noShowOpen, setNoShowOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function run(action: () => Promise<{ ok: boolean; code?: string }>) {
    setError(null);
    startTransition(async () => {
      const res = await action();
      if (!res.ok) {
        setError(res.code === "ALREADY_IN_PROGRESS" ? t("activeConflict") : tc("loadError"));
        return;
      }
      router.refresh();
    });
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      {status === "CONFIRMED" ? (
        <Button
          size={size}
          variant="outline"
          className="rounded-full"
          disabled={pending}
          onClick={() => run(() => checkInPatient({ appointmentId }))}
        >
          {t("checkIn")}
        </Button>
      ) : null}

      {(status === "CONFIRMED" || status === "CHECKED_IN") ? (
        <>
          <Button
            size={size}
            className="rounded-full"
            disabled={pending}
            onClick={() => run(() => startConsultation({ appointmentId }))}
          >
            {t("start")}
          </Button>
          <Button size={size} variant="ghost" className="rounded-full" disabled={pending} onClick={() => setNoShowOpen(true)}>
            {t("noShow")}
          </Button>
        </>
      ) : null}

      {status === "IN_PROGRESS" ? (
        <Button asChild size={size} className="rounded-full">
          <Link href={`/doctor/consultations/${appointmentId}`}>{t("openWorkspace")}</Link>
        </Button>
      ) : null}

      {status === "COMPLETED" ? (
        <Button asChild size={size} variant="outline" className="rounded-full">
          <Link href={`/doctor/consultations/${appointmentId}`}>{t("openWorkspace")}</Link>
        </Button>
      ) : null}

      {error ? (
        <p className="w-full text-xs text-red-600" role="alert">
          {error}
        </p>
      ) : null}

      <ConfirmDialog
        open={noShowOpen}
        onOpenChange={setNoShowOpen}
        title={t("noShowTitle")}
        description={t("noShowDescription")}
        confirmLabel={t("noShowConfirm")}
        cancelLabel={tc("cancel")}
        onConfirm={() => {
          setNoShowOpen(false);
          run(() => markNoShow({ appointmentId }));
        }}
      />
    </div>
  );
}
