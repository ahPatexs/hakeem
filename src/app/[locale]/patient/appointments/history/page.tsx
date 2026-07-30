import { setRequestLocale, getTranslations } from "next-intl/server";
import { listHistory } from "@/actions/patient/appointments";
import { AppointmentList } from "@/components/patient/appointments/appointment-list";
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
      <h1 className="font-headline text-2xl text-primary">{t("historyTitle")}</h1>
      <AppointmentList
        items={result.data.items}
        total={result.data.total}
        page={result.data.page}
        pageSize={result.data.pageSize}
        emptyTitle={t("historyEmpty")}
      />
    </div>
  );
}
