"use client";

import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "@/i18n/routing";
import { Button } from "@/components/ui/button";
import {
  emrSoftDeleteDocument,
  emrRestoreDocument,
  emrGetDocumentDownloadUrl,
} from "@/actions/emr/documents";
import { emrAdminSetLegalHold } from "@/actions/emr/admin";

export type DocumentActionItem = {
  id: string;
  title: string;
  kind?: string | null;
  classification?: string | null;
  createdAt: Date | string;
  deletedAt?: Date | string | null;
  legalHold?: boolean;
};

/** Document list with download / soft-delete / optional legal-hold (T138 / T140). */
export function DocumentActionsList({
  patientUserId: _patientUserId,
  items,
  title,
  emptyLabel,
  locale = "en",
  canMutate = false,
  canLegalHold = false,
}: {
  patientUserId: string;
  items: DocumentActionItem[];
  title: string;
  emptyLabel: string;
  locale?: string;
  canMutate?: boolean;
  canLegalHold?: boolean;
}) {
  const t = useTranslations("emr");
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const fmtDate = (d: Date | string) =>
    new Date(d).toLocaleDateString(locale === "ar" ? "ar-SA" : "en-US", { dateStyle: "medium" });

  const run = (fn: () => Promise<void>) => {
    setError(null);
    startTransition(async () => {
      try {
        await fn();
        router.refresh();
      } catch {
        setError(t("error"));
      }
    });
  };

  return (
    <section className="space-y-3 rounded-xl border border-outline-variant/20 bg-surface-container-low p-5">
      <h2 className="font-headline text-lg text-primary">{title}</h2>
      {error ? (
        <p className="text-sm text-red-600" role="alert">
          {error}
        </p>
      ) : null}
      {items.length === 0 ? (
        <p className="text-sm text-on-surface-variant">{emptyLabel}</p>
      ) : (
        <ul className="divide-y divide-outline-variant/15">
          {items.map((doc) => (
            <li key={doc.id} className="flex flex-wrap items-start justify-between gap-3 py-3 first:pt-0 last:pb-0">
              <div className="min-w-0">
                <p className="font-medium text-primary">{doc.title}</p>
                <p className="mt-0.5 text-xs text-on-surface-variant">
                  {[doc.kind, doc.classification, doc.legalHold ? "LEGAL_HOLD" : null]
                    .filter(Boolean)
                    .join(" · ")}
                </p>
                <time className="text-xs text-on-surface-variant">{fmtDate(doc.createdAt)}</time>
              </div>
              <div className="flex flex-wrap gap-2">
                {!doc.deletedAt ? (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    disabled={pending}
                    onClick={() =>
                      run(async () => {
                        const res = await emrGetDocumentDownloadUrl({ documentId: doc.id });
                        if (!res.ok) throw new Error(res.code);
                        window.open(res.data.url, "_blank", "noopener,noreferrer");
                      })
                    }
                  >
                    {t("documents.download")}
                  </Button>
                ) : null}
                {canMutate && !doc.deletedAt && !doc.legalHold ? (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    disabled={pending}
                    onClick={() =>
                      run(async () => {
                        const res = await emrSoftDeleteDocument({ documentId: doc.id });
                        if (!res.ok) throw new Error(res.code);
                      })
                    }
                  >
                    {t("documents.hide")}
                  </Button>
                ) : null}
                {canMutate && doc.deletedAt ? (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    disabled={pending}
                    onClick={() =>
                      run(async () => {
                        const res = await emrRestoreDocument({ documentId: doc.id });
                        if (!res.ok) throw new Error(res.code);
                      })
                    }
                  >
                    {t("documents.restore")}
                  </Button>
                ) : null}
                {canLegalHold ? (
                  <Button
                    type="button"
                    variant="soft"
                    size="sm"
                    disabled={pending}
                    onClick={() =>
                      run(async () => {
                        const res = await emrAdminSetLegalHold({
                          documentId: doc.id,
                          hold: !doc.legalHold,
                        });
                        if (!res.ok) throw new Error(res.code);
                      })
                    }
                  >
                    {doc.legalHold ? t("admin.clearHold") : t("admin.setHold")}
                  </Button>
                ) : null}
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
