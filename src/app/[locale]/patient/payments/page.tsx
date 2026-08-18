import { setRequestLocale, getTranslations } from "next-intl/server";
import { Link } from "@/i18n/routing";
import { listPayments } from "@/actions/patient/payments";
import { PaymentsList } from "@/components/patient/payments/payments-list";
import { ErrorState } from "@/components/patient/shared/error-state";
import { Input } from "@/components/ui/input";

const FILTERS = [
  { key: "all", status: undefined },
  { key: "pending", status: "PENDING" },
  { key: "paid", status: "PAID" },
  { key: "failed", status: "FAILED" },
  { key: "refunded", status: "REFUNDED" },
] as const;

function paymentsHref(opts: { status?: string; from?: string; to?: string }) {
  const params = new URLSearchParams();
  if (opts.status) params.set("status", opts.status);
  if (opts.from) params.set("from", opts.from);
  if (opts.to) params.set("to", opts.to);
  const qs = params.toString();
  return qs ? `/patient/payments?${qs}` : "/patient/payments";
}

export default async function PaymentsPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ page?: string; status?: string; from?: string; to?: string }>;
}) {
  const { locale } = await params;
  const sp = await searchParams;
  setRequestLocale(locale);
  const t = await getTranslations("patient.payments");

  const page = Number(sp.page ?? "1") || 1;
  const status = FILTERS.find((f) => f.status === sp.status)?.status;
  const from = sp.from || undefined;
  const to = sp.to || undefined;
  const result = await listPayments({ page, status, from, to });
  if (!result.ok) {
    return <ErrorState title={t("loadError")} />;
  }

  return (
    <div className="space-y-6">
      <h1 className="font-headline text-2xl text-primary">{t("title")}</h1>
      <p className="text-sm text-on-surface-variant">{t("stubPayNote")}</p>
      <div className="flex flex-wrap gap-3 text-sm">
        {FILTERS.map((f) => (
          <Link
            key={f.key}
            href={paymentsHref({ status: f.status, from, to })}
            className={
              (status ?? undefined) === f.status ? "font-semibold text-primary" : "text-med-green hover:underline"
            }
          >
            {t(
              f.key === "all"
                ? "filterAll"
                : f.key === "pending"
                  ? "filterPending"
                  : f.key === "paid"
                    ? "filterPaid"
                    : f.key === "failed"
                      ? "filterFailed"
                      : "filterRefunded",
            )}
          </Link>
        ))}
      </div>
      <form method="get" className="flex flex-wrap items-end gap-2">
        {status ? <input type="hidden" name="status" value={status} /> : null}
        <Input name="from" type="date" defaultValue={from} aria-label={t("fromDate")} className="max-w-[10rem]" />
        <Input name="to" type="date" defaultValue={to} aria-label={t("toDate")} className="max-w-[10rem]" />
        <button type="submit" className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-on-primary">
          {t("applyFilters")}
        </button>
      </form>
      <PaymentsList
        items={result.data.items}
        total={result.data.total}
        page={result.data.page}
        pageSize={result.data.pageSize}
      />
    </div>
  );
}
