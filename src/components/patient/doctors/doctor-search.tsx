"use client";

import { useLocale, useTranslations } from "next-intl";
import { useRouter } from "@/i18n/routing";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Link } from "@/i18n/routing";
import { Pagination } from "@/components/patient/shared/pagination";
import { EmptyState } from "@/components/patient/shared/empty-state";
import { PersonAvatar } from "@/components/portal/person-avatar";
import { DoctorRatingStars } from "@/components/portal/doctor-rating";
import { localizedText } from "@/lib/utils";
import type { Doctor, Specialty } from "@prisma/client";

type DoctorWithSpecialty = Doctor & { specialty: Pick<Specialty, "slug" | "nameEn" | "nameAr"> };

export function DoctorSearch({
  doctors,
  total,
  page,
  pageSize,
  specialties,
  initialQ,
  initialSpecialty,
  symptomSessionId,
}: {
  doctors: DoctorWithSpecialty[];
  total: number;
  page: number;
  pageSize: number;
  specialties: Specialty[];
  initialQ?: string;
  initialSpecialty?: string;
  symptomSessionId?: string;
}) {
  const t = useTranslations("patient.doctors");
  const locale = useLocale();
  const router = useRouter();

  function handleSearch(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const q = fd.get("q") as string;
    const specialty = fd.get("specialty") as string;
    const params = new URLSearchParams();
    if (q) params.set("q", q);
    if (specialty) params.set("specialty", specialty);
    if (symptomSessionId) params.set("symptomSessionId", symptomSessionId);
    router.push(`/patient/doctors?${params.toString()}`);
  }

  function doctorHref(slug: string) {
    if (!symptomSessionId) return `/patient/doctors/${slug}`;
    return `/patient/doctors/${slug}?symptomSessionId=${encodeURIComponent(symptomSessionId)}`;
  }

  return (
    <div className="space-y-6">
      <form onSubmit={handleSearch} className="flex flex-col gap-3 sm:flex-row">
        <Input name="q" placeholder={t("searchPlaceholder")} defaultValue={initialQ ?? ""} className="flex-1 rounded-full" />
        <select
          name="specialty"
          defaultValue={initialSpecialty ?? ""}
          className="h-11 rounded-full border border-outline-variant/30 bg-background px-4 text-sm"
        >
          <option value="">{t("allSpecialties")}</option>
          {specialties.map((s) => (
            <option key={s.id} value={s.slug}>
              {localizedText(locale, s.nameEn, s.nameAr)}
            </option>
          ))}
        </select>
        <Button type="submit" variant="soft" className="rounded-full">
          {t("search")}
        </Button>
      </form>

      {doctors.length === 0 ? (
        <EmptyState title={t("emptyTitle")} description={t("emptyDescription")} />
      ) : (
        <ul className="grid gap-4 sm:grid-cols-2">
          {doctors.map((doc) => {
            const name = localizedText(locale, doc.nameEn, doc.nameAr);
            const title = localizedText(locale, doc.titleEn, doc.titleAr);
            const specialty = localizedText(locale, doc.specialty.nameEn, doc.specialty.nameAr);
            return (
              <li key={doc.id}>
                <Link
                  href={doctorHref(doc.slug)}
                  className="glass-card flex items-center gap-4 rounded-3xl border border-outline-variant/20 p-5 shadow-sm transition hover:border-med-green/30 hover:shadow-md"
                >
                  <PersonAvatar name={name} photoUrl={doc.photoUrl} />
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-headline text-lg text-primary">{name}</p>
                    {title ? <p className="truncate text-sm text-on-surface-variant">{title}</p> : null}
                    <p className="mt-1 text-xs font-semibold text-med-green">{specialty}</p>
                    <div className="mt-2">
                      <DoctorRatingStars
                        avg={doc.ratingAvg}
                        count={doc.ratingCount}
                        size="sm"
                        countLabel={t("ratingCount", { count: doc.ratingCount })}
                        emptyLabel={t("noRatings")}
                      />
                    </div>
                  </div>
                </Link>
              </li>
            );
          })}
        </ul>
      )}

      <Pagination page={page} pageSize={pageSize} total={total} />
    </div>
  );
}
