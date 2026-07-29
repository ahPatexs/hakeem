# Research: Hakeem Public Website

**Date**: 2026-07-28 | **Plan**: [plan.md](./plan.md)

All Technical Context unknowns resolved. Stack was user-mandated (Next.js 15, App Router, TypeScript strict, Tailwind, shadcn/ui, Framer Motion, Prisma, Neon PostgreSQL); research below covers the open decisions inside that stack.

## D1. Internationalization library

- **Decision**: `next-intl` with `[locale]` segment routing, `ar` default, cookie persistence.
- **Rationale**: First-class App Router + RSC support, Metadata API integration, typed messages, built-in locale negotiation middleware. Matches FR-006/FR-032/FR-033 with minimal custom code.
- **Alternatives considered**: `next-i18next` (Pages-Router era, poor RSC fit); custom middleware + JSON dictionaries (reinvents negotiation, alternates, pluralization); `paraglide` (attractive but weaker Next 15 Metadata integration).

## D2. RTL implementation approach

- **Decision**: Tailwind logical properties (`ms/me/ps/pe/text-start/text-end`) + `dir` attribute at `<html>`; icon flips via `rtl:` variant only where visually directional.
- **Rationale**: Single style codepath for both directions; avoids drift between LTR/RTL forks; Tailwind 3.3+ supports logical utilities natively.
- **Alternatives considered**: `tailwindcss-rtl` plugin (obsolete for 3.3+); duplicate `rtl:` classes everywhere (2× maintenance); CSS-only `[dir=rtl]` overrides (scattered, hard to audit).

## D3. Database access pattern from Next.js on Vercel/Neon

- **Decision**: Prisma with Neon serverless driver adapter (`@prisma/adapter-neon`) and connection pooling via Neon's pooled connection string.
- **Rationale**: Serverless functions + Postgres need pooling; Neon's pooler + adapter avoids connection exhaustion; keeps Prisma DX (schema, migrations, types).
- **Alternatives considered**: Prisma Accelerate (extra paid layer, not needed at this scale); Drizzle (fine ORM but user mandated Prisma); raw `pg` (loses schema/migration tooling).

## D4. Blog body storage format

- **Decision**: Sanitized rich-text stored as structured JSON (TipTap/ProseMirror-compatible doc) with server-side HTML rendering; summary/plain-text derived at write time.
- **Rationale**: Portable to any headless CMS (portable-text-like), safely renderable in RSC, searchable via derived plain text; avoids raw-HTML XSS surface.
- **Alternatives considered**: Markdown (fine but weaker CMS parity for embeds); raw HTML (XSS risk, migration pain); MDX files in repo (violates FR-026 dynamic publishing without redeploy).

## D5. Site search implementation

- **Decision**: Postgres full-text search — generated `tsvector` columns (`simple` config to handle Arabic + English tokens) over doctor names/specialties and post titles/summaries/plain-text, combined with `pg_trgm` for name typo-tolerance.
- **Rationale**: Zero extra infrastructure, adequate at directory scale (≤ low thousands), serves SC-017 fixture accuracy; typed grouped results per FR-046.
- **Alternatives considered**: Algolia/Meilisearch/Typesense (better relevance but new infra + sync pipeline — premature); `LIKE` queries (no ranking, poor Arabic behavior).

## D6. Analytics stack

- **Decision**: Vercel Analytics (Web Vitals + pageviews) + PostHog (custom events, EU cloud), consent-gated via a lightweight first-party banner; `trackEvent` wrapper no-ops without consent.
- **Rationale**: Covers FR-048 event list and SC-018 verifiability; PostHog supports cookieless/consent modes; Vercel Analytics is zero-config for CWV monitoring.
- **Alternatives considered**: GA4 (consent/regulatory friction, data residency concerns for healthcare adjacency); Plausible (privacy-great but weak custom event funnels); self-hosted PostHog (ops burden).

## D7. Contact spam protection

- **Decision**: Layered, CAPTCHA-free: honeypot field + minimum-fill-time trap + per-IP rate limiting (Upstash Ratelimit or equivalent) + server-side Zod validation.
- **Rationale**: Spec assumption forbids blocking assistive technologies; CAPTCHAs are the main AT blocker. Layered heuristics are effective for a marketing contact form.
- **Alternatives considered**: reCAPTCHA/hCaptcha (a11y risk, consent implications); Turnstile (better but still third-party script weight); email-verification loop for contact (excess friction).

## D8. Newsletter provider integration

- **Decision**: Provider-agnostic `NewsletterService` interface; v1 stores subscription in Postgres and forwards to provider (Resend Audiences or Mailchimp) with double-opt-in when the provider supports it; `PENDING/CONFIRMED/UNSUBSCRIBED` states locally.
- **Rationale**: FR-047 + spec assumption (double-opt-in preferred, single acceptable temporarily); local table keeps analytics/SC-016 verifiable regardless of provider.
- **Alternatives considered**: Provider-only (no local state → weak auditability); building own email confirmation flow entirely (unnecessary when providers ship it).

## D9. OG/social image strategy

- **Decision**: Static brand fallback (1200×630) + entity images (doctor photo, post cover) when present. `next/og` dynamic generation deferred.
- **Rationale**: Meets FR-038/FR-039 and spec's brand-fallback assumption with zero runtime cost; dynamic OG adds edge-function complexity without v1 payoff.
- **Alternatives considered**: `next/og` per-entity generated cards (nice-to-have, phase 2); no fallback (fails spec assumption).

## D10. Rendering & revalidation model

- **Decision**: SSG for static marketing pages; ISR (300 s) + tag-based on-demand revalidation for doctors/blog; dynamic rendering only for `search` and filtered doctor listing views.
- **Rationale**: SC-005 (≤ 5 min publish visibility) satisfied by ISR window alone and beaten by webhook revalidation; maximizes cache hit ratio for CWV goals.
- **Alternatives considered**: Full SSR (worse TTFB/cost); pure SSG with rebuilds (violates FR-026 no-redeploy publishing); PPR/`use cache` (Next 15 experimental — avoid for production launch).

## D11. Accessibility verification approach

- **Decision**: axe-core assertions inside Playwright e2e on the five SC-010 pages (both locales), manual keyboard/screen-reader pass pre-launch, WCAG 2.2 AA checklist in CI docs.
- **Rationale**: Automated axe catches ~40% of AA issues cheaply; manual pass covers focus order/reading order/RTL semantics that automation misses.
- **Alternatives considered**: Lighthouse a11y score only (too shallow); external audit only (needed eventually, but not a substitute for CI gates).

## D12. Testing & CI quality gates

- **Decision**: Vitest (seo helper, providers, Zod schemas) + Playwright (journeys US1–US9, RTL snapshot of nav, metadata/JSON-LD assertions, sitemap contents) + Lighthouse CI budgets on Home/Doctors/Doctor Profile/Blog Details.
- **Rationale**: Direct traceability from SC-001…SC-018 to automated checks; metadata/sitemap assertions guard the CMS contract regressions.
- **Alternatives considered**: Jest (Vitest is faster with ESM/TS); Cypress (Playwright has better multi-locale + a11y ergonomics).

## D13. Feature flag for Pricing

- **Decision**: Environment/DB-backed flag read server-side (`lib/flags.ts`); disabled → nav omits link, route returns friendly coming-soon with `noindex`, sitemap excludes.
- **Rationale**: FR-016/SC-011 require toggling without structural change; server-side flag avoids client flash.
- **Alternatives considered**: Build-time env only (requires redeploy to toggle — acceptable fallback); third-party flag service (overkill).
