"use client";

import { useTranslations } from "next-intl";
import { Link } from "@/i18n/routing";
import { Pagination } from "@/components/patient/shared/pagination";
import { EmptyState } from "@/components/patient/shared/empty-state";
import { StatusBadge } from "@/components/patient/shared/status-badge";
import type { LabResult, ClinicalDocument } from "@prisma/client";

type LabRow = LabResult & { document: Pick<ClinicalDocument, "id" | "title"> | null };

export function LabsList({
  items,
  total,
  page,
  pageSize,
}: {
  items: LabRow[];
  total: number;
  page: number;
  pageSize: number;
}) {
  const t = useTranslations("patient.labs");

  if (items.length === 0) {
    return <EmptyState title={t("emptyTitle")} description={t("emptyDescription")} />;
  }

  return (
    <div>
      <ul className="divide-y divide-outline-variant/15 rounded-2xl border border-outline-variant/20 bg-surface-container-low">
        {items.map((lab) => (
          <li key={lab.id} className="flex items-center justify-between gap-3 p-4">
            <div>
              <Link href={`/patient/labs/${lab.id}`} className="font-medium text-primary hover:underline">
                {lab.title}
              </Link>
              <p className="text-sm text-on-surface-variant">{new Date(lab.resultedAt).toLocaleDateString()}</p>
            </div>
            <StatusBadge status={lab.phase} variant="lab" label={lab.phase} />
          </li>
        ))}
      </ul>
      <Pagination page={page} pageSize={pageSize} total={total} />
    </div>
  );
}

export function LabDetail({ lab }: { lab: LabRow & { document: ClinicalDocument | null } }) {
  const t = useTranslations("patient.labs");

  return (
    <article className="glass-card space-y-4 rounded-2xl border border-outline-variant/20 p-6">
      <h1 className="font-headline text-2xl text-primary">{lab.title}</h1>
      <p className="text-sm text-on-surface-variant">{new Date(lab.resultedAt).toLocaleDateString()}</p>
      {lab.summary ? <p>{lab.summary}</p> : null}
      {lab.criticalFlag ? <p className="text-sm font-semibold text-red-600">{t("critical")}</p> : null}
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
