import { setRequestLocale, getTranslations } from "next-intl/server";
import { Link } from "@/i18n/routing";
import { listPrescriptions } from "@/actions/doctor/prescriptions";
import { EmptyState, ErrorState, Pagination, StatusBadge } from "@/components/doctor/shared";

export default async function DoctorPrescriptionsPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ page?: string; status?: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const { page: pageRaw, status: statusRaw } = await searchParams;
  const page = Math.max(1, Number(pageRaw) || 1);
  const statusFilter =
    statusRaw === "DRAFT" || statusRaw === "ACTIVE" ? statusRaw : ("ALL" as const);
  const t = await getTranslations("doctor.rx");
  const ts = await getTranslations("doctor.status");

  const result = await listPrescriptions({ page, status: statusFilter });
  if (!result.ok) {
    return <ErrorState title={t("title")} message={t("loadError")} />;
  }

  const { items, total } = result.data;
  const fmtDate = (d: Date | null) =>
    d
      ? new Date(d).toLocaleDateString(locale === "ar" ? "ar-SA" : "en-US", { dateStyle: "medium" })
      : "—";

  const filterHref = (status?: string) =>
    status ? `/doctor/prescriptions?status=${status}` : "/doctor/prescriptions";

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-headline text-2xl text-primary md:text-3xl">{t("title")}</h1>
          <p className="mt-1 text-on-surface-variant">{t("subtitle")}</p>
        </div>
        <Link
          href="/doctor/prescriptions/new"
          className="rounded-full bg-primary px-5 py-2 text-sm font-medium text-on-primary hover:opacity-90"
        >
          {t("new")}
        </Link>
      </div>

      <div className="flex flex-wrap gap-2">
        {(
          [
            { key: "ALL", label: t("filterAll"), href: filterHref() },
            { key: "DRAFT", label: t("filterDraft"), href: filterHref("DRAFT") },
            { key: "ACTIVE", label: t("filterActive"), href: filterHref("ACTIVE") },
          ] as const
        ).map((f) => (
          <Link
            key={f.key}
            href={f.href}
            className={
              statusFilter === f.key
                ? "rounded-full bg-primary px-4 py-1.5 text-sm font-medium text-on-primary"
                : "rounded-full border border-outline-variant/30 px-4 py-1.5 text-sm font-medium text-on-surface-variant hover:bg-surface-container-high"
            }
          >
            {f.label}
          </Link>
        ))}
      </div>

      {items.length === 0 ? (
        <EmptyState title={t("emptyTitle")} description={t("emptyDescription")} />
      ) : (
        <>
          <ul className="space-y-3">
            {items.map((rx) => (
              <li
                key={rx.id}
                className="glass-card flex flex-col gap-3 rounded-2xl border border-outline-variant/20 bg-surface-container-low p-4 sm:flex-row sm:items-center sm:justify-between"
              >
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <Link
                      href={`/doctor/prescriptions/${rx.id}`}
                      className="font-medium text-primary hover:underline"
                    >
                      {rx.medicationName}
                    </Link>
                    <StatusBadge status={rx.status} label={ts(rx.status as never)} variant="prescription" />
                    {rx.aiAssisted ? (
                      <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs text-amber-900">
                        AI
                      </span>
                    ) : null}
                  </div>
                  <p className="mt-1 text-sm text-on-surface-variant">
                    {t("patient")}: {rx.patient.name ?? rx.patient.email}
                    {" · "}
                    {t("issuedAt")}: {fmtDate(rx.prescribedAt)}
                  </p>
                </div>
                <Link
                  href={`/doctor/prescriptions/${rx.id}`}
                  className="shrink-0 rounded-full border border-outline-variant/30 px-4 py-2 text-sm font-medium text-med-green hover:bg-surface-container-high"
                >
                  {rx.status === "DRAFT" ? t("continueReview") : t("viewTitle")}
                </Link>
              </li>
            ))}
          </ul>
          <Pagination page={page} pageSize={12} total={total} />
        </>
      )}
    </div>
  );
}
