import { setRequestLocale, getTranslations } from "next-intl/server";
import { auth } from "@/auth";
import { emrListPrescriptions } from "@/actions/emr/prescriptions";
import { EMR_SEARCH_PAGE_SIZE } from "@/lib/emr/search";
import { PrescriptionList } from "@/components/emr/prescriptions/prescription-list";
import { Pagination } from "@/components/patient/shared/pagination";
import { ErrorState } from "@/components/patient/shared/error-state";

export default async function PrescriptionsPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ page?: string }>;
}) {
  const { locale } = await params;
  const sp = await searchParams;
  setRequestLocale(locale);
  const t = await getTranslations("patient.prescriptions");

  const session = await auth();
  const patientUserId = session?.user?.id;
  if (!patientUserId) {
    return <ErrorState title={t("loadError")} />;
  }

  const page = Number(sp.page ?? "1") || 1;
  const result = await emrListPrescriptions({ patientUserId, bucket: "all", page });
  if (!result.ok) {
    return <ErrorState title={t("loadError")} />;
  }

  // Draft prescriptions are doctor-only until signed (Module 4 / FR-016).
  const items = result.data.items.filter((rx) => rx.status !== "DRAFT");

  return (
    <div className="space-y-6">
      <h1 className="font-headline text-2xl text-primary">{t("title")}</h1>
      <PrescriptionList
        items={items.map((rx) => ({
          id: rx.id,
          medicationName: rx.medicationName,
          instructions: rx.instructions,
          status: rx.status,
          prescribedAt: rx.prescribedAt,
        }))}
        title={t("title")}
        emptyLabel={t("emptyTitle")}
        locale={locale}
      />
      <Pagination page={result.data.page} pageSize={EMR_SEARCH_PAGE_SIZE} total={result.data.total} />
    </div>
  );
}
