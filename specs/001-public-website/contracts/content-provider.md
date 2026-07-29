# Content Provider Contract (CMS-Ready)

**Date**: 2026-07-28 | **Plan**: [../plan.md](../plan.md) | Satisfies FR-044

The public site consumes all content through this interface. v1 implementation: `DbContentProvider` (Prisma/Neon). A future CMS ships `CmsContentProvider` implementing the same interface — no page, component, metadata, or URL changes.

## Interface (TypeScript shape)

```ts
interface ContentProvider {
  // Doctors
  listDoctors(params: DoctorQuery): Promise<Paged<DoctorSummary>>;
  getDoctor(slug: string, locale: Locale): Promise<DoctorDetail | null>;
  listDoctorSlugs(): Promise<string[]>;                  // generateStaticParams + sitemap
  listSpecialties(locale: Locale): Promise<Specialty[]>;

  // Blog
  listPosts(params: PostQuery): Promise<Paged<PostSummary>>;
  getPost(slug: string, locale: Locale): Promise<PostDetail | null>;
  listPostSlugs(): Promise<{ slug: string; updatedAt: string }[]>;
  listCategories(locale: Locale): Promise<Taxonomy[]>;

  // Supporting content
  getServices(locale: Locale): Promise<Service[]>;
  getTestimonials(locale: Locale): Promise<Testimonial[]>;
  getFaqs(locale: Locale): Promise<FaqItem[]>;
  getPricingPlans(locale: Locale): Promise<PricingPlan[]>;  // [] when disabled/empty
  getLegalDocument(kind: 'privacy-policy' | 'terms', locale: Locale): Promise<LegalDoc | null>;

  // Search
  search(q: string, locale: Locale, limit?: number): Promise<SearchResults>;
}
```

## Core DTOs

DTOs are **locale-resolved** (provider picks the right language fields) and **storage-agnostic** (no Prisma types leak).

```ts
type Locale = 'en' | 'ar';

interface Paged<T> { items: T[]; total: number; page: number; pageSize: number; }

interface DoctorQuery {
  locale: Locale; page?: number; pageSize?: number;      // default 12
  q?: string; specialty?: string;                        // specialty slug
  language?: string; gender?: 'MALE' | 'FEMALE';
  availableOnly?: boolean;
}

interface DoctorSummary {
  slug: string; name: string; title: string | null;
  specialty: { slug: string; name: string };
  photo: ImageRef | null; languages: string[];
  yearsExperience: number | null; isAvailable: boolean;
}

interface DoctorDetail extends DoctorSummary {
  bio: string | null; credentials: string[];
  seo: SeoFields;                                        // see contracts/seo.md
}

interface PostQuery { locale: Locale; page?: number; pageSize?: number; category?: string; tag?: string; }

interface PostSummary {
  slug: string; title: string; summary: string;
  cover: ImageRef | null; publishedAt: string;           // ISO
  categories: Taxonomy[]; author: { name: string; role: string | null; avatarUrl: string | null };
}

interface PostDetail extends PostSummary {
  body: RichTextDoc;                                     // portable structured doc (research D4)
  updatedAt: string; tags: Taxonomy[]; seo: SeoFields;
}

interface ImageRef { url: string; alt: string; width?: number; height?: number; }
interface Taxonomy { slug: string; name: string; }
interface SeoFields { title: string; description: string; image: ImageRef | null; }
```

## Contract guarantees

1. **URL stability**: `slug` values never change on content-source migration; renames require a redirect entry.
2. **Publish-state filtering**: providers return only PUBLISHED content — pages never re-check status.
3. **Locale completeness**: missing translation falls back to the other locale at field level; never null-out a published entity for one locale (spec edge case).
4. **SEO completeness**: `seo.title`/`seo.description` always non-empty (derived from name/bio or title/summary when no override).
5. **Cacheability**: every method is safe behind `unstable_cache` with the tag vocabulary from contracts/api.md; providers must be side-effect free.
6. **Rich text portability**: `RichTextDoc` is renderer-agnostic structured JSON; renderer lives in the site, not the provider.
