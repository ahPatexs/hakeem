"use client";

import { useState, useTransition } from "react";
import { useLocale, useTranslations } from "next-intl";
import { useRouter, Link } from "@/i18n/routing";
import { ArrowLeft, CalendarClock, MapPin, Video } from "lucide-react";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/patient/shared/status-badge";
import { ConfirmDialog } from "@/components/patient/shared/confirm-dialog";
import { PersonAvatar } from "@/components/portal/person-avatar";
import { SlotPicker } from "@/components/portal/slot-picker";
import {
  cancelAppointment,
  rescheduleAppointment,
} from "@/actions/patient/appointments";
import { canCancel, canReschedule } from "@/domain/patient/appointments";
import { formatApptDay, formatApptTime, formatApptWhen } from "@/lib/datetime";
import { localizedText } from "@/lib/utils";
import type { Appointment, Doctor } from "@prisma/client";
import type { AvailabilitySlot } from "@/lib/patient/availability";
import { RateDoctorForm } from "@/components/patient/appointments/rate-doctor";
import { VisitNotesCard, type PatientVisitNotes } from "@/components/patient/records/visit-notes-card";

type ApptDetail = Appointment & {
  doctor: Pick<Doctor, "id" | "slug" | "nameEn" | "nameAr" | "photoUrl">;
  rating?: { id: string; score: number; comment: string | null } | null;
  paymentObligations?: Array<{
    id: string;
    amountCents: number;
    currency: string;
    status: string;
  }>;
};

export function AppointmentDetailView({
  appointment,
  availability,
  visitNotes,
}: {
  appointment: ApptDetail;
  availability: AvailabilitySlot[];
  visitNotes?: PatientVisitNotes | null;
}) {
  const t = useTranslations("patient.appointments");
  const ts = useTranslations("patient.appointments.status");
  const locale = useLocale();
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [rescheduleOpen, setRescheduleOpen] = useState(false);
  const [selectedSlot, setSelectedSlot] = useState<AvailabilitySlot | null>(null);
  const doctorName = localizedText(locale, appointment.doctor.nameEn, appointment.doctor.nameAr);
  const canJoinVideo =
    appointment.mode === "VIDEO" &&
    (appointment.status === "CONFIRMED" ||
      appointment.status === "CHECKED_IN" ||
      appointment.status === "IN_PROGRESS");

  function handleCancel() {
    startTransition(async () => {
      const result = await cancelAppointment({ id: appointment.id });
      if (result.ok) router.push("/patient/appointments/history");
    });
  }

  function handleReschedule() {
    if (!selectedSlot) return;
    startTransition(async () => {
      const result = await rescheduleAppointment({
        id: appointment.id,
        startAt: selectedSlot.startAt,
        endAt: selectedSlot.endAt,
      });
      if (result.ok) router.push(`/patient/appointments/${result.data.appointment.id}`);
    });
  }

  return (
    <div className="space-y-6">
      <Link
        href="/patient/appointments/upcoming"
        className="inline-flex items-center gap-2 text-sm font-semibold text-on-surface-variant hover:text-primary"
      >
        <ArrowLeft className="h-4 w-4 rtl:rotate-180" aria-hidden />
        {t("backToList")}
      </Link>

      <header className="glass-card rounded-3xl border border-outline-variant/20 p-6 shadow-sm md:p-8">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="flex items-start gap-4">
            <PersonAvatar name={doctorName} photoUrl={appointment.doctor.photoUrl} size="lg" />
            <div>
              <p className="text-sm font-medium text-on-surface-variant">{t("detailTitle")}</p>
              <Link
                href={`/patient/doctors/${appointment.doctor.slug}`}
                className="font-headline text-2xl text-primary hover:underline"
              >
                {doctorName}
              </Link>
              <p className="mt-2 flex items-center gap-2 text-sm text-on-surface-variant">
                {appointment.mode === "VIDEO" ? (
                  <Video className="h-4 w-4 text-med-green" aria-hidden />
                ) : (
                  <MapPin className="h-4 w-4 text-med-green" aria-hidden />
                )}
                {t(`mode.${appointment.mode}`)}
              </p>
            </div>
          </div>
          <StatusBadge
            status={appointment.status}
            variant="appointment"
            label={ts(appointment.status)}
          />
        </div>

        <div className="mt-6 grid gap-4 sm:grid-cols-2">
          <div className="rounded-2xl bg-primary/5 px-4 py-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-on-surface-variant">{t("when")}</p>
            <p className="mt-1 font-headline text-lg text-primary">{formatApptDay(appointment.startAt, locale)}</p>
            <p className="text-sm font-medium text-on-surface-variant">{formatApptTime(appointment.startAt, locale)}</p>
          </div>
          {appointment.paymentObligations?.[0] ? (
            <div className="rounded-2xl bg-surface-container-low px-4 py-3">
              <p className="text-xs font-semibold uppercase tracking-wide text-on-surface-variant">{t("paymentFee")}</p>
              <p className="mt-1 font-headline text-lg text-primary">
                {(appointment.paymentObligations[0].amountCents / 100).toFixed(2)} {appointment.paymentObligations[0].currency}
              </p>
              <Link
                href={`/patient/payments/${appointment.paymentObligations[0].id}`}
                className="text-sm text-med-green hover:underline"
              >
                {appointment.paymentObligations[0].status.replaceAll("_", " ")}
              </Link>
            </div>
          ) : null}
          {appointment.reason ? (
            <div className="rounded-2xl bg-surface-container-low px-4 py-3">
              <p className="text-xs font-semibold uppercase tracking-wide text-on-surface-variant">{t("reason")}</p>
              <p className="mt-1 text-sm text-primary">{appointment.reason}</p>
            </div>
          ) : null}
        </div>
      </header>

      <div className="flex flex-wrap gap-3">
        {canJoinVideo ? (
          <Button asChild className="rounded-full">
            <Link href={`/patient/consultations/${appointment.id}`}>
              <Video className="h-4 w-4" aria-hidden />
              {t("joinVideo")}
            </Link>
          </Button>
        ) : null}
        {canReschedule(appointment) ? (
          <Button variant="outline" className="rounded-full" onClick={() => setRescheduleOpen(true)}>
            <CalendarClock className="h-4 w-4" aria-hidden />
            {t("reschedule")}
          </Button>
        ) : null}
        {canCancel(appointment) ? (
          <ConfirmDialog
            title={t("cancelTitle")}
            description={t("cancelDescription")}
            confirmLabel={t("cancelConfirm")}
            destructive
            onConfirm={handleCancel}
            loading={pending}
            trigger={
              <Button variant="outline" className="rounded-full">
                {t("cancel")}
              </Button>
            }
          />
        ) : null}
      </div>

      {visitNotes ? <VisitNotesCard notes={visitNotes} /> : null}

      {appointment.status === "COMPLETED" ? (
        <RateDoctorForm
          appointmentId={appointment.id}
          initialScore={appointment.rating?.score}
          initialComment={appointment.rating?.comment}
        />
      ) : null}

      {rescheduleOpen ? (
        <section className="glass-card space-y-4 rounded-3xl border border-outline-variant/20 p-6 shadow-sm">
          <h2 className="font-headline text-lg text-primary">{t("rescheduleTitle")}</h2>
          <SlotPicker
            slots={availability}
            selectedStartAt={selectedSlot?.startAt}
            onSelect={setSelectedSlot}
            emptyLabel={t("noSlots")}
          />
          {selectedSlot ? (
            <p className="text-sm text-on-surface-variant">
              {t("selectedSummary", { when: formatApptWhen(selectedSlot.startAt, locale) })}
            </p>
          ) : null}
          <div className="flex flex-wrap gap-3">
            <Button variant="ghost" className="rounded-full" onClick={() => setRescheduleOpen(false)}>
              {t("cancelAction")}
            </Button>
            <Button
              variant="soft"
              className="rounded-full"
              disabled={!selectedSlot || pending}
              onClick={handleReschedule}
            >
              {t("confirmReschedule")}
            </Button>
          </div>
        </section>
      ) : null}
    </div>
  );
}
