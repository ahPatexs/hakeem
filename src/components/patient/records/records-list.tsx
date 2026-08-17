"use client";

import { ChevronRight, FileText } from "lucide-react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/routing";
import { Pagination } from "@/components/patient/shared/pagination";
import { EmptyState } from "@/components/patient/shared/empty-state";
import { PersonAvatar } from "@/components/portal/person-avatar";
import { portalCardClass } from "@/components/portal/chrome";
import { formatPortalDate } from "@/lib/datetime";
import { localizedText } from "@/lib/utils";
import type { MedicalRecord, Doctor, ClinicalDocument } from "@prisma/client";

type RecordRow = MedicalRecord & {
  doctor: Pick<Doctor, "nameEn" | "nameAr" | "photoUrl"> | null;
  document: Pick<ClinicalDocument, "id" | "title"> | null;
};

function recordTypeLabel(
  recordType: string,
  t: ReturnType<typeof useTranslations<"patient.records">>,
) {
  if (recordType === "VISIT_SUMMARY") return t("typeVisitSummary");
  return recordType.replace(/_/g, " ");
}

export function RecordsList({
  items,
  total,
  page,
  pageSize,
  locale,
  tab = "notes",
}: {
  items: RecordRow[];
  total: number;
  page: number;
  pageSize: number;
  locale: string;
  tab?: "notes" | "files";
}) {
  const t = useTranslations("patient.records");

  if (items.length === 0) {
    return (
      <EmptyState
        title={tab === "files" ? t("emptyFilesTitle") : t("emptyTitle")}
        description={tab === "files" ? t("emptyFilesDescription") : t("emptyDescription")}
        actionLabel={tab === "notes" ? t("bookVisit") : undefined}
        actionHref={tab === "notes" ? "/patient/appointments/book" : undefined}
      />
    );
  }

  return (
    <div>
      <ul className="space-y-3">
        {items.map((rec) => {
          const doctorName = rec.doctor
            ? localizedText(locale, rec.doctor.nameEn, rec.doctor.nameAr)
            : null;
          return (
            <li key={rec.id}>
              <Link
                href={`/patient/records/${rec.id}`}
                className={`${portalCardClass} flex items-start gap-4 p-4 transition hover:border-med-green/30 hover:shadow-md`}
              >
                {rec.recordType === "VISIT_SUMMARY" && doctorName ? (
                  <PersonAvatar name={doctorName} photoUrl={rec.doctor?.photoUrl} />
                ) : (
                  <span className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
                    <FileText className="h-5 w-5" aria-hidden />
                  </span>
                )}
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="font-semibold text-primary">{rec.title}</p>
                    <span className="rounded-full bg-surface-container-high px-2 py-0.5 text-xs font-medium text-on-surface-variant">
                      {recordTypeLabel(rec.recordType, t)}
                    </span>
                  </div>
                  <p className="mt-1 text-sm text-on-surface-variant">
                    {formatPortalDate(rec.recordedAt, locale)}
                    {doctorName ? ` · ${doctorName}` : null}
                  </p>
                  {rec.summary ? (
                    <p className="mt-2 line-clamp-2 text-sm leading-relaxed text-on-surface">{rec.summary}</p>
                  ) : null}
                  {rec.document ? (
                    <p className="mt-2 text-xs font-medium text-med-green">{t("hasAttachment")}</p>
                  ) : null}
                </div>
                <ChevronRight className="mt-1 h-5 w-5 shrink-0 text-on-surface-variant rtl:rotate-180" aria-hidden />
              </Link>
            </li>
          );
        })}
      </ul>
      <Pagination page={page} pageSize={pageSize} total={total} />
    </div>
  );
}

export function RecordDetail({
  record,
  locale,
}: {
  record: {
    title: string;
    recordedAt: Date | string;
    recordType: string;
    summary: string | null;
    document: Pick<ClinicalDocument, "id" | "title"> | null;
    doctor: Pick<Doctor, "nameEn" | "nameAr" | "photoUrl"> | null;
  };
  locale: string;
}) {
  const t = useTranslations("patient.records");
  const doctorName = record.doctor
    ? localizedText(locale, record.doctor.nameEn, record.doctor.nameAr)
    : null;

  return (
    <article className={`${portalCardClass} space-y-4 p-6`}>
      <div className="flex flex-wrap items-start gap-4">
        {doctorName ? <PersonAvatar name={doctorName} photoUrl={record.doctor?.photoUrl} size="lg" /> : null}
        <div className="min-w-0 flex-1">
          <p className="text-xs font-bold uppercase tracking-wide text-on-surface-variant">
            {recordTypeLabel(record.recordType, t)}
          </p>
          <h1 className="font-headline text-2xl text-primary">{record.title}</h1>
          <p className="mt-1 text-sm text-on-surface-variant">
            {formatPortalDate(record.recordedAt, locale)}
            {doctorName ? ` · ${t("byDoctor", { name: doctorName })}` : null}
          </p>
        </div>
      </div>
      {record.summary ? (
        <div className="rounded-2xl bg-surface-container-low p-4">
          <p className="whitespace-pre-wrap text-sm leading-relaxed text-on-surface">{record.summary}</p>
        </div>
      ) : null}
      {record.document ? (
        <a
          href={`/api/patient/documents/${record.document.id}`}
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
