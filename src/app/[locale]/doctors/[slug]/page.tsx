import { notFound } from "next/navigation";
import Image from "next/image";
import { setRequestLocale, getTranslations } from "next-intl/server";
import { Button } from "@/components/ui/button";
import { JsonLd } from "@/components/seo/json-ld";
import { getContentProvider } from "@/content/factory";
import { buildMetadata, siteUrl } from "@/lib/seo";
import { buildAppCtaUrl } from "@/lib/cta";
import type { Locale } from "@/content/types";

export async function generateStaticParams() {
  const slugs = await getContentProvider().listDoctorSlugs();
  return slugs.flatMap((slug) => [
    { locale: "en", slug },
    { locale: "ar", slug },
  ]);
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string; slug: string }>;
}) {
  const { locale, slug } = await params;
  const doctor = await getContentProvider().getDoctor(slug, locale as Locale);
  if (!doctor) return {};
  return buildMetadata({
    locale: locale as Locale,
    path: `/doctors/${slug}`,
    title: doctor.seo.title,
    description: doctor.seo.description,
    image: doctor.seo.image?.url,
  });
}

export default async function DoctorProfilePage({
  params,
}: {
  params: Promise<{ locale: string; slug: string }>;
}) {
  const { locale: localeParam, slug } = await params;
  const locale = localeParam as Locale;
  setRequestLocale(locale);
  const doctor = await getContentProvider().getDoctor(slug, locale);
  if (!doctor) notFound();
  const tCommon = await getTranslations("common");

  return (
    <div className="mx-auto max-w-7xl px-margin-mobile pb-20 pt-28 md:px-margin-desktop">
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "Physician",
          name: doctor.name,
          url: siteUrl(`/${locale}/doctors/${doctor.slug}`),
          image: doctor.photo?.url,
          medicalSpecialty: doctor.specialty.name,
          availableLanguage: doctor.languages,
          ...(doctor.rating && doctor.ratingCount
            ? {
                aggregateRating: {
                  "@type": "AggregateRating",
                  ratingValue: doctor.rating,
                  reviewCount: doctor.ratingCount,
                  bestRating: 5,
                  worstRating: 1,
                },
              }
            : {}),
        }}
      />
      <div className="glass-card grid gap-8 rounded-3xl p-8 md:grid-cols-[280px_1fr]">
        <div className="relative mx-auto h-64 w-64 overflow-hidden rounded-2xl bg-surface-dim">
          {doctor.photo ? (
            doctor.photo.url.startsWith("/api/") ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={doctor.photo.url} alt={doctor.photo.alt} className="h-full w-full object-cover" />
            ) : (
              <Image
                src={doctor.photo.url}
                alt={doctor.photo.alt}
                fill
                className="object-cover"
                sizes="256px"
                priority
              />
            )
          ) : null}
        </div>
        <div className="space-y-4">
          <p className="text-sm font-semibold text-med-green">{doctor.specialty.name}</p>
          <h1 className="font-headline text-4xl text-primary">{doctor.name}</h1>
          <p className="text-lg text-on-surface-variant">{doctor.title}</p>
          {doctor.rating ? (
            <p className="text-sm font-semibold text-primary">
              ★ {doctor.rating.toFixed(1)}
              {doctor.ratingCount ? ` · ${doctor.ratingCount}` : ""}
            </p>
          ) : null}
          <p className="max-w-2xl text-on-surface-variant">{doctor.bio}</p>
          <div className="flex flex-wrap gap-3 pt-2">
            <a href={buildAppCtaUrl("book", { locale, doctorSlug: doctor.slug, page: "doctor-profile" })}>
              <Button size="lg">{tCommon("bookConsultation")}</Button>
            </a>
            <a href={buildAppCtaUrl("register", { locale, page: "doctor-profile" })}>
              <Button size="lg" variant="outline">
                Register
              </Button>
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
