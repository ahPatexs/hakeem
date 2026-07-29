import { setRequestLocale, getTranslations } from "next-intl/server";
import { FeaturedDoctors } from "@/components/sections/featured-doctors";
import { SearchFilters } from "@/components/doctors/search-filters";
import { getContentProvider } from "@/content/static-provider";
import { buildMetadata } from "@/lib/seo";
import type { Locale } from "@/content/types";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  return buildMetadata({
    locale: locale as Locale,
    path: "/doctors",
    title: locale === "ar" ? "ابحث عن طبيب" : "Find Doctors",
    description:
      locale === "ar"
        ? "تصفح الأطباء المرخّصين واحجز استشارة أونلاين."
        : "Browse licensed doctors and book an online consultation.",
  });
}

function parseSpecialtyParam(value: string | string[] | undefined): string[] {
  if (!value) return [];
  const parts = Array.isArray(value) ? value : [value];
  return parts
    .flatMap((v) => v.split(","))
    .map((s) => s.trim())
    .filter(Boolean);
}

export default async function DoctorsPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { locale: localeParam } = await params;
  const sp = await searchParams;
  const locale = localeParam as Locale;
  setRequestLocale(locale);
  const t = await getTranslations("home");
  const tCommon = await getTranslations("common");
  const tFilters = await getTranslations("filters");

  const q = typeof sp.q === "string" ? sp.q : Array.isArray(sp.q) ? sp.q[0] : "";
  const specialtySlugs = parseSpecialtyParam(sp.specialty);

  const result = await getContentProvider().listDoctors({
    locale,
    pageSize: 12,
    q: q || undefined,
    specialty: specialtySlugs.length ? specialtySlugs.join(",") : undefined,
  });

  return (
    <div className="mx-auto grid max-w-7xl gap-8 px-margin-mobile pb-20 pt-28 md:grid-cols-[280px_1fr] md:px-margin-desktop">
      <SearchFilters
        specialties={[
          { slug: "cardiology", name: locale === "ar" ? "أمراض القلب" : "Cardiology" },
          { slug: "neurology", name: locale === "ar" ? "الأمراض العصبية" : "Neurology" },
          { slug: "pediatrics", name: locale === "ar" ? "طب الأطفال" : "Pediatrics" },
        ]}
        initialQ={q ?? ""}
        initialSpecialties={specialtySlugs}
        labels={{
          title: tFilters("title"),
          searchPlaceholder: tFilters("searchPlaceholder"),
          searchAria: tFilters("searchAria"),
          specialty: tFilters("specialty"),
          clearAll: tFilters("clearAll"),
        }}
      />
      {result.items.length === 0 ? (
        <div className="rounded-2xl border border-outline-variant/30 bg-white p-10 text-center">
          <h2 className="font-headline text-headline-lg text-primary">{t("doctorsTitle")}</h2>
          <p className="mt-2 text-on-surface-variant">{tFilters("noResults")}</p>
        </div>
      ) : (
        <FeaturedDoctors
          title={t("doctorsTitle")}
          subtitle={t("doctorsSub")}
          viewAllLabel={t("viewAllDoctors")}
          bookLabel={tCommon("bookConsultation")}
          doctors={result.items}
          locale={locale}
        />
      )}
    </div>
  );
}
