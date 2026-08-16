import { MapPin, Pill, Video } from "lucide-react";
import { Link } from "@/i18n/routing";
import { AllergyBanner } from "@/components/doctor/shared";
import { PersonAvatar } from "@/components/portal/person-avatar";
import { ageYears, formatApptDay, formatApptTime } from "@/lib/datetime";
import { portalCardClass } from "@/components/portal/chrome";
import { cn } from "@/lib/utils";
import type { Appointment } from "@prisma/client";

export function PatientFileHero({
  patientId,
  name,
  email,
  photoUrl,
  dateOfBirth,
  phone,
  locale,
  allergies,
  nextVisit,
  lastVisit,
  labels,
}: {
  patientId: string;
  name: string;
  email: string;
  photoUrl?: string | null;
  dateOfBirth?: Date | string | null;
  phone?: string | null;
  locale: string;
  allergies: string[] | null;
  nextVisit: Appointment | null;
  lastVisit: Appointment | null;
  labels: {
    back: string;
    file: string;
    years: string;
    nextVisit: string;
    lastVisit: string;
    noNext: string;
    noLast: string;
    openVisit: string;
    newRx: string;
    video: string;
    inPerson: string;
    allergies: string;
    noAllergies: string;
    allergiesUnavailable: string;
  };
}) {
  const age = ageYears(dateOfBirth);
  const details = [age != null ? `${age} ${labels.years}` : null, phone, email].filter(Boolean);

  return (
    <section className="welcome-banner space-y-5 p-5 sm:p-7">
      <Link href="/doctor/patients" className="text-sm font-medium text-white/80 hover:text-white">
        ← {labels.back}
      </Link>
      <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
        <div className="flex min-w-0 items-start gap-4">
          <PersonAvatar name={name} photoUrl={photoUrl} size="lg" className="h-16 w-16 text-xl ring-2 ring-white/30" />
          <div className="min-w-0">
            <p className="text-sm font-medium text-white/80">{labels.file}</p>
            <h1 className="font-headline mt-1 truncate text-2xl text-white md:text-3xl">{name}</h1>
            <p className="mt-1 truncate text-sm text-white/85">{details.join(" · ")}</p>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          {nextVisit ? (
            <Link
              href={
                nextVisit.status === "IN_PROGRESS"
                  ? `/doctor/consultations/${nextVisit.id}`
                  : `/doctor/appointments/${nextVisit.id}`
              }
              className="inline-flex items-center rounded-full bg-white px-4 py-2 text-sm font-semibold text-primary shadow-sm hover:bg-white/90"
            >
              {labels.openVisit}
            </Link>
          ) : null}
          <Link
            href={`/doctor/prescriptions/new?patient=${patientId}`}
            className="inline-flex items-center gap-2 rounded-full bg-white/15 px-4 py-2 text-sm font-semibold text-white hover:bg-white/25"
          >
            <Pill className="h-4 w-4" aria-hidden />
            {labels.newRx}
          </Link>
        </div>
      </div>
      <div className="grid gap-2 sm:grid-cols-2">
        <VisitGlance
          label={labels.nextVisit}
          visit={nextVisit}
          empty={labels.noNext}
          locale={locale}
          videoLabel={labels.video}
          inPersonLabel={labels.inPerson}
        />
        <VisitGlance
          label={labels.lastVisit}
          visit={lastVisit}
          empty={labels.noLast}
          locale={locale}
          videoLabel={labels.video}
          inPersonLabel={labels.inPerson}
        />
      </div>
      <AllergyBanner
        allergies={allergies}
        unavailableLabel={labels.allergiesUnavailable}
        listLabel={labels.allergies}
        noneLabel={labels.noAllergies}
      />
    </section>
  );
}

function VisitGlance({
  label,
  visit,
  empty,
  locale,
  videoLabel,
  inPersonLabel,
}: {
  label: string;
  visit: Appointment | null;
  empty: string;
  locale: string;
  videoLabel: string;
  inPersonLabel: string;
}) {
  return (
    <div className="rounded-2xl bg-white/12 px-4 py-3">
      <p className="text-xs font-medium text-white/80">{label}</p>
      {visit ? (
        <p className="mt-1 flex items-center gap-2 text-sm font-semibold text-white">
          {visit.mode === "VIDEO" ? (
            <Video className="h-4 w-4 shrink-0" aria-hidden />
          ) : (
            <MapPin className="h-4 w-4 shrink-0" aria-hidden />
          )}
          <span className="min-w-0 truncate">
            {formatApptDay(visit.startAt, locale)} · {formatApptTime(visit.startAt, locale)} ·{" "}
            {visit.mode === "VIDEO" ? videoLabel : inPersonLabel}
          </span>
        </p>
      ) : (
        <p className="mt-1 text-sm text-white/85">{empty}</p>
      )}
    </div>
  );
}

export function SnapshotCard({
  label,
  value,
  empty,
  tone,
}: {
  label: string;
  value: string[];
  empty: string;
  tone?: "danger" | "default";
}) {
  return (
    <div className={cn(portalCardClass, "p-4", tone === "danger" && "ring-1 ring-red-200")}>
      <p className="text-xs font-semibold uppercase tracking-wide text-on-surface-variant">{label}</p>
      {value.length ? (
        <ul className="mt-2 space-y-1 text-sm text-primary">
          {value.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      ) : (
        <p className="mt-2 text-sm text-on-surface-variant">{empty}</p>
      )}
    </div>
  );
}
