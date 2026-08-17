"use client";

import { ChevronRight } from "lucide-react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/routing";
import { Pagination } from "@/components/patient/shared/pagination";
import { EmptyState } from "@/components/patient/shared/empty-state";
import { StatusBadge } from "@/components/patient/shared/status-badge";
import { PersonAvatar } from "@/components/portal/person-avatar";
import { portalCardClass } from "@/components/portal/chrome";
import { formatPortalDate } from "@/lib/datetime";
import { localizedText } from "@/lib/utils";
import type { Prescription, Doctor, ClinicalDocument, PrescriptionLine } from "@prisma/client";

type RxRow = Prescription & {
  doctor: Pick<Doctor, "nameEn" | "nameAr" | "photoUrl"> | null;
  lines: PrescriptionLine[];
  document?: Pick<ClinicalDocument, "id" | "title"> | null;
};

function linePreview(rx: RxRow) {
  if (rx.lines.length > 0) {
    const names = rx.lines.map((l) => l.medicationName);
    if (names.length === 1) return names[0]!;
    return `${names[0]} +${names.length - 1}`;
  }
  return rx.medicationName;
}

function instructionsPreview(rx: RxRow) {
  const fromLine = rx.lines.find((l) => l.instructions)?.instructions;
  return fromLine ?? rx.instructions;
}

export function PrescriptionsList({
  items,
  total,
  page,
  pageSize,
  locale,
  bucket = "active",
}: {
  items: RxRow[];
  total: number;
  page: number;
  pageSize: number;
  locale: string;
  bucket?: "active" | "history";
}) {
  const t = useTranslations("patient.prescriptions");
  const ts = useTranslations("patient.status");

  if (items.length === 0) {
    return (
      <EmptyState
        title={bucket === "history" ? t("emptyHistoryTitle") : t("emptyTitle")}
        description={bucket === "history" ? t("emptyHistoryDescription") : t("emptyDescription")}
        actionLabel={bucket === "active" ? t("bookVisit") : undefined}
        actionHref={bucket === "active" ? "/patient/appointments/book" : undefined}
      />
    );
  }

  return (
    <div>
      <ul className="space-y-3">
        {items.map((rx) => {
          const doctorName = rx.doctor
            ? localizedText(locale, rx.doctor.nameEn, rx.doctor.nameAr)
            : null;
          const preview = instructionsPreview(rx);
          return (
            <li key={rx.id}>
              <Link
                href={`/patient/prescriptions/${rx.id}`}
                className={`${portalCardClass} flex items-start gap-4 p-4 transition hover:border-med-green/30 hover:shadow-md`}
              >
                {doctorName ? (
                  <PersonAvatar name={doctorName} photoUrl={rx.doctor?.photoUrl} />
                ) : (
                  <PersonAvatar name={linePreview(rx)} />
                )}
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="font-semibold text-primary">{linePreview(rx)}</p>
                    <StatusBadge status={rx.status} variant="prescription" label={ts(rx.status)} />
                  </div>
                  <p className="mt-1 text-sm text-on-surface-variant">
                    {t("prescribed")} {formatPortalDate(rx.prescribedAt, locale)}
                    {doctorName ? ` · ${doctorName}` : null}
                  </p>
                  {preview ? (
                    <p className="mt-2 line-clamp-2 text-sm text-on-surface-variant">{preview}</p>
                  ) : null}
                  {rx.lines.length > 1 ? (
                    <p className="mt-1 text-xs text-on-surface-variant">
                      {t("medCount", { count: rx.lines.length })}
                    </p>
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

export function PrescriptionDetail({
  rx,
  locale,
}: {
  rx: RxRow;
  locale: string;
}) {
  const t = useTranslations("patient.prescriptions");
  const ts = useTranslations("patient.status");
  const doctorName = rx.doctor ? localizedText(locale, rx.doctor.nameEn, rx.doctor.nameAr) : null;

  return (
    <article className={`${portalCardClass} space-y-5 p-6`}>
      <div className="flex flex-wrap items-start gap-4">
        {doctorName ? <PersonAvatar name={doctorName} photoUrl={rx.doctor?.photoUrl} size="lg" /> : null}
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="font-headline text-2xl text-primary">{linePreview(rx)}</h1>
            <StatusBadge status={rx.status} variant="prescription" label={ts(rx.status)} />
          </div>
          <p className="mt-1 text-sm text-on-surface-variant">
            {t("prescribed")} {formatPortalDate(rx.prescribedAt, locale)}
            {doctorName ? ` · ${t("byDoctor", { name: doctorName })}` : null}
          </p>
        </div>
      </div>

      {rx.lines.length > 0 ? (
        <div className="space-y-3">
          <h2 className="text-sm font-bold uppercase tracking-wide text-on-surface-variant">{t("medications")}</h2>
          <ul className="space-y-3">
            {rx.lines.map((line) => (
              <li key={line.id} className="rounded-2xl bg-surface-container-low p-4">
                <p className="font-semibold text-primary">{line.medicationName}</p>
                <dl className="mt-2 grid gap-1 text-sm text-on-surface-variant sm:grid-cols-2">
                  {line.dose ? (
                    <>
                      <dt className="font-medium">{t("dose")}</dt>
                      <dd>{line.dose}</dd>
                    </>
                  ) : null}
                  {line.frequency ? (
                    <>
                      <dt className="font-medium">{t("frequency")}</dt>
                      <dd>{line.frequency}</dd>
                    </>
                  ) : null}
                  {line.duration ? (
                    <>
                      <dt className="font-medium">{t("duration")}</dt>
                      <dd>{line.duration}</dd>
                    </>
                  ) : null}
                  {line.quantity ? (
                    <>
                      <dt className="font-medium">{t("quantity")}</dt>
                      <dd>{line.quantity}</dd>
                    </>
                  ) : null}
                </dl>
                {line.instructions ? (
                  <p className="mt-2 text-sm leading-relaxed text-on-surface">{line.instructions}</p>
                ) : null}
              </li>
            ))}
          </ul>
        </div>
      ) : rx.instructions ? (
        <div className="rounded-2xl bg-surface-container-low p-4">
          <p className="whitespace-pre-wrap text-sm leading-relaxed text-on-surface">{rx.instructions}</p>
        </div>
      ) : null}

      {rx.document ? (
        <a
          href={`/api/patient/documents/${rx.document.id}`}
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
