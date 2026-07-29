# Quickstart: Hakeem Public Website

**Date**: 2026-07-28 | **Plan**: [plan.md](./plan.md)

Validation/run guide — proves the feature works end-to-end. Implementation details live in `tasks.md`.

## Prerequisites

- Node.js 20 LTS, pnpm ≥ 9
- Neon PostgreSQL project (pooled connection string)
- `.env.local`:

```bash
DATABASE_URL="postgresql://...-pooler.neon.tech/hakeem?sslmode=require"
DIRECT_URL="postgresql://...neon.tech/hakeem?sslmode=require"   # migrations
NEXT_PUBLIC_SITE_URL="http://localhost:3000"
NEXT_PUBLIC_APP_URL="https://app.hakeem.example"                # CTA handoff target
REVALIDATE_SECRET="<random-32-chars>"
CONTACT_NOTIFY_EMAIL="ops@hakeem.example"
RESEND_API_KEY="..."                                            # or provider equivalent
NEXT_PUBLIC_POSTHOG_KEY="..."                                   # optional in dev
```

## Setup

```bash
pnpm install
pnpm prisma migrate dev        # apply schema (see data-model.md)
pnpm prisma db seed            # seed: 2 specialties, 4 doctors, 3 posts, faqs, services, testimonials, legal docs
pnpm dev                       # http://localhost:3000 → redirects to /ar (default locale)
```

## Validation scenarios

### 1. Locale & RTL (US8, FR-006, SC-008)

- Open `/` → lands on `/ar`, `<html lang="ar" dir="rtl">`, nav mirrored.
- Switch to English via locale switcher → `/en`, `dir="ltr"`, same page preserved.
- View source on both: `link rel="alternate" hreflang` for en/ar/x-default.

### 2. Home value prop & CTAs (US1, SC-001, SC-003)

- `/en`: hero + sections cover all 7 themes; header shows Register / Login / Book Appointment.
- Click each CTA → navigates to `NEXT_PUBLIC_APP_URL` with `lang` + UTM params.

### 3. Doctor discovery (US2, FR-025/041)

- `/en/doctors`: seeded doctors listed with count. Apply specialty filter + keyword → URL updates (`?specialty=cardiology&q=ah`), results narrow, Clear all resets.
- Search gibberish → empty state with recovery links.
- Open a doctor → profile with credentials, availability, Book CTA carrying `doctor={slug}`.

### 4. SEO surface (SC-004/014/015, contracts/seo.md)

```bash
curl -s localhost:3000/en/doctors/dr-ahmed-hassan | grep -E 'og:title|application/ld\+json|canonical'
curl -s localhost:3000/sitemap.xml | grep -c '<loc>'     # static×2 + doctors×2 + posts×2
curl -s localhost:3000/robots.txt                        # Disallow /api/, Sitemap line
```

- JSON-LD on doctor page parses as `Physician`; blog details as `BlogPosting`; FAQ as `FAQPage`.

### 5. Blog dynamics (US6, SC-005)

- `/en/blog` lists seeded posts; open details → author, dates, share metadata.
- Flip a post to PUBLISHED in DB, then:

```bash
curl -X POST localhost:3000/api/revalidate -H "x-revalidate-secret: $REVALIDATE_SECRET" \
  -H "content-type: application/json" -d '{"tags":["posts","sitemap"]}'
```

- New post visible on listing + in sitemap immediately (≤ 5 min even without the webhook).

### 6. Contact & newsletter (US7, FR-031/047, SC-006/016)

- Submit incomplete contact form → inline localized validation, no request accepted.
- Valid submission → confirmation < 5 s; row in `ContactInquiry`; ops email sent (or logged in dev).
- Newsletter with valid email → confirmation state; duplicate submit → friendly idempotent response.

### 7. Global search (US9, SC-017)

- `/en/search?q=cardio` → doctor group + article group labeled; `/api/search?q=zzzz&locale=en` → empty arrays, UI shows recovery links.

### 8. Pricing flag (FR-016, SC-011)

- With `pricing.enabled=false` (SiteSetting): nav omits Pricing; `/en/pricing` → coming-soon + `noindex`; sitemap excludes it.
- Enable + seed a plan → nav shows Pricing, page renders plans + CTAs.

### 9. Accessibility & performance gates (SC-009/010/012)

```bash
pnpm test:e2e          # Playwright: journeys + axe checks on Home, Doctors, Profile, Blog Details, Contact (en + ar)
pnpm lighthouse:ci     # budgets: LCP ≤ 2.5s, CLS ≤ 0.1 on key pages (mobile profile)
```

- Manual: keyboard-only Home → Find Doctors → Doctor Profile → Book CTA; visible focus ring throughout.

### 10. Analytics events (SC-018)

- With consent accepted in staging: click Register CTA, run a search, submit contact, subscribe → 4 events visible in PostHog live view (`cta_register_click`, `search_performed`, `contact_submit_success`, `newsletter_signup`).

## Expected outcome

All 10 scenarios pass → feature satisfies its success criteria surface; proceed to `/speckit-tasks`.
