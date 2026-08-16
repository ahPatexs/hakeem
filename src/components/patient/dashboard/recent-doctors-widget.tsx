"use client";

import { useLocale, useTranslations } from "next-intl";
import { Link } from "@/i18n/routing";
import { EmptyState } from "@/components/patient/shared/empty-state";
import { ErrorState } from "@/components/patient/shared/error-state";
import { PersonAvatar } from "@/components/portal/person-avatar";
import { DoctorRatingStars } from "@/components/portal/doctor-rating";
import type { WidgetResult, RecentDoctor } from "@/lib/patient/dashboard";
import { useRouter } from "@/i18n/routing";

export function RecentDoctorsWidget({ result }: { result: WidgetResult<RecentDoctor[]> }) {
  const t = useTranslations("patient.dashboard.recentDoctors");
  const locale = useLocale();
  const router = useRouter();

  if (!result.ok) {
    return (
      <section className="glass-card rounded-3xl border border-outline-variant/20 bg-surface-container-lowest p-5 shadow-sm md:p-6">
        <h2 className="font-headline text-lg text-primary">{t("title")}</h2>
        <ErrorState className="mt-3" message={t("error")} onRetry={() => router.refresh()} />
      </section>
    );
  }

  if (result.data.length === 0) {
    return (
      <section className="glass-card rounded-3xl border border-outline-variant/20 bg-surface-container-lowest p-5 shadow-sm md:p-6">
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
    <section className="glass-card rounded-3xl border border-outline-variant/20 bg-surface-container-lowest p-5 shadow-sm md:p-6">
      <h2 className="font-headline text-lg text-primary">{t("title")}</h2>
      <ul className="mt-4 space-y-1">
        {result.data.map((doc) => {
          const name = locale === "ar" ? doc.nameAr || doc.nameEn : doc.nameEn;
          const title = locale === "ar" ? doc.titleAr || doc.titleEn : doc.titleEn;
          return (
            <li key={doc.id}>
              <Link
                href={`/patient/doctors/${doc.slug}`}
                className="flex items-center gap-3 rounded-2xl p-2.5 transition hover:bg-primary/5"
              >
                <PersonAvatar name={name} photoUrl={doc.photoUrl} />
                <div className="min-w-0">
                  <p className="truncate font-semibold text-primary">{name}</p>
                  <p className="truncate text-xs text-on-surface-variant">{title}</p>
                  <DoctorRatingStars
                    avg={doc.ratingAvg}
                    count={doc.ratingCount}
                    size="sm"
                    emptyLabel=""
                  />
                </div>
              </Link>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
