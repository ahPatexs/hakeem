"use client";

import { useTranslations } from "next-intl";
import { Link } from "@/i18n/routing";
import { EmptyState } from "@/components/patient/shared/empty-state";
import { ErrorState } from "@/components/patient/shared/error-state";
import type { WidgetResult } from "@/lib/patient/dashboard";
import type { MedicalRecord } from "@prisma/client";
import { useRouter } from "@/i18n/routing";

export function RecentRecordsWidget({ result }: { result: WidgetResult<MedicalRecord[]> }) {
  const t = useTranslations("patient.dashboard.records");
  const router = useRouter();

  if (!result.ok) {
    return (
      <section className="glass-card rounded-3xl border border-outline-variant/20 bg-surface-container-lowest p-5 md:p-6 shadow-sm">
        <h2 className="font-headline text-lg text-primary">{t("title")}</h2>
        <ErrorState className="mt-3" message={t("error")} onRetry={() => router.refresh()} />
      </section>
    );
  }

  if (result.data.length === 0) {
    return (
      <section className="glass-card rounded-3xl border border-outline-variant/20 bg-surface-container-lowest p-5 md:p-6 shadow-sm">
        <h2 className="font-headline text-lg text-primary">{t("title")}</h2>
        <EmptyState
          className="mt-3 border-0 bg-transparent py-6"
          title={t("emptyTitle")}
          actionLabel={t("viewAll")}
          actionHref="/patient/records"
        />
      </section>
    );
  }

  return (
    <section className="glass-card rounded-3xl border border-outline-variant/20 bg-surface-container-lowest p-5 md:p-6 shadow-sm">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="font-headline text-lg text-primary">{t("title")}</h2>
        <Link href="/patient/records" className="text-sm font-medium text-med-green hover:underline">
          {t("viewAll")}
        </Link>
      </div>
      <ul className="divide-y divide-outline-variant/15">
        {result.data.map((rec) => (
          <li key={rec.id} className="py-3 first:pt-0 last:pb-0">
            <Link href={`/patient/records/${rec.id}`} className="font-medium text-primary hover:underline">
              {rec.title}
            </Link>
            <p className="text-sm text-on-surface-variant">
              {new Date(rec.recordedAt).toLocaleDateString()} · {rec.recordType}
            </p>
          </li>
        ))}
      </ul>
    </section>
  );
}
