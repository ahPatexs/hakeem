# Implementation Plan: Hakeem Public Website

**Branch**: `001-public-website` | **Date**: 2026-07-28 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/001-public-website/spec.md`

## Summary

Build the bilingual (English/Arabic, LTR/RTL) public marketing website for Hakeem, an AI-powered telemedicine platform. Fifteen public pages (Home through Terms & Conditions), SEO-first architecture (per-page metadata, sitemap, robots, Schema.org, OpenGraph/Twitter), a dynamic doctor directory with filters, a CMS-ready blog, global site search, contact/newsletter capture, and privacy-aware analytics — implemented as a Next.js 15 App Router application with TypeScript strict, Tailwind CSS + shadcn/ui, Framer Motion, Prisma ORM, and Neon PostgreSQL, targeting WCAG 2.2 AA and strong mobile Core Web Vitals.

## Technical Context

**Language/Version**: TypeScript 5.x (`strict: true`), Node.js 20 LTS runtime

**Primary Dependencies**: Next.js 15 (App Router, React Server Components, Metadata API), Tailwind CSS 3.x, shadcn/ui (Radix primitives), Framer Motion, `next-intl` (i18n routing + messages), Prisma ORM, Zod (boundary validation), React Hook Form

**Storage**: Neon PostgreSQL (serverless Postgres) via Prisma; Prisma Accelerate or Neon serverless driver for edge-compatible pooling

**Testing**: Vitest (unit), Playwright (e2e + accessibility smoke via axe), Lighthouse CI (performance budgets)

**Target Platform**: Vercel (or equivalent Node/edge host); modern evergreen browsers; mobile-first

**Project Type**: Web application (single Next.js app, no separate backend — API via Route Handlers/Server Actions)

**Performance Goals**: Home readable primary content ≤ 3 s on mid-tier mobile (SC-012); CWV-oriented budgets — LCP ≤ 2.5 s, CLS ≤ 0.1, INP ≤ 200 ms on key pages; static/ISR-first rendering

**Constraints**: WCAG 2.2 AA (SC-010); full Arabic RTL mirroring; blog publish visible ≤ 5 min (SC-005 → ISR revalidation window); stable public URL + metadata contract for future CMS swap; no PHI/private data on public surface

**Scale/Scope**: 15 static-ish marketing pages × 2 locales; doctor directory expected in the hundreds–low thousands of profiles; blog in the hundreds of posts; anonymous public traffic (read-heavy, cache-friendly)

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

`.specify/memory/constitution.md` is an unfilled template (no ratified principles). **No concrete gates to evaluate — PASS by default.** Baseline engineering discipline applied in its place: simplicity first (single app, no premature microservices), testability (every FR maps to a testable surface), and no speculative abstractions beyond the CMS content contract explicitly required by the spec (FR-044).

**Post-Phase 1 re-check**: Design introduces one deliberate abstraction — the content-provider interface for CMS readiness — justified directly by FR-044/spec assumptions. No violations.

## Route Structure

All public routes live under a locale segment. `next-intl` middleware negotiates locale and rewrites `/` → `/{locale}`.

```text
/{locale}                          → Home
/{locale}/about                    → About Hakeem
/{locale}/services                 → Our Services
/{locale}/doctors                  → Find Doctors (search + filters, URL-driven state)
/{locale}/doctors/[slug]           → Doctor Profile (dynamic, SEO priority)
/{locale}/ai-assistant             → AI Medical Assistant
/{locale}/how-it-works             → How It Works
/{locale}/pricing                  → Pricing (feature-flagged; 404/coming-soon when disabled)
/{locale}/testimonials             → Testimonials
/{locale}/faq                      → FAQ
/{locale}/blog                     → Blog listing (paginated: ?page=N)
/{locale}/blog/[slug]              → Blog Details (dynamic, SEO priority)
/{locale}/contact                  → Contact Us
/{locale}/privacy-policy           → Privacy Policy
/{locale}/terms                    → Terms & Conditions
/{locale}/search                   → Global site search (?q=)

# Non-localized infrastructure routes
/sitemap.xml                       → Sitemap index (app/sitemap.ts, both locales)
/robots.txt                        → app/robots.ts
/api/contact                       → POST contact inquiry
/api/newsletter                    → POST newsletter subscription
/api/search                        → GET typed search results (doctors + posts)
/api/revalidate                    → POST on-demand revalidation (secret-protected, CMS webhook target)
```

- Locales: `en`, `ar`. Default locale `ar` (regional primary audience), browser-preference override on first visit, persisted in cookie (FR-032).
- `hreflang`/alternate links emitted per page via Metadata API `alternates.languages` (FR-033).
- Register / Login / Book Appointment CTAs are external handoffs to the platform app (`NEXT_PUBLIC_APP_URL/register|login|book`) with locale + UTM params (FR-029/FR-030).

## Folder Structure

```text
src/
├── app/
│   ├── [locale]/
│   │   ├── layout.tsx              # Locale layout: html lang/dir, fonts, Navbar/Footer, providers
│   │   ├── page.tsx                # Home
│   │   ├── about/page.tsx
│   │   ├── services/page.tsx
│   │   ├── doctors/
│   │   │   ├── page.tsx            # Listing + filters (searchParams-driven)
│   │   │   └── [slug]/page.tsx     # Doctor profile + generateMetadata + JSON-LD
│   │   ├── ai-assistant/page.tsx
│   │   ├── how-it-works/page.tsx
│   │   ├── pricing/page.tsx        # Renders only when flag enabled
│   │   ├── testimonials/page.tsx
│   │   ├── faq/page.tsx
│   │   ├── blog/
│   │   │   ├── page.tsx            # Listing + pagination + category/tag filter
│   │   │   └── [slug]/page.tsx     # Post + generateMetadata + Article JSON-LD
│   │   ├── contact/page.tsx
│   │   ├── privacy-policy/page.tsx
│   │   ├── terms/page.tsx
│   │   ├── search/page.tsx
│   │   └── not-found.tsx
│   ├── api/
│   │   ├── contact/route.ts
│   │   ├── newsletter/route.ts
│   │   ├── search/route.ts
│   │   └── revalidate/route.ts
│   ├── sitemap.ts
│   ├── robots.ts
│   ├── manifest.ts
│   └── layout.tsx                  # Root: analytics scripts, global CSS
├── components/
│   ├── ui/                         # shadcn/ui primitives (button, card, accordion, …)
│   ├── layout/                     # navbar, footer, locale-switcher, mobile-nav
│   ├── sections/                   # hero, feature-cards, statistics, testimonials,
│   │                               # cta-section, newsletter, faq-accordion, how-it-works-steps
│   ├── doctors/                    # doctor-card, search-filters, doctor-grid, availability-badge
│   ├── blog/                       # post-card, post-grid, pagination, category-chips, share-buttons
│   ├── forms/                      # contact-form, newsletter-form (RHF + Zod)
│   └── seo/                        # json-ld.tsx (typed Schema.org serializers)
├── content/                        # Content-provider layer (CMS contract, FR-044)
│   ├── provider.ts                 # ContentProvider interface
│   ├── db-provider.ts              # Prisma-backed implementation (v1)
│   └── types.ts                    # Content DTOs (decoupled from Prisma types)
├── lib/
│   ├── prisma.ts                   # Prisma client singleton
│   ├── seo.ts                      # buildMetadata() helper (title/desc/canonical/OG/Twitter)
│   ├── analytics.ts                # trackEvent() wrapper, consent-aware
│   ├── flags.ts                    # feature flags (pricing)
│   └── utils.ts
├── i18n/
│   ├── routing.ts                  # next-intl locale config
│   ├── request.ts
│   └── messages/{en,ar}.json       # UI strings (content lives in DB)
├── styles/globals.css
└── middleware.ts                   # next-intl locale negotiation

prisma/
├── schema.prisma
├── migrations/
└── seed.ts

tests/
├── e2e/                            # Playwright: journeys, RTL, a11y (axe), SEO tags
└── unit/                           # Vitest: seo helpers, providers, validation

public/
├── images/                         # brand, OG fallback image
└── fonts/                          # self-hosted subsets (Latin + Arabic)
```

**Structure Decision**: Single Next.js app. No separate backend — read-heavy public content is served by RSC + Prisma; the only mutations (contact, newsletter) are Route Handlers. The `src/content` provider layer is the one seam reserved for the future CMS swap.

## Component Architecture

- **Server Components by default.** Pages, sections, doctor/blog grids, and JSON-LD render on the server. Client Components (`"use client"`) only where interactivity demands: `search-filters`, `faq-accordion`, `contact-form`, `newsletter-form`, `mobile-nav`, `locale-switcher`, motion wrappers.
- **shadcn/ui as the primitive layer** (Button, Card, Accordion, Input, Select, Sheet, NavigationMenu, Skeleton). Radix gives keyboard/focus/ARIA behavior needed for WCAG AA out of the box. Tokens configured for the Hakeem design system (teal/medical-blue palette, soft glassmorphism surfaces).
- **Section components are locale-agnostic**: they receive translated strings and content DTOs as props; no data fetching inside presentational components.
- **Framer Motion policy**: entrance/scroll animations wrapped in a `MotionSection` client wrapper honoring `prefers-reduced-motion`; no motion on LCP-critical hero content (transform/opacity only, no layout-shifting animation).
- **Forms**: React Hook Form + Zod schema shared between client validation and Route Handler server validation (single source of truth per FR-031/FR-047).
- **Reusable component inventory** (maps to Stitch component set): Navbar, Hero Section, Feature Cards, Statistics, Doctor Cards, Search Filters, Testimonials, FAQ Accordion, CTA Sections, Newsletter, Contact Form, Footer.

## Layout Strategy

- **Root layout**: fonts, analytics, global CSS only.
- **`[locale]/layout.tsx`**: sets `<html lang dir>` (`dir="rtl"` for `ar`), loads `next-intl` provider, renders Navbar + Footer (persistent Register/Login/Book CTAs per FR-002), skip-to-content link.
- **RTL**: Tailwind **logical properties** (`ms-*`, `me-*`, `ps-*`, `text-start`) everywhere — no `ltr:`/`rtl:` fork duplication. Directional icons (chevrons, arrows) flip via `rtl:rotate-180` utility. Carousels/steppers reverse order in RTL.
- **Responsive**: mobile-first breakpoints (`sm 640 / md 768 / lg 1024 / xl 1280`); nav collapses to Sheet-based mobile menu below `lg`; doctor/blog grids 1 → 2 → 3/4 columns.
- **Fonts**: `next/font/local` — Latin (e.g., Inter) + Arabic (e.g., IBM Plex Sans Arabic) subsets, `display: swap`, preloaded per locale (FR-050).

## SEO Architecture

- **Rendering for crawlability**: all indexable pages are server-rendered (SSG/ISR) — full HTML, no client-side content gaps.
- **Central helper**: `lib/seo.ts#buildMetadata({ page, locale, entity? })` produces title, description, canonical, `alternates.languages` (en/ar + `x-default`), OpenGraph, Twitter, robots — one code path so the metadata contract survives a CMS swap (FR-034, FR-044).
- **Canonicals are locale-specific**; alternates cross-link language variants (FR-033).
- **Sitemap** (`app/sitemap.ts`): queries published doctors + posts + static routes for both locales; excludes unpublished/disabled entities (FR-035, SC-015). Regenerated with ISR-aligned revalidation.
- **Robots** (`app/robots.ts`): allow public paths; disallow `/api/`, empty-search states; reference sitemap (FR-036).
- **Structured data** (`components/seo/json-ld.tsx`, typed serializers, rendered in RSC):
  - Home → `Organization` + `WebSite` (with `SearchAction`)
  - Doctor Profile → `Physician` (name, specialty, availableLanguage, image)
  - Blog Details → `BlogPosting` (headline, dates, author, image)
  - FAQ → `FAQPage`; Contact → `ContactPage`; hierarchical pages → `BreadcrumbList` (FR-037)
- **Index control**: `noindex` for empty search results, disabled pricing, unpublished entities (FR-040).

## Metadata API Usage

- Static pages: `export const metadata` via `buildMetadata` (localized).
- Dynamic pages: `generateMetadata({ params })` fetches entity (deduped by React `cache()` with the page query), returns unique title/description/canonical/OG image (FR-023, FR-027).
- OG images: doctor photo / post cover when present, else brand fallback `public/images/og-default.png` (spec assumption). Optional later: `next/og` generated images — not required for v1.
- `metadataBase` set from `NEXT_PUBLIC_SITE_URL`.

## Dynamic Routes

| Route | Strategy | Revalidation |
|---|---|---|
| `doctors/[slug]` | `generateStaticParams` for published doctors + `dynamicParams: true` for new ones | ISR 300 s + on-demand tag `doctor:{slug}` |
| `blog/[slug]` | Same pattern for published posts | ISR 300 s + tag `post:{slug}` (meets SC-005 ≤ 5 min) |
| `doctors` listing | Dynamic rendering (searchParams: filters/pagination); base data cached | `unstable_cache` tag `doctors` |
| `blog` listing | ISR per page/category | tag `posts` |
| `search` | Fully dynamic, `noindex` | — |

- Slugs: stable, human-readable, locale-invariant (`dr-ahmed-hassan`, post slug from title at publish time); slug changes create redirects — public URLs are a contract (FR-022, FR-044).
- Unknown/unpublished slug → `notFound()` → localized 404 (FR-028), excluded from sitemap.

## Doctor Pages

- **Find Doctors** (`/doctors`): URL-driven filter state (`?specialty=&q=&lang=&gender=&availability=&page=`) so results are shareable/back-navigable. Filters render only when the attribute exists in data (spec assumption); result count + clear-all (FR-041). Server-filtered via Prisma; pagination (12/page). Empty state with guidance (US2-S5).
- **Doctor Profile** (`/doctors/[slug]`): hero (photo, name, specialty, credentials/trust badges), bio, languages spoken, availability cue, prominent Book Appointment CTA + Register/Login. `Physician` JSON-LD, unique metadata, share image. Related doctors (same specialty) optional below the fold.
- Data via `ContentProvider.getDoctor(slug, locale)` — localized text fields resolved by provider.

## Blog Pages

- **Listing** (`/blog`): paginated grid (title, summary, cover, date, category chips), category/tag filter, empty state (FR-042/FR-043).
- **Details** (`/blog/[slug]`): cover, title, author attribution, published/updated dates, rich body (portable structured content stored as sanitized HTML/JSON in DB — renderable regardless of future CMS), share buttons, related posts, newsletter CTA. `BlogPosting` JSON-LD + full share metadata.
- Publish workflow: `status` field (`DRAFT | PUBLISHED | ARCHIVED`); only `PUBLISHED` appears publicly and in sitemap; unpublish removes within revalidation window.

## Performance Optimization

- Static/ISR-first: marketing pages SSG at build; doctor/blog ISR; only search + filtered listings dynamic.
- RSC-first minimizes client JS; client islands are small and code-split (`next/dynamic` for below-the-fold interactive sections).
- Hero/LCP image: `priority` + `fetchpriority=high`, no motion-delayed reveal.
- Fonts self-hosted, subset, `swap` (no FOIT — SC-012/US8-S5).
- Skeletons via `loading.tsx` for doctor/blog routes; `Suspense` boundaries around list fetches.
- Budgets enforced in CI (Lighthouse CI): LCP ≤ 2.5 s, CLS ≤ 0.1, INP ≤ 200 ms, per-route JS budget on Home/Doctors/Blog.
- Third-party scripts: analytics only, loaded `afterInteractive`/consent-gated.

## Image Strategy

- `next/image` everywhere: AVIF/WebP negotiation, responsive `sizes`, intrinsic dimensions (CLS-safe), lazy-load below the fold (FR-049).
- Doctor photos & blog covers stored as remote URLs (object storage/CDN), `remotePatterns` allow-listed.
- Meaningful localized `alt` text required at the DTO level (a11y + SEO).
- OG images 1200×630; brand fallback shipped in `public/`.

## Caching Strategy

| Layer | Mechanism |
|---|---|
| Page HTML | SSG (static pages) / ISR 300 s (doctor & blog details/listings) |
| Data | `unstable_cache` with tags: `doctors`, `doctor:{slug}`, `posts`, `post:{slug}`, `faq`, `testimonials`, `services` |
| Invalidation | `POST /api/revalidate` (secret header) → `revalidateTag()`; called by admin/CMS webhook on publish/unpublish — meets SC-005 without waiting for ISR window |
| DB | Neon serverless driver + connection pooling; Prisma query-level `cache()` dedupe per request |
| Assets | Immutable hashed static assets via CDN defaults |

## API Requirements

All boundary inputs validated with Zod; errors localized.

| Endpoint | Method | Purpose | Notes |
|---|---|---|---|
| `/api/contact` | POST | Contact inquiry (FR-031) | Required: name, email, topic, message; optional phone. Spam: honeypot + time-trap + IP rate limit (no CAPTCHA that blocks AT). Persists `ContactInquiry` + notifies ops inbox (email provider). |
| `/api/newsletter` | POST | Newsletter signup (FR-047) | Email validation, dedupe, `PENDING → CONFIRMED` double-opt-in when provider supports; disclosure link. |
| `/api/search` | GET | Global search (FR-045/046) | `?q=&locale=` → typed results `{doctors[], posts[]}`; Postgres full-text (tsvector, `simple` config for Arabic + English); debounced client. |
| `/api/revalidate` | POST | On-demand cache invalidation | `x-revalidate-secret` header; body `{tags: string[]}`. CMS-webhook compatible. |

Reads (pages) don't go through API routes — RSC queries the content provider directly.

## Analytics

- **Tooling**: Vercel Analytics (CWV/pageviews) + PostHog (product events) — both consent-aware; PostHog EU hosting for privacy posture.
- **Consent**: lightweight banner; analytics events gated on consent where required (FR-048); essential ops measurement only otherwise.
- **Event schema** (`lib/analytics.ts#trackEvent`): `cta_register_click`, `cta_login_click`, `cta_book_click` (with `page` prop), `search_performed` (`query_length`, `result_count`), `doctor_filter_applied`, `contact_submit_success|failure`, `newsletter_signup`, `language_switched`. Covers SC-018 verification set.
- No PII in event payloads; no PHI anywhere on the public surface.

## Future CMS Integration

- **Seam**: `src/content/provider.ts` — `ContentProvider` interface (`getPage`, `listDoctors`, `getDoctor`, `listPosts`, `getPost`, `getFaqs`, `getTestimonials`, `getServices`, `getLegalDocument`). v1 ships `DbContentProvider` (Prisma). CMS phase adds `CmsContentProvider` behind the same interface — pages/components/SEO untouched (FR-044).
- **Stability guarantees**: slugs and URL shapes never derived from storage internals; metadata built from DTO fields; `/api/revalidate` already speaks webhook.
- **Migration path**: content tables mirror common headless-CMS shapes (localized field pairs, status enum, timestamps) so an export/import to Sanity/Strapi/Payload is mechanical.

## Complexity Tracking

No constitution violations to justify. One deliberate abstraction (ContentProvider) is spec-mandated (FR-044).

## Generated Artifacts (Phase 0–1)

- [research.md](./research.md) — decisions & rationale
- [data-model.md](./data-model.md) — Prisma-level entity model
- [contracts/api.md](./contracts/api.md) — HTTP contracts
- [contracts/content-provider.md](./contracts/content-provider.md) — CMS-ready content contract
- [contracts/seo.md](./contracts/seo.md) — metadata/JSON-LD/sitemap contracts
- [quickstart.md](./quickstart.md) — setup & validation guide
