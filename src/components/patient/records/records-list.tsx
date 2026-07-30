"use client";

import { useTranslations } from "next-intl";
import { Link } from "@/i18n/routing";
import { Pagination } from "@/components/patient/shared/pagination";
import { EmptyState } from "@/components/patient/shared/empty-state";
import type { MedicalRecord, Doctor, ClinicalDocument } from "@prisma/client";

type RecordRow = MedicalRecord & {
  doctor: Pick<Doctor, "nameEn" | "nameAr"> | null;
  document: Pick<ClinicalDocument, "id" | "title"> | null;
};

export function RecordsList({
  items,
  total,
  page,
  pageSize,
}: {
  items: RecordRow[];
  total: number;
  page: number;
  pageSize: number;
}) {
  const t = useTranslations("patient.records");

  if (items.length === 0) {
    return <EmptyState title={t("emptyTitle")} description={t("emptyDescription")} />;
  }

  return (
    <div>
      <ul className="divide-y divide-outline-variant/15 rounded-2xl border border-outline-variant/20 bg-surface-container-low">
        {items.map((rec) => (
          <li key={rec.id} className="p-4">
            <Link href={`/patient/records/${rec.id}`} className="font-medium text-primary hover:underline">
              {rec.title}
            </Link>
            <p className="text-sm text-on-surface-variant">
              {new Date(rec.recordedAt).toLocaleDateString()} · {rec.recordType}
            </p>
          </li>
        ))}
      </ul>
      <Pagination page={page} pageSize={pageSize} total={total} />
    </div>
  );
}

export function RecordDetail({
  record,
}: {
  record: RecordRow & { document: ClinicalDocument | null };
}) {
  const t = useTranslations("patient.records");

  return (
    <article className="glass-card space-y-4 rounded-2xl border border-outline-variant/20 p-6">
      <h1 className="font-headline text-2xl text-primary">{record.title}</h1>
      <p className="text-sm text-on-surface-variant">
        {new Date(record.recordedAt).toLocaleDateString()} · {record.recordType}
      </p>
      {record.summary ? <p className="text-on-surface-variant">{record.summary}</p> : null}
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
