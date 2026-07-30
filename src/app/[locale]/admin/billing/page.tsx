import { setRequestLocale, getTranslations } from "next-intl/server";
import { Link } from "@/i18n/routing";
import { listPayments } from "@/actions/admin/billing";
import { DataTable } from "@/components/admin/shared/data-table";
import { Pagination } from "@/components/admin/shared/pagination";
import { StatusBadge } from "@/components/admin/shared/status-badge";

export default async function AdminBillingPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ page?: string }>;
}) {
  const { locale } = await params;
  const sp = await searchParams;
  setRequestLocale(locale);
  const t = await getTranslations("admin.billing");
  const page = Number(sp.page ?? 1);
  const result = await listPayments({ page });
  if (!result.ok) return <p className="text-warm-coral">{result.code}</p>;
  const { items, total, pageSize } = result.data;

  return (
    <div className="space-y-6">
      <h1 className="font-headline text-3xl text-primary">{t("title")}</h1>
      <DataTable
        columns={[t("description"), t("amount"), t("status"), t("patient"), ""]}
        rows={items.map((p) => [
          p.description,
          `${(p.amountCents / 100).toFixed(2)} SAR`,
          <StatusBadge key={p.id} label={p.status} />,
          p.patientEmail,
          <Link key={`l-${p.id}`} href={`/admin/billing/${p.id}`} className="text-med-green hover:underline">
            {t("view")}
          </Link>,
        ])}
      />
      <Pagination page={page} totalPages={Math.max(1, Math.ceil(total / pageSize))} basePath="/admin/billing" />
    </div>
  );
}
