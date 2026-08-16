import { setRequestLocale, getTranslations } from "next-intl/server";
import { Link } from "@/i18n/routing";
import { listPrescriptions } from "@/actions/doctor/prescriptions";
import { searchPatients } from "@/actions/doctor/patients";
import { EmptyState, ErrorState, Pagination } from "@/components/doctor/shared";
import { WriteForPatient } from "@/components/doctor/prescriptions/write-for-patient";
import { PersonAvatar } from "@/components/portal/person-avatar";
import { portalCardClass, segmentedOptionClass, segmentedTrackClass } from "@/components/portal/chrome";
import { cn } from "@/lib/utils";

function medicineLabel(rx: {
  medicationName: string;
  lines: Array<{ medicationName: string }>;
}) {
  const fromLines = rx.lines.map((line) => line.medicationName).filter(Boolean);
  return fromLines.length ? fromLines.join(", ") : rx.medicationName || "—";
}

export default async function DoctorPrescriptionsPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ page?: string; status?: string; q?: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const { page: pageRaw, status: statusRaw, q = "" } = await searchParams;
  const page = Math.max(1, Number(pageRaw) || 1);
  const statusFilter =
    statusRaw === "DRAFT" || statusRaw === "ACTIVE" ? statusRaw : ("ALL" as const);
  const t = await getTranslations("doctor.rx");

  const [result, panel] = await Promise.all([
    listPrescriptions({ page, status: statusFilter }),
    searchPatients({ query: q, page: 1 }),
  ]);
  if (!result.ok) {
    return <ErrorState title={t("title")} message={t("loadError")} />;
  }

  const { items, total, draftCount, activeCount } = result.data;
  const people = panel.ok ? (q ? panel.data.items : panel.data.items.slice(0, 6)) : [];
  const fmtDate = (d: Date | null) =>
    d
      ? new Date(d).toLocaleDateString(locale === "ar" ? "ar-SA" : "en-US", { dateStyle: "medium" })
      : "—";

  const filters = [
    { key: "ALL" as const, label: t("filterAll"), href: "/doctor/prescriptions", count: total },
    { key: "DRAFT" as const, label: t("filterDraft"), href: "/doctor/prescriptions?status=DRAFT", count: draftCount },
    { key: "ACTIVE" as const, label: t("filterActive"), href: "/doctor/prescriptions?status=ACTIVE", count: activeCount },
  ];

  return (
    <div className="space-y-6">
      <section className="welcome-banner space-y-5 p-5 sm:p-7">
        <div>
          <p className="text-sm font-medium text-white/80">{t("subtitle")}</p>
          <h1 className="font-headline mt-1 text-2xl text-white md:text-3xl">{t("title")}</h1>
        </div>
        <div className="grid gap-2 sm:grid-cols-3">
          <div className="rounded-2xl bg-white/12 px-4 py-3">
            <p className="text-2xl font-bold tabular-nums text-white">{draftCount}</p>
            <p className="text-xs font-medium text-white/80">{t("filterDraft")}</p>
          </div>
          <div className="rounded-2xl bg-white/12 px-4 py-3">
            <p className="text-2xl font-bold tabular-nums text-white">{activeCount}</p>
            <p className="text-xs font-medium text-white/80">{t("filterActive")}</p>
          </div>
          <div className="rounded-2xl bg-white/12 px-4 py-3">
            <p className="text-2xl font-bold tabular-nums text-white">{draftCount + activeCount}</p>
            <p className="text-xs font-medium text-white/80">{t("filterAll")}</p>
          </div>
        </div>
      </section>

      <WriteForPatient
        people={people}
        query={q}
        hiddenFields={statusFilter === "ALL" ? undefined : { status: statusFilter }}
        title={t("writeFor")}
        hint={t("writeForHint")}
        searchPlaceholder={t("searchPlaceholder")}
        searchLabel={t("searchPatients")}
        writeLabel={t("writeAction")}
        emptyTitle={t("noPanelTitle")}
        emptyHint={t("noPanelHint")}
        patientsHref="/doctor/patients"
        patientsLabel={t("seePatients")}
      />

      <nav className={segmentedTrackClass} aria-label={t("title")}>
        {filters.map((filter) => (
          <Link
            key={filter.key}
            href={filter.href}
            className={segmentedOptionClass(statusFilter === filter.key)}
            aria-current={statusFilter === filter.key ? "page" : undefined}
          >
            {filter.label}
            <span className="tabular-nums opacity-80">{filter.count}</span>
          </Link>
        ))}
      </nav>

      {items.length === 0 ? (
        <EmptyState title={t("emptyTitle")} description={t("emptyDescription")} />
      ) : (
        <>
          <ul className="space-y-3">
            {items.map((rx) => {
              const patientName = rx.patient.name ?? rx.patient.email;
              const statusLabel = rx.status === "DRAFT" ? t("filterDraft") : t("filterActive");
              return (
                <li key={rx.id} className={cn(portalCardClass, "p-4")}>
                  <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                    <div className="flex min-w-0 items-start gap-3">
                      <PersonAvatar name={patientName} photoUrl={rx.patient.image} />
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <Link
                            href={`/doctor/prescriptions/${rx.id}`}
                            className="truncate font-semibold text-primary hover:underline"
                          >
                            {medicineLabel(rx)}
                          </Link>
                          <span
                            className={cn(
                              "rounded-full px-2.5 py-0.5 text-xs font-semibold",
                              rx.status === "DRAFT"
                                ? "bg-primary/10 text-primary"
                                : "bg-med-green/15 text-med-green",
                            )}
                          >
                            {statusLabel}
                          </span>
                        </div>
                        <p className="mt-1 text-sm text-on-surface-variant">
                          {patientName}
                          {" · "}
                          {rx.status === "DRAFT" ? t("draftSaved") : t("issuedAt")} {fmtDate(rx.prescribedAt)}
                        </p>
                      </div>
                    </div>
                    <Link
                      href={`/doctor/prescriptions/${rx.id}`}
                      className="shrink-0 rounded-full bg-primary px-4 py-2 text-center text-sm font-semibold text-on-primary hover:opacity-90"
                    >
                      {rx.status === "DRAFT" ? t("continueReview") : t("open")}
                    </Link>
                  </div>
                </li>
              );
            })}
          </ul>
          <Pagination page={page} pageSize={12} total={total} />
        </>
      )}
    </div>
  );
}
