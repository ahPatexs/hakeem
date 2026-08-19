"use client";

import { useState, useTransition } from "react";
import { useSearchParams } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import { ArrowLeft, Award, Clock, Globe, Star } from "lucide-react";
import { Link, useRouter } from "@/i18n/routing";
import { Button } from "@/components/ui/button";
import { PersonAvatar } from "@/components/portal/person-avatar";
import { SlotPicker, VisitModeToggle } from "@/components/portal/slot-picker";
import { bookDoctorSlot } from "@/actions/patient/appointments";
import { aiAttachSessionToBooking } from "@/actions/ai/symptom";
import { formatApptWhen } from "@/lib/datetime";
import { minutesToTimeLabel } from "@/domain/doctor/hours";
import { localizedText, cn } from "@/lib/utils";
import { DoctorRatingStars } from "@/components/portal/doctor-rating";
import { EmptyState } from "@/components/patient/shared/empty-state";
import { portalCardClass } from "@/components/portal/chrome";
import { isSlotOfferable, type AvailabilitySlot, type UnavailableReason } from "@/lib/patient/availability";
import type { Doctor, Specialty } from "@prisma/client";

type DoctorDetail = Doctor & { specialty: Specialty };

type Availability = {
  slots: AvailabilitySlot[];
  timezone: string;
  unavailableReason?: UnavailableReason;
};

export type DoctorProfileHour = {
  weekday: number;
  startMinutes: number;
  endMinutes: number;
};

export type DoctorProfileReview = {
  id: string;
  score: number;
  comment: string | null;
  createdAt: string;
  reviewerName: string;
};

export type RatingBreakdown = { 1: number; 2: number; 3: number; 4: number; 5: number };

function languageLabel(code: string, t: (key: string) => string) {
  const normalized = code.toLowerCase();
  if (normalized === "en" || normalized.startsWith("en-")) return t("langEn");
  if (normalized === "ar" || normalized.startsWith("ar-")) return t("langAr");
  return code.toUpperCase();
}

export function DoctorProfileView({
  doctor,
  availability,
  hours,
  reviews,
  ratingBreakdown,
  pendingRateAppointmentId,
}: {
  doctor: DoctorDetail;
  availability: Availability;
  hours: DoctorProfileHour[];
  reviews: DoctorProfileReview[];
  ratingBreakdown: RatingBreakdown;
  pendingRateAppointmentId: string | null;
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
  const credentials = locale === "ar" && doctor.credentialsAr.length
    ? doctor.credentialsAr
    : doctor.credentialsEn.length
      ? doctor.credentialsEn
      : doctor.credentialsAr;
  const noTimes =
    emptyReason === "NO_HOURS" || emptyReason === "NOT_BOOKABLE" || !slots.some(isSlotOfferable);
  const hoursByDay = new Map(hours.map((row) => [row.weekday, row]));
  const breakdownMax = Math.max(1, ...[1, 2, 3, 4, 5].map((n) => ratingBreakdown[n as 1 | 2 | 3 | 4 | 5]));

  function handleBook() {
    if (!selected || !isSlotOfferable(selected)) return;
    setError(null);
    startTransition(async () => {
      try {
        const booked = await bookDoctorSlot({
          doctorId: doctor.id,
          slug: doctor.slug || undefined,
          mode,
          startAt: new Date(selected.startAt).toISOString(),
          endAt: new Date(selected.endAt).toISOString(),
        });
        if (!booked.ok) {
          console.error("bookDoctorSlot failed", booked);
          if (booked.code === "SESSION_EXPIRED" || booked.code === "UNAUTHENTICATED") {
            router.push("/login");
            return;
          }
          const message =
            booked.code === "SLOT_UNAVAILABLE" || booked.code === "SLOT_OUTSIDE_HOURS"
              ? t("bookError")
              : booked.code === "SLOT_HORIZON"
                ? t("bookErrorHorizon")
                : booked.code === "SCHEDULE_MISSING"
                  ? t("bookErrorSchedule")
                  : t("bookErrorRetry");
          setError(booked.detail ? `${message} (${booked.code}: ${booked.detail})` : `${message} (${booked.code})`);
          return;
        }

        if (symptomSessionId) {
          await aiAttachSessionToBooking({
            sessionId: symptomSessionId,
            appointmentId: booked.data.id,
          });
        }

        router.push(`/patient/appointments/${booked.data.id}`);
      } catch (error) {
        console.error("bookDoctorSlot threw", error);
        setError(t("bookErrorRetry"));
      }
    });
  }

  return (
    <div className="space-y-6">
      <Link
        href="/patient/doctors"
        className="inline-flex items-center gap-2 text-sm font-semibold text-primary hover:underline"
      >
        <ArrowLeft className="h-4 w-4 rtl:rotate-180" aria-hidden />
        {t("backToDoctors")}
      </Link>

      <section className={cn(portalCardClass, "flex flex-col gap-5 p-6 sm:flex-row sm:items-start md:p-8")}>
        <PersonAvatar name={name} photoUrl={doctor.photoUrl} size="lg" className="h-24 w-24 text-3xl sm:h-28 sm:w-28" />
        <div className="min-w-0 flex-1">
          <p className="inline-flex rounded-full bg-med-green/10 px-3 py-1 text-xs font-semibold text-med-green">
            {specialty}
          </p>
          <h1 className="mt-2 font-headline text-2xl text-primary md:text-3xl">{name}</h1>
          {title ? <p className="mt-1 text-on-surface-variant">{title}</p> : null}
          <a href="#reviews" className="mt-3 inline-block rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/40">
            <DoctorRatingStars
              avg={doctor.ratingAvg}
              count={doctor.ratingCount}
              countLabel={t("ratingCount", { count: doctor.ratingCount })}
              emptyLabel={t("noRatings")}
            />
          </a>
          <div className="mt-4 flex flex-wrap gap-2">
            {doctor.languages.map((code) => (
              <span
                key={code}
                className="inline-flex items-center gap-1.5 rounded-full bg-surface-container px-3 py-1 text-xs font-medium text-on-surface-variant"
              >
                <Globe className="h-3.5 w-3.5 text-med-green" aria-hidden />
                {languageLabel(code, t)}
              </span>
            ))}
            {doctor.yearsExperience ? (
              <span className="inline-flex items-center gap-1.5 rounded-full bg-surface-container px-3 py-1 text-xs font-medium text-on-surface-variant">
                <Award className="h-3.5 w-3.5 text-med-green" aria-hidden />
                {t("experienceLabel", { years: doctor.yearsExperience })}
              </span>
            ) : null}
          </div>
        </div>
      </section>

      {pendingRateAppointmentId ? (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-3xl border border-med-green/30 bg-med-green/8 px-5 py-4">
          <p className="text-sm font-medium text-primary">{t("rateAfterVisit")}</p>
          <Button asChild className="rounded-full" variant="soft">
            <Link href={`/patient/appointments/${pendingRateAppointmentId}`}>{t("rateAfterVisitCta")}</Link>
          </Button>
        </div>
      ) : null}

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_22rem] lg:items-start">
        <div className="space-y-6">
          <section className={cn(portalCardClass, "space-y-3 p-6 md:p-7")}>
            <h2 className="font-headline text-lg text-primary">{t("aboutTitle")}</h2>
            {bio ? (
              <p className="text-sm leading-relaxed text-on-surface-variant">{bio}</p>
            ) : (
              <p className="text-sm text-on-surface-variant">{t("bioEmpty")}</p>
            )}
            {credentials.length > 0 ? (
              <ul className="mt-2 space-y-1.5">
                {credentials.map((item) => (
                  <li key={item} className="flex items-start gap-2 text-sm text-on-surface">
                    <Award className="mt-0.5 h-4 w-4 shrink-0 text-med-green" aria-hidden />
                    {item}
                  </li>
                ))}
              </ul>
            ) : null}
          </section>

          <section className={cn(portalCardClass, "space-y-3 p-6 md:p-7")}>
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-med-green" aria-hidden />
              <h2 className="font-headline text-lg text-primary">{t("hoursTitle")}</h2>
            </div>
            {hours.length === 0 ? (
              <p className="text-sm text-on-surface-variant">{t("hoursEmpty")}</p>
            ) : (
              <ul className="divide-y divide-outline-variant/15">
                {[0, 1, 2, 3, 4, 5, 6].map((day) => {
                  const row = hoursByDay.get(day);
                  return (
                    <li key={day} className="flex items-center justify-between gap-3 py-2 text-sm first:pt-0 last:pb-0">
                      <span className="font-medium text-primary">{t(`weekday.${day}`)}</span>
                      <span className="tabular-nums text-on-surface-variant">
                        {row
                          ? `${minutesToTimeLabel(row.startMinutes)} – ${minutesToTimeLabel(row.endMinutes)}`
                          : t("hoursClosed")}
                      </span>
                    </li>
                  );
                })}
              </ul>
            )}
          </section>

          <section id="reviews" className={cn(portalCardClass, "scroll-mt-24 space-y-5 p-6 md:p-7")}>
            <div>
              <h2 className="font-headline text-lg text-primary">{t("reviewsTitle")}</h2>
              <p className="mt-1 text-sm text-on-surface-variant">{t("reviewsHint")}</p>
            </div>

            {doctor.ratingCount > 0 ? (
              <div className="grid gap-5 sm:grid-cols-[auto_1fr] sm:items-center">
                <div className="rounded-2xl bg-primary/5 px-5 py-4 text-center">
                  <p className="font-headline text-4xl text-primary">{doctor.ratingAvg.toFixed(1)}</p>
                  <DoctorRatingStars avg={doctor.ratingAvg} count={doctor.ratingCount} size="sm" />
                  <p className="mt-1 text-xs text-on-surface-variant">
                    {t("ratingCount", { count: doctor.ratingCount })}
                  </p>
                </div>
                <div className="space-y-1.5" aria-label={t("scoreBreakdown")}>
                  {([5, 4, 3, 2, 1] as const).map((score) => {
                    const count = ratingBreakdown[score];
                    const width = Math.round((count / breakdownMax) * 100);
                    return (
                      <div key={score} className="flex items-center gap-2 text-xs">
                        <span className="w-8 tabular-nums text-on-surface-variant">{score}★</span>
                        <div className="h-2 flex-1 overflow-hidden rounded-full bg-surface-container">
                          <div className="h-full rounded-full bg-amber-400" style={{ width: `${width}%` }} />
                        </div>
                        <span className="w-6 tabular-nums text-on-surface-variant">{count}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            ) : null}

            {reviews.length === 0 ? (
              <EmptyState title={t("reviewsEmpty")} description={t("reviewsEmptyHint")} className="border-0 bg-surface-container-low/80 py-10 shadow-none" />
            ) : (
              <ul className="divide-y divide-outline-variant/15">
                {reviews.map((review) => (
                  <li key={review.id} className="py-4 first:pt-0 last:pb-0">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <p className="font-semibold text-primary">{review.reviewerName || t("reviewAnonymous")}</p>
                      <time className="text-xs text-on-surface-variant" dateTime={review.createdAt}>
                        {new Date(review.createdAt).toLocaleDateString(locale === "ar" ? "ar-SA" : "en-US", {
                          dateStyle: "medium",
                        })}
                      </time>
                    </div>
                    <div className="mt-1 inline-flex items-center gap-0.5" aria-label={`${review.score} / 5`}>
                      {[1, 2, 3, 4, 5].map((n) => (
                        <Star
                          key={n}
                          className={
                            n <= review.score
                              ? "h-3.5 w-3.5 fill-amber-400 text-amber-400"
                              : "h-3.5 w-3.5 fill-transparent text-outline-variant"
                          }
                        />
                      ))}
                    </div>
                    {review.comment ? (
                      <p className="mt-2 text-sm leading-relaxed text-on-surface-variant">{review.comment}</p>
                    ) : null}
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>

        <aside className={cn(portalCardClass, "space-y-5 p-6 lg:sticky lg:top-24 md:p-7")}>
          <div>
            <h2 className="font-headline text-lg text-primary">{t("bookTitle")}</h2>
            <p className="mt-1 text-sm text-on-surface-variant">{t("slotHint")}</p>
          </div>

          {noTimes ? (
            <EmptyState
              title={emptyReason === "NO_HOURS" || emptyReason === "NOT_BOOKABLE" ? t("noHours") : t("noSlots")}
              className="border-0 bg-surface-container-low/80 py-8 shadow-none"
            />
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
                onSelect={(slot) => {
                  if (!isSlotOfferable(slot)) return;
                  setSelected(slot);
                  setError(null);
                }}
                emptyLabel={t("noSlots")}
                timeZone={availability.timezone}
                bookedLabel={t("slotBooked")}
                pastLabel={t("slotPast")}
              />
              {selected && isSlotOfferable(selected) ? (
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
                className="w-full rounded-full"
                disabled={!selected || !isSlotOfferable(selected) || pending}
                onClick={handleBook}
              >
                {pending ? t("booking") : t("bookSlot")}
              </Button>
            </>
          )}
        </aside>
      </div>
    </div>
  );
}
