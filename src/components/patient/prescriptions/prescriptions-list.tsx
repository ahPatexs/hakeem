"use client";

import { useTranslations } from "next-intl";
import { Link } from "@/i18n/routing";
import { Pagination } from "@/components/patient/shared/pagination";
import { EmptyState } from "@/components/patient/shared/empty-state";
import { StatusBadge } from "@/components/patient/shared/status-badge";
import type { Prescription, Doctor, ClinicalDocument } from "@prisma/client";

type RxRow = Prescription & {
  doctor: Pick<Doctor, "nameEn" | "nameAr"> | null;
  document: Pick<ClinicalDocument, "id" | "title"> | null;
};

export function PrescriptionsList({
  items,
  total,
  page,
  pageSize,
}: {
  items: RxRow[];
  total: number;
  page: number;
  pageSize: number;
}) {
  const t = useTranslations("patient.prescriptions");

  if (items.length === 0) {
    return <EmptyState title={t("emptyTitle")} description={t("emptyDescription")} />;
  }

  return (
    <div>
      <ul className="divide-y divide-outline-variant/15 rounded-2xl border border-outline-variant/20 bg-surface-container-low">
        {items.map((rx) => (
          <li key={rx.id} className="flex items-center justify-between gap-3 p-4">
            <div>
              <Link href={`/patient/prescriptions/${rx.id}`} className="font-medium text-primary hover:underline">
                {rx.medicationName}
              </Link>
              <p className="text-sm text-on-surface-variant line-clamp-1">{rx.instructions}</p>
            </div>
            <StatusBadge status={rx.status} variant="prescription" />
          </li>
        ))}
      </ul>
      <Pagination page={page} pageSize={pageSize} total={total} />
    </div>
  );
}

export function PrescriptionDetail({
  rx,
}: {
  rx: RxRow & { document: ClinicalDocument | null };
}) {
  const t = useTranslations("patient.prescriptions");

  return (
    <article className="glass-card space-y-4 rounded-2xl border border-outline-variant/20 p-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <h1 className="font-headline text-2xl text-primary">{rx.medicationName}</h1>
        <StatusBadge status={rx.status} variant="prescription" />
      </div>
      <p className="text-sm text-on-surface-variant">
        {t("prescribed")} {new Date(rx.prescribedAt).toLocaleDateString()}
      </p>
      <p>{rx.instructions}</p>
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
