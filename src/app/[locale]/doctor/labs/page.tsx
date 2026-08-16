import { setRequestLocale, getTranslations } from "next-intl/server";
import { Link } from "@/i18n/routing";
import { getLabInbox } from "@/actions/doctor/records";
import { searchPatients } from "@/actions/doctor/patients";
import { LabReviewButton } from "@/components/doctor/labs/lab-review-button";
import { WriteForPatient } from "@/components/doctor/prescriptions/write-for-patient";
import { EmptyState, ErrorState } from "@/components/doctor/shared";
import { PersonAvatar } from "@/components/portal/person-avatar";
import { portalCardClass, segmentedOptionClass, segmentedTrackClass } from "@/components/portal/chrome";
import { cn } from "@/lib/utils";

type LabInboxItem = {
  id: string;
  title: string;
  criticalFlag: boolean;
  releaseStatus: string;
  resultedAt: Date;
  patient: { id: string; name: string | null; email?: string | null; image?: string | null };
};

export default async function DoctorLabsPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ q?: string; status?: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const { q = "", status: statusRaw } = await searchParams;
  const statusFilter =
    statusRaw === "pending" || statusRaw === "reviewed" || statusRaw === "urgent"
      ? statusRaw
      : ("all" as const);
  const t = await getTranslations("doctor.labs");

  const [result, panel] = await Promise.all([
    getLabInbox(),
    searchPatients({ query: q, page: 1 }),
  ]);
  if (!result.ok) {
    return <ErrorState title={t("title")} message={t("loadError")} />;
  }

  const pending = result.data.pending as LabInboxItem[];
  const reviewed = result.data.reviewed as LabInboxItem[];
  const urgentCount = [...pending, ...reviewed].filter((lab) => lab.criticalFlag).length;
  const people = panel.ok ? (q ? panel.data.items : panel.data.items.slice(0, 6)) : [];

  const items =
    statusFilter === "pending"
      ? pending
      : statusFilter === "reviewed"
        ? reviewed
        : statusFilter === "urgent"
          ? [...pending, ...reviewed].filter((lab) => lab.criticalFlag)
          : [...pending, ...reviewed];

  const fmtDate = (d: Date | string) =>
    new Date(d).toLocaleString(locale === "ar" ? "ar-SA" : "en-US", {
      dateStyle: "medium",
      timeStyle: "short",
    });

  const filters = [
    { key: "all" as const, label: t("filterAll"), href: "/doctor/labs", count: pending.length + reviewed.length },
    { key: "pending" as const, label: t("pending"), href: "/doctor/labs?status=pending", count: pending.length },
    { key: "reviewed" as const, label: t("reviewed"), href: "/doctor/labs?status=reviewed", count: reviewed.length },
    { key: "urgent" as const, label: t("filterUrgent"), href: "/doctor/labs?status=urgent", count: urgentCount },
  ];

  return (
    <div className="space-y-6">
      <section className="welcome-banner space-y-5 p-5 sm:p-7">
        <div>
          <p className="text-sm font-medium text-white/80">{t("subtitle")}</p>
          <h1 className="font-headline mt-1 text-2xl text-white md:text-3xl">{t("title")}</h1>
          <p className="mt-2 text-sm text-white/85">{t("releaseNote")}</p>
        </div>
        <div className="grid gap-2 sm:grid-cols-3">
          <div className="rounded-2xl bg-white/12 px-4 py-3">
            <p className="text-2xl font-bold tabular-nums text-white">{pending.length}</p>
            <p className="text-xs font-medium text-white/80">{t("pending")}</p>
          </div>
          <div className="rounded-2xl bg-white/12 px-4 py-3">
            <p className="text-2xl font-bold tabular-nums text-white">{urgentCount}</p>
            <p className="text-xs font-medium text-white/80">{t("filterUrgent")}</p>
          </div>
          <div className="rounded-2xl bg-white/12 px-4 py-3">
            <p className="text-2xl font-bold tabular-nums text-white">{reviewed.length}</p>
            <p className="text-xs font-medium text-white/80">{t("reviewed")}</p>
          </div>
        </div>
      </section>

      <WriteForPatient
        people={people}
        query={q}
        hiddenFields={statusFilter === "all" ? undefined : { status: statusFilter }}
        title={t("openFor")}
        hint={t("openForHint")}
        searchPlaceholder={t("searchPlaceholder")}
        searchLabel={t("searchPatients")}
        writeLabel={t("openAction")}
        emptyTitle={t("noPanelTitle")}
        emptyHint={t("noPanelHint")}
        patientsHref="/doctor/patients"
        patientsLabel={t("seePatients")}
        hrefFor={(id) => `/doctor/patients/${id}/labs`}
      />

      <nav className={cn(segmentedTrackClass, "flex-wrap")} aria-label={t("title")}>
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
        <ul className="space-y-3">
          {items.map((lab) => {
            const patientName = lab.patient.name ?? lab.patient.email ?? "—";
            const waiting = lab.releaseStatus === "PENDING_REVIEW";
            return (
              <li key={lab.id} className={cn(portalCardClass, "p-4")}>
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex min-w-0 items-start gap-3">
                    <PersonAvatar name={patientName} photoUrl={lab.patient.image} />
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <Link
                          href={`/doctor/patients/${lab.patient.id}/labs`}
                          className="truncate font-semibold text-primary hover:underline"
                        >
                          {lab.title}
                        </Link>
                        {lab.criticalFlag ? (
                          <span className="rounded-full bg-red-100 px-2.5 py-0.5 text-xs font-semibold text-red-800">
                            {t("critical")}
                          </span>
                        ) : null}
                        <span
                          className={cn(
                            "rounded-full px-2.5 py-0.5 text-xs font-semibold",
                            waiting ? "bg-primary/10 text-primary" : "bg-med-green/15 text-med-green",
                          )}
                        >
                          {waiting ? t("statusWaiting") : t("statusShared")}
                        </span>
                      </div>
                      <p className="mt-1 text-sm text-on-surface-variant">
                        {patientName}
                        {" · "}
                        {fmtDate(lab.resultedAt)}
                      </p>
                    </div>
                  </div>
                  <div className="flex shrink-0 flex-wrap items-center gap-2">
                    {waiting ? <LabReviewButton labResultId={lab.id} /> : null}
                    <Link
                      href={`/doctor/patients/${lab.patient.id}/labs`}
                      className={cn(
                        "rounded-full px-4 py-2 text-center text-sm font-semibold",
                        waiting
                          ? "border border-outline-variant/30 text-primary hover:bg-surface-container-low"
                          : "bg-primary text-on-primary hover:opacity-90",
                      )}
                    >
                      {waiting ? t("openFile") : t("seeTests")}
                    </Link>
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
