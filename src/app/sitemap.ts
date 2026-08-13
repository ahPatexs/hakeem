import type { MetadataRoute } from "next";
import { resolveSiteOrigin } from "@/lib/seo";

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
  const base = resolveSiteOrigin();
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
