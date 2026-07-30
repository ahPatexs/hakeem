import { setRequestLocale, getTranslations } from "next-intl/server";
import { listRecords } from "@/actions/patient/records";
import { RecordsList } from "@/components/patient/records/records-list";
import { ErrorState } from "@/components/patient/shared/error-state";

export default async function RecordsPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ page?: string }>;
}) {
  const { locale } = await params;
  const sp = await searchParams;
  setRequestLocale(locale);
  const t = await getTranslations("patient.records");

  const page = Number(sp.page ?? "1") || 1;
  const result = await listRecords({ page });
  if (!result.ok) {
    return <ErrorState title={t("loadError")} />;
  }

  return (
    <div className="space-y-6">
      <h1 className="font-headline text-2xl text-primary">{t("title")}</h1>
      <RecordsList
        items={result.data.items}
        total={result.data.total}
        page={result.data.page}
        pageSize={result.data.pageSize}
      />
    </div>
  );
}
