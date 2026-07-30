"use client";

import { useTranslations } from "next-intl";
import { Link } from "@/i18n/routing";
import { EmptyState } from "@/components/patient/shared/empty-state";
import { ErrorState } from "@/components/patient/shared/error-state";
import { StatusBadge } from "@/components/patient/shared/status-badge";
import type { WidgetResult } from "@/lib/patient/dashboard";
import type { Prescription } from "@prisma/client";
import { useRouter } from "@/i18n/routing";

export function PrescriptionsWidget({ result }: { result: WidgetResult<Prescription[]> }) {
  const t = useTranslations("patient.dashboard.prescriptions");
  const router = useRouter();

  if (!result.ok) {
    return (
      <section className="glass-card rounded-2xl border border-outline-variant/20 bg-surface-container-low p-5">
        <h2 className="font-headline text-lg text-primary">{t("title")}</h2>
        <ErrorState className="mt-3" message={t("error")} onRetry={() => router.refresh()} />
      </section>
    );
  }

  if (result.data.length === 0) {
    return (
      <section className="glass-card rounded-2xl border border-outline-variant/20 bg-surface-container-low p-5">
        <h2 className="font-headline text-lg text-primary">{t("title")}</h2>
        <EmptyState
          className="mt-3 border-0 bg-transparent py-6"
          title={t("emptyTitle")}
          actionLabel={t("viewAll")}
          actionHref="/patient/prescriptions"
        />
      </section>
    );
  }

  return (
    <section className="glass-card rounded-2xl border border-outline-variant/20 bg-surface-container-low p-5">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="font-headline text-lg text-primary">{t("title")}</h2>
        <Link href="/patient/prescriptions" className="text-sm font-medium text-med-green hover:underline">
          {t("viewAll")}
        </Link>
      </div>
      <ul className="divide-y divide-outline-variant/15">
        {result.data.map((rx) => (
          <li key={rx.id} className="flex items-start justify-between gap-3 py-3 first:pt-0 last:pb-0">
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
    </section>
  );
}
