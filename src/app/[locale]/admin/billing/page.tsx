import { setRequestLocale, getTranslations } from "next-intl/server";
import { Link } from "@/i18n/routing";
import { listPayments, listRefundRequests } from "@/actions/admin/billing";
import { DataTable } from "@/components/admin/shared/data-table";
import { Pagination } from "@/components/admin/shared/pagination";
import { StatusBadge } from "@/components/admin/shared/status-badge";
import { Input } from "@/components/ui/input";

export default async function AdminBillingPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ page?: string; status?: string; stuck?: string; from?: string; to?: string }>;
}) {
  const { locale } = await params;
  const sp = await searchParams;
  setRequestLocale(locale);
  const t = await getTranslations("admin.billing");
  const page = Number(sp.page ?? 1);
  const result = await listPayments({
    page,
    status: sp.status,
    stuck: sp.stuck === "1",
    from: sp.from,
    to: sp.to,
  });
  const requests = await listRefundRequests();
  if (!result.ok) return <p className="text-warm-coral">{result.code}</p>;
  const { items, total, pageSize } = result.data;
  const exportParams = new URLSearchParams();
  if (sp.status) exportParams.set("status", sp.status);
  if (sp.from) exportParams.set("from", sp.from);
  if (sp.to) exportParams.set("to", sp.to);
  if (sp.stuck === "1") exportParams.set("stuck", "1");
  const exportHref = `/api/admin/exports/billing${exportParams.toString() ? `?${exportParams}` : ""}`;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-headline text-3xl text-primary">{t("title")}</h1>
          <p className="text-sm text-on-surface-variant">{t("subtitle")}</p>
        </div>
        <a href={exportHref} className="text-sm font-medium text-med-green hover:underline">
          {t("exportCsv")}
        </a>
      </div>
      <div className="flex flex-wrap gap-2 text-sm">
        <Link href="/admin/billing" className="text-med-green hover:underline">
          {t("filterAll")}
        </Link>
        <Link href="/admin/billing?status=FAILED" className="text-med-green hover:underline">
          {t("filterFailed")}
        </Link>
        <Link href="/admin/billing?stuck=1" className="text-med-green hover:underline">
          {t("filterStuck")}
        </Link>
        <Link href="/admin/billing?status=REFUNDED" className="text-med-green hover:underline">
          {t("filterRefunded")}
        </Link>
      </div>
      <form method="get" className="flex flex-wrap items-end gap-2">
        {sp.status ? <input type="hidden" name="status" value={sp.status} /> : null}
        {sp.stuck ? <input type="hidden" name="stuck" value={sp.stuck} /> : null}
        <Input name="from" type="date" defaultValue={sp.from} aria-label={t("fromDate")} className="max-w-[10rem]" />
        <Input name="to" type="date" defaultValue={sp.to} aria-label={t("toDate")} className="max-w-[10rem]" />
        <button type="submit" className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-on-primary">
          {t("applyFilters")}
        </button>
      </form>
      {requests.ok && requests.data.items.length > 0 ? (
        <section className="rounded-2xl border border-outline-variant/20 p-4">
          <h2 className="font-headline text-lg text-primary">{t("refundQueue")}</h2>
          <ul className="mt-2 space-y-1 text-sm">
            {requests.data.items.map((r) => (
              <li key={r.id}>
                <Link href={`/admin/billing/${r.obligationId}`} className="text-med-green hover:underline">
                  {r.patientEmail} — {(r.requestedAmountCents / 100).toFixed(2)} SAR
                </Link>
              </li>
            ))}
          </ul>
        </section>
      ) : null}
      <DataTable
        columns={[t("invoice"), t("description"), t("amount"), t("status"), t("patient"), ""]}
        rows={items.map((p) => [
          p.invoiceNumber ?? "—",
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
