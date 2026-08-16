import { setRequestLocale, getTranslations } from "next-intl/server";
import { listHistory } from "@/actions/patient/appointments";
import { AppointmentList } from "@/components/patient/appointments/appointment-list";
import { AppointmentPageHeader } from "@/components/patient/appointments/appointment-chrome";
import { ErrorState } from "@/components/patient/shared/error-state";

export default async function HistoryAppointmentsPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ page?: string }>;
}) {
  const { locale } = await params;
  const sp = await searchParams;
  setRequestLocale(locale);
  const t = await getTranslations("patient.appointments");

  const page = Number(sp.page ?? "1") || 1;
  const result = await listHistory({ page });
  if (!result.ok) {
    return <ErrorState title={t("loadError")} />;
  }

  return (
    <div className="space-y-6">
      <AppointmentPageHeader title={t("historyTitle")} subtitle={t("historySubtitle")} />
      <AppointmentList
        items={result.data.items}
        total={result.data.total}
        page={result.data.page}
        pageSize={result.data.pageSize}
        emptyTitle={t("historyEmpty")}
        emptyDescription={t("historyEmptyHint")}
      />
    </div>
  );
}
