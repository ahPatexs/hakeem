import { setRequestLocale, getTranslations } from "next-intl/server";
import { Link } from "@/i18n/routing";
import { getSchedule } from "@/actions/doctor/schedule";
import { AppointmentActions } from "@/components/doctor/schedule/appointment-actions";
import { EmptyState, ErrorState, StatusBadge } from "@/components/doctor/shared";
import { ChevronLeft, ChevronRight } from "lucide-react";

function shiftDay(dateKey: string, days: number): string {
  const d = new Date(`${dateKey}T00:00:00`);
  d.setDate(d.getDate() + days);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export default async function DoctorSchedulePage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ date?: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const { date } = await searchParams;
  const t = await getTranslations("doctor.schedule");
  const ts = await getTranslations("doctor.status");

  const result = await getSchedule(date);
  if (!result.ok) {
    return <ErrorState title={t("title")} message={t("loadError")} />;
  }

  const { items, dateKey } = result.data;
  const dateLabel = new Date(`${dateKey}T00:00:00`).toLocaleDateString(
    locale === "ar" ? "ar-SA" : "en-US",
    { weekday: "long", year: "numeric", month: "long", day: "numeric" },
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-headline text-2xl text-primary md:text-3xl">{t("title")}</h1>
          <p className="mt-1 text-on-surface-variant">{dateLabel}</p>
        </div>
        <div className="flex items-center gap-2">
          <Link
            href={`/doctor/schedule?date=${shiftDay(dateKey, -1)}`}
            aria-label={t("previousDay")}
            className="rounded-full border border-outline-variant/30 p-2 hover:bg-surface-container-high"
          >
            <ChevronLeft className="h-4 w-4 rtl:rotate-180" aria-hidden />
          </Link>
          <Link
            href="/doctor/schedule"
            className="rounded-full border border-outline-variant/30 px-4 py-2 text-sm font-medium hover:bg-surface-container-high"
          >
            {t("today")}
          </Link>
          <Link
            href={`/doctor/schedule?date=${shiftDay(dateKey, 1)}`}
            aria-label={t("nextDay")}
            className="rounded-full border border-outline-variant/30 p-2 hover:bg-surface-container-high"
          >
            <ChevronRight className="h-4 w-4 rtl:rotate-180" aria-hidden />
          </Link>
        </div>
      </div>

      {items.length === 0 ? (
        <EmptyState title={t("emptyTitle")} description={t("emptyDescription")} />
      ) : (
        <ul className="space-y-3">
          {items.map((appt) => (
            <li
              key={appt.id}
              className="glass-card flex flex-col gap-3 rounded-2xl border border-outline-variant/20 bg-surface-container-low p-4 sm:flex-row sm:items-center sm:justify-between"
            >
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <Link
                    href={`/doctor/appointments/${appt.id}`}
                    className="font-medium text-primary hover:underline"
                  >
                    {appt.patient.name ?? appt.patient.email}
                  </Link>
                  <StatusBadge status={appt.status} label={ts(appt.status)} variant="appointment" />
                </div>
                <p className="mt-1 text-sm text-on-surface-variant">
                  {new Date(appt.startAt).toLocaleTimeString(locale === "ar" ? "ar-SA" : "en-US", {
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                  {" – "}
                  {new Date(appt.endAt).toLocaleTimeString(locale === "ar" ? "ar-SA" : "en-US", {
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                  {" · "}
                  {appt.mode === "VIDEO" ? t("video") : t("inPerson")}
                  {appt.reason ? ` · ${appt.reason}` : ""}
                </p>
              </div>
              <AppointmentActions appointmentId={appt.id} status={appt.status} />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
