"use client";

import { useState, useTransition } from "react";
import { useSearchParams } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import { useRouter } from "@/i18n/routing";
import { Button } from "@/components/ui/button";
import { PersonAvatar } from "@/components/portal/person-avatar";
import { SlotPicker, VisitModeToggle } from "@/components/portal/slot-picker";
import { holdAppointmentSlot, confirmAppointment } from "@/actions/patient/appointments";
import { aiAttachSessionToBooking } from "@/actions/ai/symptom";
import { formatApptWhen } from "@/lib/datetime";
import { localizedText } from "@/lib/utils";
import { DoctorRatingStars } from "@/components/portal/doctor-rating";
import type { AvailabilitySlot, UnavailableReason } from "@/lib/patient/availability";
import type { Doctor, Specialty } from "@prisma/client";

type DoctorDetail = Doctor & { specialty: Specialty };

type Availability = {
  slots: AvailabilitySlot[];
  timezone: string;
  unavailableReason?: UnavailableReason;
};

export function DoctorProfileView({
  doctor,
  availability,
}: {
  doctor: DoctorDetail;
  availability: Availability;
}) {
  const t = useTranslations("patient.doctors");
  const locale = useLocale();
  const router = useRouter();
  const searchParams = useSearchParams();
  const symptomSessionId = searchParams.get("symptomSessionId");
  const [mode, setMode] = useState<"IN_PERSON" | "VIDEO">("VIDEO");
  const [selected, setSelected] = useState<AvailabilitySlot | null>(null);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const slots = availability.slots;
  const emptyReason = availability.unavailableReason;
  const name = localizedText(locale, doctor.nameEn, doctor.nameAr);
  const title = localizedText(locale, doctor.titleEn, doctor.titleAr);
  const specialty = localizedText(locale, doctor.specialty.nameEn, doctor.specialty.nameAr);
  const bio = localizedText(locale, doctor.bioEn, doctor.bioAr);
  const noTimes = emptyReason === "NO_HOURS" || emptyReason === "NOT_BOOKABLE" || slots.length === 0;

  function handleBook() {
    if (!selected) return;
    setError(null);
    startTransition(async () => {
      const held = await holdAppointmentSlot({
        doctorId: doctor.id,
        mode,
        startAt: selected.startAt,
        endAt: selected.endAt,
      });
      if (!held.ok) {
        setError(t("bookError"));
        return;
      }
      const confirmed = await confirmAppointment({ id: held.data.id });
      if (!confirmed.ok) {
        setError(t("confirmError"));
        return;
      }

      if (symptomSessionId) {
        await aiAttachSessionToBooking({
          sessionId: symptomSessionId,
          appointmentId: confirmed.data.id,
        });
      }

      router.push(`/patient/appointments/${confirmed.data.id}`);
    });
  }

  return (
    <div className="space-y-6">
      <header className="glass-card flex flex-col gap-5 rounded-3xl border border-outline-variant/20 p-6 shadow-sm sm:flex-row sm:items-start md:p-8">
        <PersonAvatar name={name} photoUrl={doctor.photoUrl} size="lg" />
        <div className="min-w-0">
          <h1 className="font-headline text-2xl text-primary md:text-3xl">{name}</h1>
          {title ? <p className="mt-1 text-on-surface-variant">{title}</p> : null}
          <p className="mt-2 inline-flex rounded-full bg-med-green/10 px-3 py-1 text-xs font-semibold text-med-green">
            {specialty}
          </p>
          <div className="mt-3">
            <DoctorRatingStars
              avg={doctor.ratingAvg}
              count={doctor.ratingCount}
              countLabel={t("ratingCount", { count: doctor.ratingCount })}
              emptyLabel={t("noRatings")}
            />
          </div>
          {bio ? <p className="mt-4 text-sm leading-relaxed text-on-surface-variant">{bio}</p> : null}
        </div>
      </header>

      <section className="glass-card space-y-5 rounded-3xl border border-outline-variant/20 p-6 shadow-sm md:p-8">
        <div>
          <h2 className="font-headline text-lg text-primary">{t("availabilityTitle")}</h2>
          <p className="mt-1 text-sm text-on-surface-variant">{t("slotHint")}</p>
        </div>

        {noTimes ? (
          <p className="text-sm text-on-surface-variant">
            {emptyReason === "NO_HOURS" || emptyReason === "NOT_BOOKABLE" ? t("noHours") : t("noSlots")}
          </p>
        ) : (
          <>
            <VisitModeToggle
              value={mode}
              onChange={setMode}
              videoLabel={t("video")}
              inPersonLabel={t("inPerson")}
            />
            <SlotPicker
              slots={slots}
              selectedStartAt={selected?.startAt}
              onSelect={setSelected}
              emptyLabel={t("noSlots")}
            />
            {selected ? (
              <p className="rounded-2xl bg-primary/5 px-4 py-3 text-sm font-medium text-primary">
                {t("selectedSummary", {
                  when: formatApptWhen(selected.startAt, locale),
                  mode: mode === "VIDEO" ? t("video") : t("inPerson"),
                })}
              </p>
            ) : null}
            {error ? (
              <p className="text-sm text-red-600" role="alert">
                {error}
              </p>
            ) : null}
            <Button
              type="button"
              className="rounded-full"
              disabled={!selected || pending}
              onClick={handleBook}
            >
              {pending ? t("booking") : t("bookSlot")}
            </Button>
          </>
        )}
      </section>
    </div>
  );
}
