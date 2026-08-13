import type { MetadataRoute } from "next";
import { resolveSiteOrigin } from "@/lib/seo";

export default function robots(): MetadataRoute.Robots {
  const base = resolveSiteOrigin();
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: ["/api/", "/*/search"],
    },
    sitemap: `${base}/sitemap.xml`,
  };
}
