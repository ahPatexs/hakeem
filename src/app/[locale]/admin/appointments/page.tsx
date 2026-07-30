import { setRequestLocale, getTranslations } from "next-intl/server";
import { Link } from "@/i18n/routing";
import { listAppointments } from "@/actions/admin/appointments";
import { DataTable } from "@/components/admin/shared/data-table";
import { Pagination } from "@/components/admin/shared/pagination";
import { EmptyState } from "@/components/platform";
import { Input } from "@/components/ui/input";

const STATUSES = [
  "HELD",
  "CONFIRMED",
  "CHECKED_IN",
  "IN_PROGRESS",
  "COMPLETED",
  "CANCELLED",
  "NO_SHOW",
  "RESCHEDULED",
] as const;

export default async function AdminAppointmentsPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ page?: string; status?: string; from?: string; to?: string; doctorId?: string }>;
}) {
  const { locale } = await params;
  const sp = await searchParams;
  setRequestLocale(locale);
  const t = await getTranslations("admin.appointments");
  const page = Number(sp.page ?? 1);
  const result = await listAppointments({
    page,
    status: sp.status,
    from: sp.from,
    to: sp.to,
    doctorId: sp.doctorId,
  });
  if (!result.ok) return <p className="text-warm-coral">{result.code}</p>;
  const { items, total, pageSize } = result.data;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const filterParams = { status: sp.status, from: sp.from, to: sp.to, doctorId: sp.doctorId };

  return (
    <div className="space-y-6">
      <h1 className="font-headline text-3xl text-primary">{t("title")}</h1>
      <form method="get" className="flex flex-wrap items-end gap-2">
        <select
          name="status"
          defaultValue={sp.status ?? ""}
          className="h-10 rounded-lg border border-outline-variant/30 bg-surface-container-low px-3 text-sm"
          aria-label={t("statusFilter")}
        >
          <option value="">{t("allStatuses")}</option>
          {STATUSES.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
        <Input name="from" type="date" defaultValue={sp.from} aria-label={t("fromDate")} className="max-w-[10rem]" />
        <Input name="to" type="date" defaultValue={sp.to} aria-label={t("toDate")} className="max-w-[10rem]" />
        <Input
          name="doctorId"
          defaultValue={sp.doctorId}
          placeholder={t("doctorIdPlaceholder")}
          className="max-w-xs"
        />
        <button
          type="submit"
          className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-on-primary"
        >
          {t("applyFilters")}
        </button>
      </form>
      {items.length === 0 ? (
        <EmptyState title={t("empty")} />
      ) : (
        <>
          <DataTable
            columns={[t("patient"), t("doctor"), t("status"), t("start"), ""]}
            rows={items.map((a) => [
              a.patientEmail,
              a.doctorName,
              a.status,
              new Date(a.startAt).toLocaleString(),
              <Link key={a.id} href={`/admin/appointments/${a.id}`} className="text-med-green hover:underline">
                {t("view")}
              </Link>,
            ])}
          />
          <Pagination
            page={page}
            totalPages={totalPages}
            basePath="/admin/appointments"
            searchParams={filterParams}
          />
        </>
      )}
    </div>
  );
}
