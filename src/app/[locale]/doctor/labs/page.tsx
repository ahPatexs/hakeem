import { setRequestLocale, getTranslations } from "next-intl/server";
import { Link } from "@/i18n/routing";
import { getLabInbox } from "@/actions/doctor/records";
import { LabReviewButton } from "@/components/doctor/labs/lab-review-button";
import { EmptyState, ErrorState, StatusBadge } from "@/components/doctor/shared";

type LabInboxItem = {
  id: string;
  title: string;
  criticalFlag: boolean;
  releaseStatus: string;
  resultedAt: Date;
  patient: { id: string; name: string | null };
};

function LabList({
  items,
  locale,
  t,
  showReviewButton,
}: {
  items: LabInboxItem[];
  locale: string;
  t: (key: string) => string;
  showReviewButton?: boolean;
}) {
  if (items.length === 0) return null;
  const fmtDate = (d: Date | string) =>
    new Date(d).toLocaleString(locale === "ar" ? "ar-SA" : "en-US", {
      dateStyle: "medium",
      timeStyle: "short",
    });

  return (
    <ul className="space-y-3">
      {items.map((lab) => (
        <li
          key={lab.id}
          className="glass-card flex flex-col gap-3 rounded-2xl border border-outline-variant/20 bg-surface-container-low p-4 sm:flex-row sm:items-center sm:justify-between"
        >
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <Link
                href={`/doctor/patients/${lab.patient.id}`}
                className="font-medium text-primary hover:underline"
              >
                {lab.title}
              </Link>
              {lab.criticalFlag ? (
                <span className="rounded-full bg-red-100 px-2 py-0.5 text-xs font-bold text-red-800">
                  {t("critical")}
                </span>
              ) : null}
              <StatusBadge status={lab.releaseStatus} variant="lab" />
            </div>
            <p className="mt-1 text-sm text-on-surface-variant">
              {lab.patient.name ?? "—"} · {fmtDate(lab.resultedAt)}
            </p>
          </div>
          {showReviewButton ? <LabReviewButton labResultId={lab.id} /> : null}
        </li>
      ))}
    </ul>
  );
}

export default async function DoctorLabsPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("doctor.labs");

  const result = await getLabInbox();
  if (!result.ok) {
    return <ErrorState title={t("title")} message={t("loadError")} />;
  }

  const { pending, reviewed } = result.data;
  const empty = pending.length === 0 && reviewed.length === 0;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-headline text-2xl text-primary md:text-3xl">{t("title")}</h1>
        <p className="mt-1 text-on-surface-variant">{t("subtitle")}</p>
        <p className="mt-2 text-sm text-on-surface-variant">{t("releaseNote")}</p>
      </div>

      {empty ? (
        <EmptyState title={t("emptyTitle")} description={t("emptyDescription")} />
      ) : (
        <>
          <section className="space-y-3">
            <h2 className="font-headline text-lg text-primary">{t("pending")}</h2>
            {pending.length === 0 ? (
              <p className="text-sm text-on-surface-variant">{t("emptyTitle")}</p>
            ) : (
              <LabList items={pending as LabInboxItem[]} locale={locale} t={t} showReviewButton />
            )}
          </section>

          <section className="space-y-3">
            <h2 className="font-headline text-lg text-primary">{t("reviewed")}</h2>
            {reviewed.length === 0 ? (
              <p className="text-sm text-on-surface-variant">—</p>
            ) : (
              <LabList items={reviewed as LabInboxItem[]} locale={locale} t={t} />
            )}
          </section>
        </>
      )}
    </div>
  );
}
