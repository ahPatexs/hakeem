"use client";

import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { useRouter, Link } from "@/i18n/routing";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/patient/shared/status-badge";
import { ConfirmDialog } from "@/components/patient/shared/confirm-dialog";
import {
  cancelAppointment,
  rescheduleAppointment,
} from "@/actions/patient/appointments";
import { canCancel, canReschedule } from "@/domain/patient/appointments";
import type { Appointment, Doctor } from "@prisma/client";
import { generateStubAvailability } from "@/lib/patient/availability-stub";

type ApptDetail = Appointment & {
  doctor: Pick<Doctor, "id" | "slug" | "nameEn" | "nameAr" | "photoUrl">;
};

export function AppointmentDetailView({ appointment }: { appointment: ApptDetail }) {
  const t = useTranslations("patient.appointments");
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [rescheduleOpen, setRescheduleOpen] = useState(false);
  const [selectedSlot, setSelectedSlot] = useState<string | null>(null);
  const slots = generateStubAvailability();

  const cancelAllowed = canCancel(appointment);
  const rescheduleAllowed = canReschedule(appointment);

  function handleCancel() {
    startTransition(async () => {
      const result = await cancelAppointment({ id: appointment.id });
      if (result.ok) router.push("/patient/appointments/history");
    });
  }

  function handleReschedule() {
    if (!selectedSlot) return;
    const slot = slots.find((s) => s.startAt === selectedSlot);
    if (!slot) return;
    startTransition(async () => {
      const result = await rescheduleAppointment({
        id: appointment.id,
        startAt: slot.startAt,
        endAt: slot.endAt,
      });
      if (result.ok) router.push(`/patient/appointments/${result.data.appointment.id}`);
    });
  }

  return (
    <div className="space-y-6">
      <header className="glass-card rounded-2xl border border-outline-variant/20 p-6">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1 className="font-headline text-2xl text-primary">{t("detailTitle")}</h1>
            <Link href={`/patient/doctors/${appointment.doctor.slug}`} className="text-med-green hover:underline">
              {appointment.doctor.nameEn}
            </Link>
          </div>
          <StatusBadge status={appointment.status} variant="appointment" />
        </div>
        <dl className="mt-4 grid gap-2 text-sm sm:grid-cols-2">
          <div>
            <dt className="text-on-surface-variant">{t("when")}</dt>
            <dd className="font-medium">{new Date(appointment.startAt).toLocaleString()}</dd>
          </div>
          <div>
            <dt className="text-on-surface-variant">{t("modeLabel")}</dt>
            <dd className="font-medium">{t(`mode.${appointment.mode}`)}</dd>
          </div>
          {appointment.reason ? (
            <div className="sm:col-span-2">
              <dt className="text-on-surface-variant">{t("reason")}</dt>
              <dd>{appointment.reason}</dd>
            </div>
          ) : null}
        </dl>
      </header>

      <div className="flex flex-wrap gap-3">
        {appointment.mode === "VIDEO" &&
        (appointment.status === "CONFIRMED" ||
          appointment.status === "CHECKED_IN" ||
          appointment.status === "IN_PROGRESS") ? (
          <Button asChild variant="soft">
            <Link href={`/patient/consultations/${appointment.id}`}>{t("joinVideo")}</Link>
          </Button>
        ) : null}
        {cancelAllowed ? (
          <ConfirmDialog
            title={t("cancelTitle")}
            description={t("cancelDescription")}
            confirmLabel={t("cancelConfirm")}
            destructive
            onConfirm={handleCancel}
            loading={pending}
            trigger={<Button variant="outline">{t("cancel")}</Button>}
          />
        ) : null}
        {rescheduleAllowed ? (
          <Button variant="outline" onClick={() => setRescheduleOpen(true)}>
            {t("reschedule")}
          </Button>
        ) : null}
      </div>

      {rescheduleOpen ? (
        <section className="glass-card space-y-4 rounded-2xl border border-outline-variant/20 p-6">
          <h2 className="font-headline text-lg text-primary">{t("rescheduleTitle")}</h2>
          <p className="text-xs text-on-surface-variant">{t("availabilityStubNote")}</p>
          <div className="grid max-h-48 grid-cols-2 gap-2 overflow-y-auto sm:grid-cols-3">
            {slots.slice(0, 24).map((slot) => (
              <Button
                key={slot.startAt}
                type="button"
                size="sm"
                variant={selectedSlot === slot.startAt ? "soft" : "outline"}
                className="h-auto whitespace-normal py-2 text-xs"
                onClick={() => setSelectedSlot(slot.startAt)}
              >
                {new Date(slot.startAt).toLocaleString(undefined, {
                  month: "short",
                  day: "numeric",
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </Button>
            ))}
          </div>
          <div className="flex gap-3">
            <Button variant="ghost" onClick={() => setRescheduleOpen(false)}>
              {t("cancelAction")}
            </Button>
            <Button variant="soft" disabled={!selectedSlot || pending} onClick={handleReschedule}>
              {t("confirmReschedule")}
            </Button>
          </div>
        </section>
      ) : null}
    </div>
  );
}
