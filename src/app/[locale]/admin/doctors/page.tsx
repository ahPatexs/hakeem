import { setRequestLocale, getTranslations } from "next-intl/server";
import { Link } from "@/i18n/routing";
import { listDoctors } from "@/actions/admin/doctors";
import { DataTable } from "@/components/admin/shared/data-table";
import { Pagination } from "@/components/admin/shared/pagination";
import { StatusBadge } from "@/components/admin/shared/status-badge";
import { EmptyState } from "@/components/platform";
import { DoctorQueueActions } from "@/components/admin/doctors/doctor-queue-actions";

export default async function AdminDoctorsPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ pending?: string; page?: string }>;
}) {
  const { locale } = await params;
  const sp = await searchParams;
  setRequestLocale(locale);
  const t = await getTranslations("admin.doctors");
  const page = Number(sp.page ?? 1);
  const pendingOnly = sp.pending === "1";
  const result = await listDoctors({ pendingOnly, page });
  if (!result.ok) return <p className="text-warm-coral">{result.code}</p>;
  const { items, total, pageSize } = result.data;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-headline text-3xl text-primary">{t("title")}</h1>
          <p className="text-on-surface-variant">{t("subtitle")}</p>
        </div>
        <div className="flex gap-2 text-sm">
          <Link href="/admin/doctors" className={!pendingOnly ? "font-bold text-primary" : "text-med-green"}>
            {t("all")}
          </Link>
          <Link href="/admin/doctors?pending=1" className={pendingOnly ? "font-bold text-primary" : "text-med-green"}>
            {t("pending")}
          </Link>
        </div>
      </div>
      {items.length === 0 ? (
        <EmptyState title={t("empty")} />
      ) : (
        <>
          <DataTable
            columns={[t("email"), t("name"), t("approval"), t("status"), t("actionsCol")]}
            rows={items.map((d) => [
              d.email,
              d.name ?? "—",
              <StatusBadge
                key={`a-${d.id}`}
                label={d.doctorApproval ?? "—"}
                variant={d.doctorApproval === "APPROVED" ? "success" : d.doctorApproval === "PENDING_APPROVAL" ? "warning" : "danger"}
              />,
              d.status,
              <DoctorQueueActions key={`act-${d.id}`} userId={d.id} approval={d.doctorApproval} locale={locale} />,
            ])}
          />
          <Pagination
            page={page}
            totalPages={totalPages}
            basePath="/admin/doctors"
            searchParams={pendingOnly ? { pending: "1" } : undefined}
          />
        </>
      )}
    </div>
  );
}
