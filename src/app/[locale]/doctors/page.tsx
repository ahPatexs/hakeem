import { setRequestLocale, getTranslations } from "next-intl/server";
import { FeaturedDoctors } from "@/components/sections/featured-doctors";
import { SearchFilters } from "@/components/doctors/search-filters";
import { getContentProvider } from "@/content/factory";
import { buildMetadata } from "@/lib/seo";
import type { Locale, DoctorSummary } from "@/content/types";

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

  // Platform search first — never fall back to unrestricted CMS when throttled (FR-046).
  const { searchDoctors: platformSearch, refreshDoctorProjection } = await import(
    "@/lib/platform/search"
  );
  const { prisma } = await import("@/lib/prisma");
  const { headers } = await import("next/headers");
  const h = await headers();
  const clientKey =
    h.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    h.get("x-real-ip") ||
    h.get("cf-connecting-ip") ||
    "public-anonymous";

  let bookable = await platformSearch({
    q: q || undefined,
    specialty: specialtySlugs[0],
    locale: locale === "en" ? "en" : "ar",
    bookableOnly: true,
    clientKey,
  });

  const rateLimited = !bookable.ok && bookable.code === "RATE_LIMITED";

  // Empty projection index → hydrate from DB bookable rules, then re-query (FR-018).
  // Skip hydration when already rate-limited (would consume more of the budget).
  if (!rateLimited && bookable.ok && bookable.data.items.length === 0) {
    const projectionCount = await prisma.searchDoctorProjection.count();
    if (projectionCount === 0) {
      const candidates = await prisma.doctor.findMany({
        where: { status: "PUBLISHED", isAvailable: true },
        select: { id: true },
        take: 50,
      });
      for (const c of candidates) {
        await refreshDoctorProjection(c.id);
      }
      bookable = await platformSearch({
        q: q || undefined,
        specialty: specialtySlugs[0],
        locale: locale === "en" ? "en" : "ar",
        bookableOnly: true,
        clientKey,
      });
    }
  }

  const stillRateLimited = !bookable.ok && bookable.code === "RATE_LIMITED";

  let items: DoctorSummary[] = [];
  if (bookable.ok) {
    if (bookable.data.items.length > 0) {
      const result = await getContentProvider().listDoctors({
        locale,
        pageSize: 12,
        q: q || undefined,
        specialty: specialtySlugs.length ? specialtySlugs.join(",") : undefined,
      });
      const bookableIds = new Set(bookable.data.items.map((hit) => hit.doctorId));
      const doctors = await prisma.doctor.findMany({
        where: { id: { in: [...bookableIds] } },
        select: { slug: true },
      });
      const bookableSlugs = new Set(doctors.map((d) => d.slug));
      items = result.items.filter((d) => bookableSlugs.has(d.slug));
    }
  }
  // !bookable.ok (including RATE_LIMITED and other failures): keep items empty — no CMS bypass.

  const specialtyRows = await prisma.specialty.findMany({ orderBy: { sortOrder: "asc" } });
  const specialtyOptions = specialtyRows.map((s) => ({
    slug: s.slug,
    name: locale === "ar" ? s.nameAr : s.nameEn,
  }));

  return (
    <div className="mx-auto grid max-w-7xl gap-8 px-margin-mobile pb-20 pt-28 md:grid-cols-[280px_1fr] md:px-margin-desktop">
      <SearchFilters
        specialties={specialtyOptions}
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
      {stillRateLimited ? (
        <div
          className="rounded-2xl border border-warm-coral/30 bg-warm-coral/5 p-10 text-center"
          role="alert"
        >
          <h2 className="font-headline text-headline-lg text-primary">
            {tFilters("rateLimitedTitle")}
          </h2>
          <p className="mt-2 text-on-surface-variant">{tFilters("rateLimited")}</p>
        </div>
      ) : items.length === 0 ? (
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
          doctors={items}
          locale={locale}
        />
      )}
    </div>
  );
}
