import type { Metadata } from "next";
import type { Locale } from "@/content/types";

const SITE_NAME = { en: "Hakeem", ar: "حكيم" } as const;

export function siteUrl(path = "") {
  const base = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
  return new URL(path, base).toString();
}

export function buildMetadata(input: {
  locale: Locale;
  path: string;
  title: string;
  description: string;
  image?: string | null;
  type?: "website" | "article";
  noIndex?: boolean;
}): Metadata {
  const { locale, path, title, description, image, type = "website", noIndex } = input;
  const canonicalPath = `/${locale}${path === "/" ? "" : path}`;
  const canonical = siteUrl(canonicalPath);
  const altLocale = locale === "en" ? "ar" : "en";
  const altPath = `/${altLocale}${path === "/" ? "" : path}`;
  const ogImage = image ?? siteUrl("/images/og-default.svg");
  const brand = SITE_NAME[locale];
  const fullTitle = title.includes(brand) ? title : `${title} | ${brand}`;

  return {
    title: fullTitle,
    description,
    alternates: {
      canonical,
      languages: {
        en: siteUrl(`/en${path === "/" ? "" : path}`),
        ar: siteUrl(`/ar${path === "/" ? "" : path}`),
        "x-default": siteUrl(`/ar${path === "/" ? "" : path}`),
      },
    },
    openGraph: {
      title: fullTitle,
      description,
      url: canonical,
      siteName: brand,
      locale: locale === "ar" ? "ar_SA" : "en_US",
      alternateLocale: [altLocale === "ar" ? "ar_SA" : "en_US"],
      type,
      images: [{ url: ogImage, width: 1200, height: 630, alt: fullTitle }],
    },
    twitter: {
      card: "summary_large_image",
      title: fullTitle,
      description,
      images: [ogImage],
    },
    robots: noIndex ? { index: false, follow: true } : { index: true, follow: true },
    other: {
      "og:locale:alternate": altPath,
    },
  };
}
