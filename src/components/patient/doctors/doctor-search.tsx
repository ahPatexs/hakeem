"use client";

import { useRouter } from "@/i18n/routing";
import { useTranslations } from "next-intl";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Link } from "@/i18n/routing";
import { Pagination } from "@/components/patient/shared/pagination";
import { EmptyState } from "@/components/patient/shared/empty-state";
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
}: {
  doctors: DoctorWithSpecialty[];
  total: number;
  page: number;
  pageSize: number;
  specialties: Specialty[];
  initialQ?: string;
  initialSpecialty?: string;
}) {
  const t = useTranslations("patient.doctors");
  const router = useRouter();

  function handleSearch(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const q = fd.get("q") as string;
    const specialty = fd.get("specialty") as string;
    const params = new URLSearchParams();
    if (q) params.set("q", q);
    if (specialty) params.set("specialty", specialty);
    router.push(`/patient/doctors?${params.toString()}`);
  }

  return (
    <div className="space-y-6">
      <form onSubmit={handleSearch} className="flex flex-col gap-3 sm:flex-row">
        <Input name="q" placeholder={t("searchPlaceholder")} defaultValue={initialQ ?? ""} className="flex-1" />
        <select
          name="specialty"
          defaultValue={initialSpecialty ?? ""}
          className="h-10 rounded-xl border border-outline-variant/30 bg-background px-3 text-sm"
        >
          <option value="">{t("allSpecialties")}</option>
          {specialties.map((s) => (
            <option key={s.id} value={s.slug}>
              {s.nameEn}
            </option>
          ))}
        </select>
        <Button type="submit" variant="soft">
          {t("search")}
        </Button>
      </form>

      {doctors.length === 0 ? (
        <EmptyState title={t("emptyTitle")} description={t("emptyDescription")} />
      ) : (
        <ul className="grid gap-4 sm:grid-cols-2">
          {doctors.map((doc) => (
            <li key={doc.id}>
              <Link
                href={`/patient/doctors/${doc.slug}`}
                className="glass-card block rounded-2xl border border-outline-variant/20 p-5 transition hover:border-med-green/30"
              >
                <p className="font-headline text-lg text-primary">{doc.nameEn}</p>
                <p className="text-sm text-on-surface-variant">{doc.titleEn}</p>
                <p className="mt-1 text-xs text-med-green">{doc.specialty.nameEn}</p>
              </Link>
            </li>
          ))}
        </ul>
      )}

      <Pagination page={page} pageSize={pageSize} total={total} />
    </div>
  );
}
