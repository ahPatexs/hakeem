"use client";

import { AlertTriangle, ChevronRight, FlaskConical } from "lucide-react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/routing";
import { Pagination } from "@/components/patient/shared/pagination";
import { EmptyState } from "@/components/patient/shared/empty-state";
import { StatusBadge } from "@/components/patient/shared/status-badge";
import { portalCardClass } from "@/components/portal/chrome";
import { formatPortalDate } from "@/lib/datetime";
import type { LabResult, ClinicalDocument } from "@prisma/client";

type LabRow = LabResult & { document: Pick<ClinicalDocument, "id" | "title"> | null };

export function LabsList({
  items,
  total,
  page,
  pageSize,
  locale,
}: {
  items: LabRow[];
  total: number;
  page: number;
  pageSize: number;
  locale: string;
}) {
  const t = useTranslations("patient.labs");
  const ts = useTranslations("patient.status");

  if (items.length === 0) {
    return (
      <EmptyState
        title={t("emptyTitle")}
        description={t("emptyDescription")}
        actionLabel={t("bookVisit")}
        actionHref="/patient/appointments/book"
      />
    );
  }

  return (
    <div>
      <ul className="space-y-3">
        {items.map((lab) => (
          <li key={lab.id}>
            <Link
              href={`/patient/labs/${lab.id}`}
              className={`${portalCardClass} flex items-start gap-4 p-4 transition hover:border-med-green/30 hover:shadow-md`}
            >
              <span
                className={`inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-full ${
                  lab.criticalFlag ? "bg-warm-coral/15 text-warm-coral" : "bg-med-green/15 text-med-green"
                }`}
              >
                {lab.criticalFlag ? (
                  <AlertTriangle className="h-5 w-5" aria-hidden />
                ) : (
                  <FlaskConical className="h-5 w-5" aria-hidden />
                )}
              </span>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="font-semibold text-primary">{lab.title}</p>
                  {lab.criticalFlag ? (
                    <span className="rounded-full bg-warm-coral/10 px-2 py-0.5 text-xs font-semibold text-warm-coral">
                      {t("criticalBadge")}
                    </span>
                  ) : null}
                  {lab.phase ? (
                    <StatusBadge status={lab.phase} variant="lab" label={ts(lab.phase)} />
                  ) : null}
                </div>
                <p className="mt-1 text-sm text-on-surface-variant">{formatPortalDate(lab.resultedAt, locale)}</p>
                {lab.summary ? (
                  <p className="mt-2 line-clamp-2 text-sm leading-relaxed text-on-surface">{lab.summary}</p>
                ) : null}
                {lab.document ? (
                  <p className="mt-2 text-xs font-medium text-med-green">{t("hasReport")}</p>
                ) : null}
              </div>
              <ChevronRight className="mt-1 h-5 w-5 shrink-0 text-on-surface-variant rtl:rotate-180" aria-hidden />
            </Link>
          </li>
        ))}
      </ul>
      <Pagination page={page} pageSize={pageSize} total={total} />
    </div>
  );
}

export function LabDetail({
  lab,
  locale,
}: {
  lab: {
    title: string;
    resultedAt: Date | string;
    summary: string | null;
    criticalFlag: boolean;
    phase: string | null;
    document: Pick<ClinicalDocument, "id" | "title"> | null;
  };
  locale: string;
}) {
  const t = useTranslations("patient.labs");
  const ts = useTranslations("patient.status");

  return (
    <article className={`${portalCardClass} space-y-4 p-6`}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-xs font-bold uppercase tracking-wide text-on-surface-variant">{t("resultLabel")}</p>
          <h1 className="font-headline text-2xl text-primary">{lab.title}</h1>
          <p className="mt-1 text-sm text-on-surface-variant">{formatPortalDate(lab.resultedAt, locale)}</p>
        </div>
        {lab.phase ? <StatusBadge status={lab.phase} variant="lab" label={ts(lab.phase)} /> : null}
      </div>
      {lab.criticalFlag ? (
        <p className="flex items-center gap-2 rounded-2xl bg-warm-coral/10 px-4 py-3 text-sm font-semibold text-warm-coral">
          <AlertTriangle className="h-4 w-4 shrink-0" aria-hidden />
          {t("critical")}
        </p>
      ) : null}
      {lab.summary ? (
        <div className="rounded-2xl bg-surface-container-low p-4">
          <p className="whitespace-pre-wrap text-sm leading-relaxed text-on-surface">{lab.summary}</p>
        </div>
      ) : null}
      {lab.document ? (
        <a
          href={`/api/patient/documents/${lab.document.id}`}
          className="inline-flex text-sm font-medium text-med-green hover:underline"
          target="_blank"
          rel="noopener noreferrer"
        >
          {t("downloadDocument")}
        </a>
      ) : null}
    </article>
  );
}
