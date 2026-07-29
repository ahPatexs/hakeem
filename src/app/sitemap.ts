import type { MetadataRoute } from "next";

const locales = ["en", "ar"] as const;
const staticPaths = [
  "",
  "/about",
  "/services",
  "/doctors",
  "/ai-assistant",
  "/faq",
  "/contact",
  "/privacy-policy",
  "/terms",
];

export default function sitemap(): MetadataRoute.Sitemap {
  const base = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
  const entries: MetadataRoute.Sitemap = [];

  for (const locale of locales) {
    for (const path of staticPaths) {
      entries.push({
        url: `${base}/${locale}${path}`,
        lastModified: new Date(),
        alternates: {
          languages: {
            en: `${base}/en${path}`,
            ar: `${base}/ar${path}`,
          },
        },
      });
    }
  }

  return entries;
}
