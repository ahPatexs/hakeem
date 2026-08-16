import { getTranslations } from "next-intl/server";
import { listUpcoming } from "@/actions/patient/appointments";
import { AppointmentList } from "@/components/patient/appointments/appointment-list";
import { AppointmentPageHeader } from "@/components/patient/appointments/appointment-chrome";
import { ErrorState } from "@/components/patient/shared/error-state";

export async function UpcomingAppointmentsScreen({ page }: { page: number }) {
  const t = await getTranslations("patient.appointments");
  const result = await listUpcoming({ page });
  if (!result.ok) {
    return <ErrorState title={t("loadError")} />;
  }

  return (
    <div className="space-y-6">
      <AppointmentPageHeader title={t("upcomingTitle")} subtitle={t("upcomingSubtitle")} />
      <AppointmentList
        items={result.data.items}
        total={result.data.total}
        page={result.data.page}
        pageSize={result.data.pageSize}
        emptyTitle={t("upcomingEmpty")}
        emptyDescription={t("upcomingEmptyHint")}
        emptyAction={{ label: t("book"), href: "/patient/appointments/book" }}
      />
    </div>
  );
}
