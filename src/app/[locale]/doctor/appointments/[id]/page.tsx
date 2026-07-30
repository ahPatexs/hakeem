import { setRequestLocale, getTranslations } from "next-intl/server";
import { Link } from "@/i18n/routing";
import { getAppointmentDetail } from "@/actions/doctor/schedule";
import { AppointmentActions } from "@/components/doctor/schedule/appointment-actions";
import { ErrorState, StatusBadge } from "@/components/doctor/shared";

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
  const fmt = (d: Date | string) =>
    new Date(d).toLocaleString(locale === "ar" ? "ar-SA" : "en-US", {
      dateStyle: "full",
      timeStyle: "short",
    });

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="font-headline text-2xl text-primary">{tw("visit")}</h1>
        <StatusBadge status={appt.status} label={ts(appt.status)} variant="appointment" />
      </div>

      <div className="glass-card space-y-4 rounded-2xl border border-outline-variant/20 bg-surface-container-low p-6">
        <div>
          <p className="text-xs font-medium uppercase text-on-surface-variant">{tc("patient")}</p>
          <Link
            href={`/doctor/patients/${appt.patient.id}`}
            className="mt-1 block text-lg font-medium text-primary hover:underline"
          >
            {appt.patient.name ?? appt.patient.email}
          </Link>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <p className="text-xs font-medium uppercase text-on-surface-variant">{t("title")}</p>
            <p className="mt-1 text-primary">{fmt(appt.startAt)}</p>
          </div>
          <div>
            <p className="text-xs font-medium uppercase text-on-surface-variant">
              {appt.mode === "VIDEO" ? t("video") : t("inPerson")}
            </p>
            {appt.locationText ? <p className="mt-1 text-primary">{appt.locationText}</p> : null}
          </div>
        </div>
        {appt.reason ? <p className="text-sm text-on-surface-variant">{appt.reason}</p> : null}
        <AppointmentActions appointmentId={appt.id} status={appt.status} size="default" />
      </div>
    </div>
  );
}
