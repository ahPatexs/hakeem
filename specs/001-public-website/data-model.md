# Data Model: Hakeem Public Website

**Date**: 2026-07-28 | **Plan**: [plan.md](./plan.md)

Prisma → Neon PostgreSQL. Localization pattern: paired columns (`nameEn` / `nameAr`) — simple, indexable, CMS-exportable. The public site only reads `PUBLISHED` content; write/admin surfaces are out of scope (spec assumption).

## Enums

```text
PublishStatus     = DRAFT | PUBLISHED | ARCHIVED
Gender            = MALE | FEMALE
InquiryStatus     = NEW | IN_PROGRESS | RESOLVED | SPAM
SubscriptionState = PENDING | CONFIRMED | UNSUBSCRIBED
Locale            = EN | AR
```

## Entities

### Doctor

Public clinician profile (FR-012/013/022–025, US2).

| Field | Type | Notes |
|---|---|---|
| id | String (cuid) | PK |
| slug | String | **Unique**, stable, locale-invariant; URL contract |
| status | PublishStatus | Only PUBLISHED is public / in sitemap |
| nameEn / nameAr | String | |
| titleEn / titleAr | String? | e.g., "Consultant Cardiologist" |
| bioEn / bioAr | Text? | |
| photoUrl | String? | CDN URL; brand fallback if absent |
| photoAltEn / photoAltAr | String? | a11y (FR-049) |
| gender | Gender? | Filter facet (renders only if populated) |
| languages | String[] | ISO codes spoken (filter facet) |
| yearsExperience | Int? | Trust signal |
| credentialsEn / credentialsAr | String[] | Trust badges |
| isAvailable | Boolean | Availability cue / filter |
| metaDescEn / metaDescAr | String? | SEO override; else derived from bio |
| specialtyId | FK → Specialty | Required |
| searchVector | tsvector (generated) | names + specialty; GIN index |
| createdAt / updatedAt / publishedAt | DateTime | `updatedAt` feeds sitemap lastmod |

Indexes: `slug` unique; `(status, specialtyId)`; `(status, isAvailable)`; GIN on `searchVector`; trigram on names.

### Specialty

| Field | Type | Notes |
|---|---|---|
| id | String | PK |
| slug | String | Unique (filter param value) |
| nameEn / nameAr | String | |
| sortOrder | Int | |

Relation: 1 Specialty → N Doctors.

### BlogPost

Dynamic article (FR-019/026–028/042/043, US6).

| Field | Type | Notes |
|---|---|---|
| id | String | PK |
| slug | String | **Unique**, stable |
| status | PublishStatus | |
| titleEn / titleAr | String | |
| summaryEn / summaryAr | String | Listing + meta description |
| bodyEn / bodyAr | Json | Structured rich-text doc (D4) |
| bodyPlainEn / bodyPlainAr | Text | Derived; feeds search vector |
| coverUrl | String? | OG + listing image |
| coverAltEn / coverAltAr | String? | |
| authorId | FK → Author | Required (FR-042) |
| publishedAt / updatedAt / createdAt | DateTime | publishedAt drives ordering + JSON-LD |
| searchVector | tsvector (generated) | titles + summaries + plain body; GIN |

Relations: N–M with Category and Tag. Indexes: `slug` unique; `(status, publishedAt desc)`; GIN on `searchVector`.

### Author

| Field | Type | Notes |
|---|---|---|
| id | String | PK |
| nameEn / nameAr | String | |
| roleEn / roleAr | String? | e.g., "Medical Reviewer" |
| avatarUrl | String? | |

### Category / Tag

Both: `id`, `slug` (unique), `nameEn`, `nameAr`, `sortOrder`. N–M with BlogPost via implicit join tables.

### Service

Our Services + Home feature cards (FR-011).

| Field | Type |
|---|---|
| id, slug (unique), status | |
| nameEn / nameAr, descriptionEn / descriptionAr | |
| iconKey | String (maps to icon component) |
| sortOrder | Int |

### Testimonial (FR-017)

| Field | Type | Notes |
|---|---|---|
| id, status | | Curated/approved only |
| authorNameEn / authorNameAr | String | Persona-safe attribution |
| contextEn / contextAr | String? | e.g., "Video consultation patient" |
| quoteEn / quoteAr | Text | |
| rating | Int? | 1–5 optional |
| sortOrder | Int | |

### FaqItem (FR-018, FAQPage JSON-LD)

| Field | Type |
|---|---|
| id, status, sortOrder | |
| questionEn / questionAr, answerEn / answerAr | |
| categoryEn / categoryAr | String? (grouping) |

### PricingPlan *(optional feature, FR-016)*

`id, status, nameEn/Ar, descriptionEn/Ar, priceLabelEn/Ar (display string — no currency math), featuresEn/Ar (String[]), isHighlighted, sortOrder`. Page renders only when flag enabled **and** ≥1 PUBLISHED plan.

### LegalDocument (FR-021)

| Field | Type | Notes |
|---|---|---|
| id | String | PK |
| kind | String enum: `PRIVACY_POLICY` \| `TERMS` | Unique per kind |
| titleEn / titleAr | String | |
| bodyEn / bodyAr | Json | Same rich-text doc format |
| effectiveDate | DateTime | Displayed on page |
| updatedAt | DateTime | |

### ContactInquiry (FR-031)

| Field | Type | Notes |
|---|---|---|
| id | String | PK |
| name | String | Required |
| email | String | Required, validated |
| phone | String? | Optional |
| topic | String | Required category |
| message | Text | Required |
| locale | Locale | Language of submission |
| status | InquiryStatus | Ops workflow |
| ipHash | String? | Rate-limit/spam forensics — hashed, never raw IP |
| createdAt | DateTime | |

Retention: operational data, not medical; standard business retention (spec: industry default).

### NewsletterSubscription (FR-047)

| Field | Type | Notes |
|---|---|---|
| id | String | PK |
| email | String | **Unique** |
| state | SubscriptionState | PENDING → CONFIRMED (double-opt-in) |
| locale | Locale | For localized emails |
| confirmedAt / unsubscribedAt | DateTime? | |
| providerId | String? | External provider record ref |
| createdAt | DateTime | |

### SiteSetting

Key-value for flags/config readable server-side: `key (unique), value (Json), updatedAt`. Keys: `pricing.enabled`, `newsletter.doubleOptIn`, `analytics.enabled`.

## Relationships summary

```text
Specialty 1──N Doctor
Author    1──N BlogPost
BlogPost  N──M Category
BlogPost  N──M Tag
(all other entities standalone)
```

## Validation rules (Zod, boundary-enforced)

- ContactInquiry: name 2–100 chars; email RFC-valid; topic ∈ configured list; message 10–5000 chars; phone optional E.164-ish; honeypot must be empty; fill time ≥ 3 s.
- Newsletter: valid email; dedupe on unique constraint → idempotent friendly response (no subscriber enumeration).
- Search: `q` 1–100 chars, trimmed; locale ∈ {en, ar}.
- Slugs: `^[a-z0-9]+(?:-[a-z0-9]+)*$`, max 120.

## State transitions

- PublishStatus: `DRAFT → PUBLISHED → ARCHIVED` (and `PUBLISHED → DRAFT` for unpublish). Transitions happen in admin/CMS (out of scope); public site + sitemap react via revalidation tags.
- SubscriptionState: `PENDING → CONFIRMED` (email confirm), `ANY → UNSUBSCRIBED` (unsubscribe link).
- InquiryStatus: ops-managed; `SPAM` excluded from ops notifications.

## Sitemap derivation (SC-015)

`sitemap.xml` = static routes (× 2 locales) ∪ PUBLISHED doctors ∪ PUBLISHED posts (× 2 locales), each with `lastModified = updatedAt`, `alternates.languages` cross-links. Excludes: DRAFT/ARCHIVED anything, disabled Pricing, `/search`.
