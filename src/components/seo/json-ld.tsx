type JsonLd = Record<string, unknown>;

export function JsonLd({ data }: { data: JsonLd | JsonLd[] }) {
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data) }}
    />
  );
}

export function organizationJsonLd(siteUrl: string) {
  return {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: "Hakeem",
    url: siteUrl,
    logo: `${siteUrl}/images/og-default.png`,
  };
}

export function websiteJsonLd(siteUrl: string, locale: string) {
  return {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: "Hakeem",
    url: `${siteUrl}/${locale}`,
    potentialAction: {
      "@type": "SearchAction",
      target: `${siteUrl}/${locale}/search?q={query}`,
      "query-input": "required name=query",
    },
  };
}
