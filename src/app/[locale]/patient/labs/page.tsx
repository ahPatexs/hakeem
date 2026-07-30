import { setRequestLocale, getTranslations } from "next-intl/server";
import { listLabs } from "@/actions/patient/labs";
import { LabsList } from "@/components/patient/labs/labs-list";
import { ErrorState } from "@/components/patient/shared/error-state";

export default async function LabsPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ page?: string }>;
}) {
  const { locale } = await params;
  const sp = await searchParams;
  setRequestLocale(locale);
  const t = await getTranslations("patient.labs");

  const page = Number(sp.page ?? "1") || 1;
  const result = await listLabs({ page });
  if (!result.ok) {
    return <ErrorState title={t("loadError")} />;
  }

  return (
    <div className="space-y-6">
      <h1 className="font-headline text-2xl text-primary">{t("title")}</h1>
      <LabsList
        items={result.data.items}
        total={result.data.total}
        page={result.data.page}
        pageSize={result.data.pageSize}
      />
    </div>
  );
}
