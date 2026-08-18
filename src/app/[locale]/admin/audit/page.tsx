import { setRequestLocale, getTranslations } from "next-intl/server";
import { Link } from "@/i18n/routing";
import { listAuditEvents } from "@/actions/admin/audit";
import { DataTable } from "@/components/admin/shared/data-table";
import { Pagination } from "@/components/admin/shared/pagination";
import { Input } from "@/components/ui/input";

const OUTCOMES = ["SUCCESS", "FAILURE", "DENIED"] as const;

function exportHref(filters: { type?: string; outcome?: string; from?: string; to?: string }) {
  const params = new URLSearchParams();
  if (filters.type) params.set("type", filters.type);
  if (filters.outcome) params.set("outcome", filters.outcome);
  if (filters.from) params.set("from", filters.from);
  if (filters.to) params.set("to", filters.to);
  const q = params.toString();
  return q ? `/api/admin/exports/audit?${q}` : "/api/admin/exports/audit";
}

export default async function AdminAuditPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ page?: string; type?: string; outcome?: string; from?: string; to?: string }>;
}) {
  const { locale } = await params;
  const sp = await searchParams;
  setRequestLocale(locale);
  const t = await getTranslations("admin.audit");
  const page = Number(sp.page ?? 1);
  const result = await listAuditEvents({
    page,
    type: sp.type,
    outcome: sp.outcome,
    from: sp.from,
    to: sp.to,
  });
  if (!result.ok) return <p className="text-warm-coral">{result.code}</p>;
  const { items, total, pageSize } = result.data;
  const filterParams = { type: sp.type, outcome: sp.outcome, from: sp.from, to: sp.to };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-headline text-3xl text-primary">{t("title")}</h1>
          <p className="text-on-surface-variant">{t("subtitle")}</p>
        </div>
        <a href={exportHref(filterParams)} className="text-sm font-medium text-med-green hover:underline">
          {t("exportCsv")}
        </a>
        <Link href="/admin/audit?type=billing." className="text-sm font-medium text-med-green hover:underline">
          {t("billingEvents")}
        </Link>
      </div>
      <form method="get" className="flex flex-wrap items-end gap-2">
        <Input
          name="type"
          defaultValue={sp.type}
          placeholder={t("typeFilter")}
          className="max-w-xs"
        />
        <select
          name="outcome"
          defaultValue={sp.outcome ?? ""}
          className="h-10 rounded-lg border border-outline-variant/30 bg-surface-container-low px-3 text-sm"
          aria-label={t("outcomeFilter")}
        >
          <option value="">{t("allOutcomes")}</option>
          {OUTCOMES.map((o) => (
            <option key={o} value={o}>
              {o}
            </option>
          ))}
        </select>
        <Input name="from" type="date" defaultValue={sp.from} aria-label={t("fromDate")} className="max-w-[10rem]" />
        <Input name="to" type="date" defaultValue={sp.to} aria-label={t("toDate")} className="max-w-[10rem]" />
        <button
          type="submit"
          className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-on-primary"
        >
          {t("applyFilters")}
        </button>
      </form>
      <DataTable
        columns={[t("type"), t("outcome"), t("actor"), t("target"), t("when")]}
        rows={items.map((e) => [
          e.type,
          e.outcome,
          e.actorEmail ?? "—",
          e.targetEmail ?? "—",
          new Date(e.createdAt).toLocaleString(),
        ])}
      />
      <Pagination
        page={page}
        totalPages={Math.max(1, Math.ceil(total / pageSize))}
        basePath="/admin/audit"
        searchParams={filterParams}
      />
    </div>
  );
}
