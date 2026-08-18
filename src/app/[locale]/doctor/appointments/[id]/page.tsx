import { setRequestLocale, getTranslations } from "next-intl/server";
import { Link } from "@/i18n/routing";
import { MapPin, Video } from "lucide-react";
import { getAppointmentDetail } from "@/actions/doctor/schedule";
import { AppointmentActions } from "@/components/doctor/schedule/appointment-actions";
import { ErrorState, StatusBadge } from "@/components/doctor/shared";
import { PersonAvatar } from "@/components/portal/person-avatar";
import { formatApptDay, formatApptTime } from "@/lib/datetime";

export default async function DoctorAppointmentDetailPage({
  params,
}: {
  params: Promise<{ locale: string; id: string }>;
}) {
  const { locale, id } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("doctor.schedule");
  const tw = await getTranslations("doctor.workspace");
  const tc = await getTranslations("doctor.common");
  const ts = await getTranslations("doctor.status");

  const result = await getAppointmentDetail(id);
  if (!result.ok) {
    return <ErrorState title={t("title")} message={tc("notFound")} />;
  }

  const appt = result.data;
  const patientName = appt.patient.name ?? appt.patient.email;

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <header className="glass-card rounded-3xl border border-outline-variant/20 p-6 shadow-sm md:p-8">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="flex items-start gap-4">
            <PersonAvatar name={patientName} photoUrl={appt.patient.image} size="lg" />
            <div>
              <p className="text-sm font-medium text-on-surface-variant">{tw("visit")}</p>
              <Link
                href={`/doctor/patients/${appt.patient.id}`}
                className="font-headline text-2xl text-primary hover:underline"
              >
                {patientName}
              </Link>
              <p className="mt-2 flex items-center gap-2 text-sm text-on-surface-variant">
                {appt.mode === "VIDEO" ? (
                  <Video className="h-4 w-4 text-med-green" aria-hidden />
                ) : (
                  <MapPin className="h-4 w-4 text-med-green" aria-hidden />
                )}
                {appt.mode === "VIDEO" ? t("video") : t("inPerson")}
              </p>
            </div>
          </div>
          <StatusBadge status={appt.status} label={ts(appt.status)} variant="appointment" />
        </div>
        {appt.paymentObligations[0] ? (
          <p className="mt-3 text-sm text-on-surface-variant">
            {t("paymentStatus")}: {(appt.paymentObligations[0].amountCents / 100).toFixed(2)}{" "}
            {appt.paymentObligations[0].currency} · {appt.paymentObligations[0].status.replaceAll("_", " ")}
          </p>
        ) : null}
        <div className="mt-6 grid gap-4 sm:grid-cols-2">
          <div className="rounded-2xl bg-primary/5 px-4 py-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-on-surface-variant">{t("title")}</p>
            <p className="mt-1 font-headline text-lg text-primary">{formatApptDay(appt.startAt, locale)}</p>
            <p className="text-sm font-medium text-on-surface-variant">{formatApptTime(appt.startAt, locale)}</p>
          </div>
          {appt.reason ? (
            <div className="rounded-2xl bg-surface-container-low px-4 py-3">
              <p className="mt-0 text-sm text-primary">{appt.reason}</p>
            </div>
          ) : appt.locationText ? (
            <div className="rounded-2xl bg-surface-container-low px-4 py-3">
              <p className="text-xs font-semibold uppercase tracking-wide text-on-surface-variant">{t("inPerson")}</p>
              <p className="mt-1 text-sm text-primary">{appt.locationText}</p>
            </div>
          ) : null}
        </div>
      </header>
      <AppointmentActions appointmentId={appt.id} status={appt.status} size="default" />
    </div>
  );
}
