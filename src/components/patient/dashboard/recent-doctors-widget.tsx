"use client";

import { useTranslations } from "next-intl";
import { Link } from "@/i18n/routing";
import { EmptyState } from "@/components/patient/shared/empty-state";
import { ErrorState } from "@/components/patient/shared/error-state";
import type { WidgetResult, RecentDoctor } from "@/lib/patient/dashboard";
import { useRouter } from "@/i18n/routing";

export function RecentDoctorsWidget({ result }: { result: WidgetResult<RecentDoctor[]> }) {
  const t = useTranslations("patient.dashboard.recentDoctors");
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
          actionLabel={t("findDoctor")}
          actionHref="/patient/doctors"
        />
      </section>
    );
  }

  return (
    <section className="glass-card rounded-2xl border border-outline-variant/20 bg-surface-container-low p-5">
      <h2 className="font-headline text-lg text-primary">{t("title")}</h2>
      <ul className="mt-3 space-y-2">
        {result.data.map((doc) => (
          <li key={doc.id}>
            <Link
              href={`/patient/doctors/${doc.slug}`}
              className="flex items-center gap-3 rounded-xl p-2 hover:bg-surface-container-high"
            >
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-sm font-semibold text-primary">
                {doc.nameEn.charAt(0)}
              </div>
              <div>
                <p className="font-medium text-primary">{doc.nameEn}</p>
                <p className="text-xs text-on-surface-variant">{doc.titleEn}</p>
              </div>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
