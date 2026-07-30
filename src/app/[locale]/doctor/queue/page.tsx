import { setRequestLocale, getTranslations } from "next-intl/server";
import { Link } from "@/i18n/routing";
import { getPatientQueue } from "@/actions/doctor/schedule";
import { AppointmentActions } from "@/components/doctor/schedule/appointment-actions";
import { EmptyState, ErrorState, StatusBadge } from "@/components/doctor/shared";
import type { ScheduleAppointment } from "@/lib/doctor/schedule";

function QueueSection({
  title,
  items,
  locale,
  arrivedLabel,
  statusLabel,
}: {
  title: string;
  items: ScheduleAppointment[];
  locale: string;
  arrivedLabel: (time: string) => string;
  statusLabel: (status: string) => string;
}) {
  if (items.length === 0) return null;
  return (
    <section className="space-y-3">
      <h2 className="font-headline text-lg text-primary">{title}</h2>
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
                <StatusBadge status={appt.status} label={statusLabel(appt.status)} variant="appointment" />
              </div>
              <p className="mt-1 text-sm text-on-surface-variant">
                {appt.checkedInAt
                  ? arrivedLabel(
                      new Date(appt.checkedInAt).toLocaleTimeString(locale === "ar" ? "ar-SA" : "en-US", {
                        hour: "2-digit",
                        minute: "2-digit",
                      }),
                    )
                  : null}
              </p>
            </div>
            <AppointmentActions appointmentId={appt.id} status={appt.status} />
          </li>
        ))}
      </ul>
    </section>
  );
}

export default async function DoctorQueuePage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("doctor.queue");
  const ts = await getTranslations("doctor.status");

  const result = await getPatientQueue();
  if (!result.ok) {
    return <ErrorState title={t("title")} message={t("loadError")} />;
  }

  const { checkedIn, inProgress } = result.data;
  const empty = checkedIn.length === 0 && inProgress.length === 0;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-headline text-2xl text-primary md:text-3xl">{t("title")}</h1>
        <p className="mt-1 text-on-surface-variant">{t("subtitle")}</p>
      </div>

      {empty ? (
        <EmptyState title={t("emptyTitle")} description={t("emptyDescription")} />
      ) : (
        <>
          <QueueSection
            title={t("inProgress")}
            items={inProgress}
            locale={locale}
            arrivedLabel={(time) => t("arrivedAt", { time })}
            statusLabel={(s) => ts(s)}
          />
          <QueueSection
            title={t("waiting")}
            items={checkedIn}
            locale={locale}
            arrivedLabel={(time) => t("arrivedAt", { time })}
            statusLabel={(s) => ts(s)}
          />
        </>
      )}
    </div>
  );
}
