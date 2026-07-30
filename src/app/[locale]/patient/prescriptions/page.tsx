import { setRequestLocale, getTranslations } from "next-intl/server";
import { listPrescriptions } from "@/actions/patient/prescriptions";
import { PrescriptionsList } from "@/components/patient/prescriptions/prescriptions-list";
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

  const page = Number(sp.page ?? "1") || 1;
  const result = await listPrescriptions({ page });
  if (!result.ok) {
    return <ErrorState title={t("loadError")} />;
  }

  return (
    <div className="space-y-6">
      <h1 className="font-headline text-2xl text-primary">{t("title")}</h1>
      <PrescriptionsList
        items={result.data.items}
        total={result.data.total}
        page={result.data.page}
        pageSize={result.data.pageSize}
      />
    </div>
  );
}
