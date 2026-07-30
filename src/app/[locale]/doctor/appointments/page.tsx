import { setRequestLocale, getTranslations } from "next-intl/server";
import { Link } from "@/i18n/routing";
import { getUpcoming } from "@/actions/doctor/schedule";
import { AppointmentActions } from "@/components/doctor/schedule/appointment-actions";
import { EmptyState, ErrorState, StatusBadge } from "@/components/doctor/shared";

export default async function DoctorAppointmentsPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("doctor.appointments");
  const ts = await getTranslations("doctor.schedule");
  const tStatus = await getTranslations("doctor.status");

  const result = await getUpcoming();
  if (!result.ok) {
    return <ErrorState title={t("title")} message={t("loadError")} />;
  }

  const items = result.data;
  const fmtDate = (d: Date | string) =>
    new Date(d).toLocaleString(locale === "ar" ? "ar-SA" : "en-US", {
      dateStyle: "medium",
      timeStyle: "short",
    });

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-headline text-2xl text-primary md:text-3xl">{t("title")}</h1>
          <p className="mt-1 text-on-surface-variant">{t("subtitle")}</p>
        </div>
        <Link
          href="/doctor/schedule"
          className="rounded-full border border-outline-variant/30 px-4 py-2 text-sm font-medium text-med-green hover:bg-surface-container-high"
        >
          {t("viewSchedule")}
        </Link>
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
                  <StatusBadge status={appt.status} label={tStatus(appt.status)} variant="appointment" />
                </div>
                <p className="mt-1 text-sm text-on-surface-variant">
                  {fmtDate(appt.startAt)}
                  {" · "}
                  {appt.mode === "VIDEO" ? ts("video") : ts("inPerson")}
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
