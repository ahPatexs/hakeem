import { setRequestLocale, getTranslations } from "next-intl/server";
import { notFound } from "next/navigation";
import { Link } from "@/i18n/routing";
import { getAppointment } from "@/actions/admin/appointments";
import { AppointmentOpsActions } from "@/components/admin/appointments/appointment-ops-actions";

export default async function AdminAppointmentDetailPage({
  params,
}: {
  params: Promise<{ locale: string; id: string }>;
}) {
  const { locale, id } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("admin.appointments");
  const result = await getAppointment(id);
  if (!result.ok || !result.data) notFound();
  const appt = result.data;

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <h1 className="font-headline text-2xl text-primary">{t("detailTitle")}</h1>
      <dl className="grid gap-2 text-sm">
        <div className="flex justify-between">
          <dt>{t("patient")}</dt>
          <dd>{appt.patientEmail}</dd>
        </div>
        <div className="flex justify-between">
          <dt>{t("doctor")}</dt>
          <dd>{appt.doctorName}</dd>
        </div>
        <div className="flex justify-between">
          <dt>{t("status")}</dt>
          <dd>{appt.status}</dd>
        </div>
        <div className="flex justify-between">
          <dt>{t("mode")}</dt>
          <dd>{appt.mode}</dd>
        </div>
        <div className="flex justify-between">
          <dt>{t("start")}</dt>
          <dd>{new Date(appt.startAt).toLocaleString()}</dd>
        </div>
        {appt.reason ? (
          <div>
            <dt className="text-on-surface-variant">{t("reason")}</dt>
            <dd>{appt.reason}</dd>
          </div>
        ) : null}
      </dl>
      <AppointmentOpsActions appointmentId={appt.id} status={appt.status} />
      {appt.mode === "VIDEO" ? (
        <Link href={`/admin/video/${appt.id}`} className="text-sm font-semibold text-med-green hover:underline">
          {t("openVideoLog")}
        </Link>
      ) : null}
    </div>
  );
}
