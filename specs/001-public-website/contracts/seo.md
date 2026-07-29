# SEO & Metadata Contracts

**Date**: 2026-07-28 | **Plan**: [../plan.md](../plan.md) | Satisfies FR-033–FR-040

## Per-page metadata contract (Next Metadata API output)

Every indexable page MUST emit:

| Field | Rule |
|---|---|
| `title` | Unique per page+locale. Pattern: `{Page/Entity Title} \| Hakeem` (`هكيم` in AR) |
| `description` | Unique, 70–160 chars, localized |
| `alternates.canonical` | Absolute, locale-specific URL |
| `alternates.languages` | `en`, `ar`, `x-default` (→ default-locale URL) |
| `openGraph` | `title, description, url, siteName, locale (en_US / ar_SA), type, images[≥1]` |
| `twitter` | `card: summary_large_image` (when image), `title, description, images` |
| `robots` | `index, follow` default; overrides below |

**OG `type`**: `website` for all pages except Blog Details → `article` (with `publishedTime`, `modifiedTime`, `authors`).

**Image fallback chain**: entity image (doctor photo / post cover) → `/images/og-default.png` (1200×630 brand card).

**Robots overrides (`noindex, follow`)**: `/search` (any query), doctors listing with active filter params, blog listing pages > 1 (canonical → page 1), disabled Pricing route, 404s.

## JSON-LD contract (per page class)

Rendered server-side as `<script type="application/ld+json">`, one graph per page.

| Page | Types | Required properties |
|---|---|---|
| Home | `Organization` + `WebSite` | Org: name, url, logo, sameAs[]; WebSite: url, potentialAction: SearchAction → `/{locale}/search?q={query}` |
| Doctor Profile | `Physician` | name, url, image (if photo), medicalSpecialty, availableLanguage[], worksFor → Organization ref |
| Blog Details | `BlogPosting` | headline, description, image, datePublished, dateModified, author (Person), publisher (Org), mainEntityOfPage, inLanguage |
| FAQ | `FAQPage` | mainEntity: Question[] with acceptedAnswer (published items only) |
| Contact | `ContactPage` | name, url |
| Doctor Profile, Blog Details, deep pages | `BreadcrumbList` | itemListElement from route hierarchy |

Prohibited: any patient data, ratings/review markup without genuine review data, prices in Physician markup.

## Sitemap contract (`/sitemap.xml`)

- Entries: static routes ×2 locales ∪ PUBLISHED doctor profiles ×2 ∪ PUBLISHED blog posts ×2.
- Each entry: `loc` (absolute), `lastModified` (entity `updatedAt`), `alternates.languages`.
- Excluded: DRAFT/ARCHIVED entities, `/search`, disabled Pricing, filtered/paginated listing URLs.
- Freshness: regenerated on revalidation tag `sitemap` (fired by publish/unpublish webhook) and at most 300 s stale otherwise (SC-005/SC-015).

## Robots contract (`/robots.txt`)

```text
User-agent: *
Allow: /
Disallow: /api/
Disallow: /*/search
Sitemap: {SITE_URL}/sitemap.xml
```

## Verification hooks (CI)

- Playwright asserts: unique title/description across sampled pages, canonical+hreflang presence, JSON-LD parses and matches required properties per page class (SC-004, SC-014).
- Sitemap test: published fixtures present ×2 locales, unpublished absent (SC-015).
