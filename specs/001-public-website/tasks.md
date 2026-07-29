# Tasks: Hakeem Public Website

**Input**: Design documents from `/specs/001-public-website/`  
**Prerequisites**: [plan.md](./plan.md), [spec.md](./spec.md), [research.md](./research.md), [data-model.md](./data-model.md), [contracts/](./contracts/), [quickstart.md](./quickstart.md), [design/](./design/)  
**Tests**: Included â€” user requested Responsive, Accessibility, Lighthouse, and SEO validation (Definition of Done).  
**Organization**: Dependency-ordered; user stories in priority order after a shared foundation (layout, theme, SEO helpers, content provider).

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies on incomplete tasks)
- **[Story]**: User story label (`US1`â€¦`US9`) for story-phase tasks only
- Exact file paths included in every task

## Path Conventions

Single Next.js app under `src/` (see plan.md). Prisma under `prisma/`. Tests under `tests/`.

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Initialize the Next.js 15 app, design tokens, tooling, and Stitch design reference wiring.

- [x] T001 Create Next.js 15 App Router TypeScript project scaffolding at repo root (`package.json`, `tsconfig.json` strict, `next.config.ts`, `src/app/`)
- [x] T002 [P] Install and configure Tailwind CSS + PostCSS in `tailwind.config.ts` and `src/styles/globals.css` with Hakeem design tokens (teal `#0D9488`, navy `#0F2137`, mint `#F0FDFA`, amber `#F59E0B`, glassmorphism utilities)
- [x] T003 [P] Initialize shadcn/ui and add base primitives (`button`, `card`, `input`, `textarea`, `select`, `accordion`, `sheet`, `navigation-menu`, `badge`, `skeleton`) under `src/components/ui/`
- [x] T004 [P] Install Framer Motion, `next-intl`, Prisma, Zod, React Hook Form, `@hookform/resolvers` per plan.md and pin versions in `package.json`
- [x] T005 [P] Configure ESLint + Prettier (+ `eslint-config-next`) in `.eslintrc.*` / `.prettierrc`
- [x] T006 Create folder structure from plan.md (`src/components/{layout,sections,doctors,blog,forms,seo}`, `src/content/`, `src/lib/`, `src/i18n/`, `tests/{e2e,unit}`, `public/{images,fonts}`)
- [x] T007 [P] Copy Stitch design references into `specs/001-public-website/design/` (existing screens + `stitch-landing/`) and document primary Home visual source in `specs/001-public-website/design/README.md`
- [x] T008 [P] Add `.env.example` with `DATABASE_URL`, `DIRECT_URL`, `NEXT_PUBLIC_SITE_URL`, `NEXT_PUBLIC_APP_URL`, `REVALIDATE_SECRET`, contact/newsletter/analytics keys per quickstart.md

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Public layout, navigation, footer, theme, i18n/RTL, Prisma, content provider, SEO helpers, and shared reusable components. **No user story page work until this phase completes.**

**âš ï¸ CRITICAL**: Blocks all user stories.

### Data & content layer

- [x] T009 Define Prisma schema for all entities in `prisma/schema.prisma` per data-model.md (Doctor, Specialty, BlogPost, Author, Category, Tag, Service, Testimonial, FaqItem, PricingPlan, LegalDocument, ContactInquiry, NewsletterSubscription, SiteSetting)
- [x] T010 Create and apply initial migration + Neon adapter wiring in `prisma/migrations/` and `src/lib/prisma.ts`
- [x] T011 [P] Implement seed script in `prisma/seed.ts` (specialties, doctors, posts, services, FAQs, testimonials, legal docs)
- [x] T012 [P] Define ContentProvider interface and DTOs in `src/content/provider.ts` and `src/content/types.ts` per contracts/content-provider.md
- [x] T013 Implement `DbContentProvider` in `src/content/db-provider.ts` with published-only filtering and locale field resolution

### Theme, i18n, layout foundation

- [x] T014 [P] Configure `next-intl` routing (`en`/`ar`, default `ar`) in `src/i18n/routing.ts`, `src/i18n/request.ts`, and `src/middleware.ts`
- [x] T015 [P] Create message catalogs in `src/i18n/messages/en.json` and `src/i18n/messages/ar.json` for nav, footer, CTAs, forms, empty states
- [x] T016 [P] Configure self-hosted fonts (Latin + Arabic) via `next/font/local` in `src/app/[locale]/layout.tsx` with `display: swap`
- [x] T017 Implement root layout in `src/app/layout.tsx` (global CSS, analytics shell) and locale layout in `src/app/[locale]/layout.tsx` (`lang`/`dir`, skip-to-content, Navbar, Footer)
- [x] T018 [P] Implement Navbar with Register/Login/Book CTAs + locale switcher + mobile Sheet nav in `src/components/layout/navbar.tsx` and `src/components/layout/mobile-nav.tsx` matching Stitch designs
- [x] T019 [P] Implement Footer (link columns, legal links, newsletter slot) in `src/components/layout/footer.tsx`
- [x] T020 [P] Implement locale switcher preserving path in `src/components/layout/locale-switcher.tsx`
- [x] T021 [P] Implement CTA handoff helper (`NEXT_PUBLIC_APP_URL` + locale + UTM) in `src/lib/cta.ts`

### Shared reusable section components

- [x] T022 [P] Implement Hero section in `src/components/sections/hero.tsx` per Stitch Home/hero
- [x] T023 [P] Implement Feature Cards in `src/components/sections/feature-cards.tsx`
- [x] T024 [P] Implement Statistics band in `src/components/sections/statistics.tsx`
- [x] T025 [P] Implement CTA section in `src/components/sections/cta-section.tsx`
- [x] T026 [P] Implement Testimonials section in `src/components/sections/testimonials.tsx`
- [x] T027 [P] Implement FAQ Accordion in `src/components/sections/faq-accordion.tsx`
- [x] T028 [P] Implement Newsletter form UI in `src/components/forms/newsletter-form.tsx` (RHF + Zod; submit wired later in US7)
- [x] T029 [P] Implement Doctor Card in `src/components/doctors/doctor-card.tsx`
- [x] T030 [P] Implement Search Filters shell in `src/components/doctors/search-filters.tsx` (URL-driven wiring in US2)
- [x] T031 [P] Implement Contact Form UI in `src/components/forms/contact-form.tsx` (submit wired later in US7)
- [x] T032 [P] Implement Framer Motion `MotionSection` wrapper honoring `prefers-reduced-motion` in `src/components/sections/motion-section.tsx`

### SEO & caching foundation

- [x] T033 [P] Implement `buildMetadata()` helper (title, description, canonical, hreflang, OpenGraph, Twitter) in `src/lib/seo.ts` per contracts/seo.md
- [x] T034 [P] Implement JSON-LD serializers in `src/components/seo/json-ld.tsx` (Organization, WebSite, Physician, BlogPosting, FAQPage, BreadcrumbList, ContactPage)
- [x] T035 [P] Implement `app/robots.ts` and `app/sitemap.ts` stubs (static routes Ã— locales; dynamic entries filled in US2/US6)
- [x] T036 [P] Implement feature flags reader in `src/lib/flags.ts` (pricing.enabled from SiteSetting)
- [x] T037 [P] Implement consent-aware `trackEvent` wrapper in `src/lib/analytics.ts`
- [x] T038 Implement `POST /api/revalidate` secret-protected handler in `src/app/api/revalidate/route.ts` per contracts/api.md

**Checkpoint**: Foundation ready â€” theme, layout, nav, footer, content provider, SEO helpers, and reusable components exist; user stories can begin.

---

## Phase 3: User Story 1 â€” Discover Hakeem (Priority: P1) ðŸŽ¯ MVP

**Goal**: Homepage communicates Hakeemâ€™s telemedicine value and conversion CTAs without authentication.  
**Independent Test**: Open `/[locale]` as guest; verify all 7 value themes, Register/Login/Book CTAs, Organization/WebSite JSON-LD + OG/Twitter.  
**Design source**: `specs/001-public-website/design/d-home-1.png`, `m-home.png`, `t-home.png`, and `design/stitch-landing/`.

### Tests for User Story 1

- [x] T039 [P] [US1] Playwright smoke: Home EN/AR loads, hero + CTAs visible in `tests/e2e/home.spec.ts`
- [x] T040 [P] [US1] Unit test `buildMetadata` for Home in `tests/unit/seo-home.test.ts`

### Implementation for User Story 1

- [x] T041 [US1] Implement Home page in `src/app/[locale]/page.tsx` composing Hero, Feature Cards, Statistics, How-it-works preview, Featured Doctors, Testimonials, Blog preview, CTA, Newsletter â€” match Stitch Home accurately
- [x] T042 [P] [US1] Wire Home content fetches via ContentProvider (`getServices`, `getTestimonials`, featured doctors/posts) in `src/app/[locale]/page.tsx`
- [x] T043 [P] [US1] Emit Home metadata + Organization/WebSite JSON-LD (with SearchAction) on Home page
- [x] T044 [US1] Ensure Register/Login/Book CTAs use `src/lib/cta.ts` handoffs with UTM params from Home

**Checkpoint**: Homepage is a demoable MVP matching Stitch and convertible without auth.

---

## Phase 4: User Story 2 â€” Find Doctors & Doctor Profile (Priority: P1)

**Goal**: Browse/filter doctors and open SEO-ready doctor profiles with booking CTAs.  
**Independent Test**: Find Doctors filters + profile content, unique metadata, Physician JSON-LD, empty state.  
**Design source**: `design/d-doctors.png`, `m-doctors.png`, `t-doctors.png`, `d-doctor-profile-1.png`, `m-doctor-profile.png`, `t-doctor-profile.png`.

### Tests for User Story 2

- [ ] T045 [P] [US2] Playwright: filter doctors, open profile, assert title/JSON-LD in `tests/e2e/doctors.spec.ts`
- [ ] T046 [P] [US2] Unit test doctor query/filter helpers in `tests/unit/doctor-query.test.ts`

### Implementation for User Story 2

- [ ] T047 [P] [US2] Implement `listDoctors` / `getDoctor` / `listSpecialties` / `listDoctorSlugs` in `src/content/db-provider.ts`
- [ ] T048 [US2] Implement Find Doctors page with URL-driven filters (`specialty`, `q`, `lang`, `gender`, `availability`, `page`) in `src/app/[locale]/doctors/page.tsx`
- [ ] T049 [US2] Wire Search Filters + Doctor Grid + empty state in `src/components/doctors/search-filters.tsx` and `src/components/doctors/doctor-grid.tsx`
- [ ] T050 [US2] Implement Doctor Profile page with `generateStaticParams`, `generateMetadata`, Physician + BreadcrumbList JSON-LD in `src/app/[locale]/doctors/[slug]/page.tsx`
- [ ] T051 [P] [US2] Add doctor photo/`next/image` with localized alt and brand fallback in Doctor Profile/Card
- [ ] T052 [P] [US2] Extend `src/app/sitemap.ts` with published doctor URLs Ã— locales
- [ ] T053 [US2] Implement localized `not-found` for unpublished/missing doctors in `src/app/[locale]/not-found.tsx` (shared) and doctor route `notFound()` calls

**Checkpoint**: Doctor discovery + SEO profiles work independently.

---

## Phase 5: User Story 8 â€” Bilingual, Responsive, WCAG AA (Priority: P1)

**Goal**: EN/AR with correct LTR/RTL; usable on mobile/tablet/desktop; keyboard + screen-reader friendly on key pages.  
**Independent Test**: Primary journeys on small/large viewports in EN and AR; RTL for Arabic; axe on Home, Doctors, Profile, Blog Details, Contact; fonts/images load without FOIT/CLS issues.

> Note: i18n plumbing landed in Phase 2; this phase hardens RTL, a11y, and responsive polish across delivered pages and sets gates for later stories.

### Tests for User Story 8

- [ ] T054 [P] [US8] Playwright responsive matrix (mobile/tablet/desktop) for Home + Doctors in `tests/e2e/responsive.spec.ts`
- [ ] T055 [P] [US8] Playwright axe WCAG AA smoke on Home, Find Doctors, Doctor Profile (EN + AR) in `tests/e2e/a11y.spec.ts`
- [ ] T056 [P] [US8] Playwright RTL assertions (`dir="rtl"`, mirrored nav) in `tests/e2e/i18n-rtl.spec.ts`

### Implementation for User Story 8

- [ ] T057 [US8] Audit and fix Tailwind logical properties (`ms/me/ps/pe/text-start`) across `src/components/layout/*` and `src/components/sections/*`
- [ ] T058 [P] [US8] Add visible focus rings and skip-to-content target in `src/styles/globals.css` and locale layout
- [ ] T059 [P] [US8] Ensure icon direction flips (`rtl:rotate-180`) on chevrons/arrows in Navbar, pagination, and carousels
- [ ] T060 [US8] Verify keyboard focus order through Navbar CTAs and primary forms; fix any traps in Sheet mobile nav
- [ ] T061 [P] [US8] Add `loading.tsx` skeletons for doctors routes in `src/app/[locale]/doctors/loading.tsx`

**Checkpoint**: P1 bilingual/responsive/a11y bar met for delivered surfaces.

---

## Phase 6: User Story 3 â€” About, Services, How It Works (Priority: P2)

**Goal**: Educational trust pages with clear narrative and persistent CTAs.  
**Independent Test**: Navigate About, Services, How It Works; verify content + CTAs.  
**Design source**: `d-about.png`, `d-services.png`, `d-how-it-works.png` (+ mobile counterparts).

### Tests for User Story 3

- [ ] T062 [P] [US3] Playwright journey About â†’ Services â†’ How It Works in `tests/e2e/marketing-pages.spec.ts`

### Implementation for User Story 3

- [ ] T063 [P] [US3] Implement About page in `src/app/[locale]/about/page.tsx` matching Stitch About
- [ ] T064 [P] [US3] Implement Services page in `src/app/[locale]/services/page.tsx` using `getServices()` + Feature Cards
- [ ] T065 [P] [US3] Implement How It Works page + steps section in `src/app/[locale]/how-it-works/page.tsx` and `src/components/sections/how-it-works-steps.tsx`
- [ ] T066 [P] [US3] Add static metadata via `buildMetadata` for About/Services/How It Works

**Checkpoint**: Trust/education pages complete independently.

---

## Phase 7: User Story 4 â€” AI Medical Assistant (Priority: P2)

**Goal**: Educational AI Assistant page; full experience requires Register/Login.  
**Independent Test**: Open AI Assistant; verify benefits + auth-gated CTA to app.  
**Design source**: `d-ai-assistant.png`, `m-ai-assistant.png`.

### Tests for User Story 4

- [ ] T067 [P] [US4] Playwright: AI Assistant page CTAs and auth handoff in `tests/e2e/ai-assistant.spec.ts`

### Implementation for User Story 4

- [ ] T068 [US4] Implement AI Assistant page in `src/app/[locale]/ai-assistant/page.tsx` (chat mock UI presentational only; Register/Login for full experience)
- [ ] T069 [P] [US4] Add metadata + CTA handoffs with `utm_content=ai-assistant` in AI Assistant page

**Checkpoint**: AI differentiator page live and convertible.

---

## Phase 8: User Story 5 â€” Testimonials, FAQ, Legal (Priority: P2)

**Goal**: Trust + legal transparency with FAQ structured data.  
**Independent Test**: Testimonials, FAQ (FAQPage JSON-LD), Privacy, Terms readable without account.  
**Design source**: `d-faq.png`, `d-privacy.png`, `d-terms.png` (+ mobile); testimonials also on Home/dedicated page.

### Tests for User Story 5

- [ ] T070 [P] [US5] Playwright: FAQ accordion + JSON-LD parse; legal pages render in `tests/e2e/trust-legal.spec.ts`

### Implementation for User Story 5

- [ ] T071 [P] [US5] Implement Testimonials page in `src/app/[locale]/testimonials/page.tsx` using `getTestimonials()`
- [ ] T072 [P] [US5] Implement FAQ page with FAQPage JSON-LD in `src/app/[locale]/faq/page.tsx`
- [ ] T073 [P] [US5] Implement Privacy Policy page from LegalDocument in `src/app/[locale]/privacy-policy/page.tsx`
- [ ] T074 [P] [US5] Implement Terms page from LegalDocument in `src/app/[locale]/terms/page.tsx`
- [ ] T075 [P] [US5] Add rich-text renderer for legal/blog bodies in `src/components/blog/rich-text.tsx` (shared)

**Checkpoint**: Trust and legal pages complete.

---

## Phase 9: User Story 6 â€” Blog Listing & Details (Priority: P2)

**Goal**: Dynamic CMS-ready blog with Article SEO and â‰¤5 min publish visibility.  
**Independent Test**: Paginate/filter blog, open article, Article JSON-LD + OG/Twitter; revalidate updates listing.  
**Design source**: `d-blog.png`, `d-blog-details.png` (+ mobile).

### Tests for User Story 6

- [ ] T076 [P] [US6] Playwright: blog list â†’ details â†’ metadata/JSON-LD in `tests/e2e/blog.spec.ts`
- [ ] T077 [P] [US6] Contract/unit test revalidate tags for posts in `tests/unit/revalidate-tags.test.ts`

### Implementation for User Story 6

- [ ] T078 [P] [US6] Implement `listPosts` / `getPost` / `listPostSlugs` / categories in `src/content/db-provider.ts`
- [ ] T079 [US6] Implement Blog listing (pagination + category chips) in `src/app/[locale]/blog/page.tsx` and `src/components/blog/{post-card,post-grid,pagination,category-chips}.tsx`
- [ ] T080 [US6] Implement Blog Details with `generateStaticParams`, `generateMetadata`, BlogPosting JSON-LD, share buttons in `src/app/[locale]/blog/[slug]/page.tsx`
- [ ] T081 [P] [US6] Extend sitemap with published posts Ã— locales in `src/app/sitemap.ts`
- [ ] T082 [US6] Configure ISR (300s) + tag revalidation (`posts`, `post:{slug}`, `sitemap`) for blog routes

**Checkpoint**: Dynamic blog + SEO share surface complete.

---

## Phase 10: User Story 9 â€” Global Site Search (Priority: P2)

**Goal**: Typed search across doctors and posts with empty-state recovery.  
**Independent Test**: Queries matching doctors, posts, and nothing; grouped labeled results.

### Tests for User Story 9

- [ ] T083 [P] [US9] Playwright search journeys (hit/miss) in `tests/e2e/search.spec.ts`
- [ ] T084 [P] [US9] API contract tests for `GET /api/search` in `tests/unit/search-api.test.ts`

### Implementation for User Story 9

- [ ] T085 [US9] Implement Postgres full-text `search()` on ContentProvider in `src/content/db-provider.ts` (tsvector + pg_trgm per research.md)
- [ ] T086 [US9] Implement `GET /api/search` in `src/app/api/search/route.ts` per contracts/api.md
- [ ] T087 [US9] Implement Search page (`noindex`) in `src/app/[locale]/search/page.tsx` with grouped results UI
- [ ] T088 [P] [US9] Wire Navbar search entry point to Search page in `src/components/layout/navbar.tsx`

**Checkpoint**: Site search independently usable.

---

## Phase 11: User Story 7 â€” Contact, Newsletter, Pricing (Priority: P3)

**Goal**: Contact inquiry + newsletter signup; optional Pricing behind feature flag.  
**Independent Test**: Valid contact submit; newsletter subscribe; Pricing visible only when enabled.  
**Design source**: `d-contact.png`, `m-contact.png`.

### Tests for User Story 7

- [ ] T089 [P] [US7] Playwright contact validation + success in `tests/e2e/contact.spec.ts`
- [ ] T090 [P] [US7] Playwright newsletter subscribe + pricing flag toggle in `tests/e2e/newsletter-pricing.spec.ts`
- [ ] T091 [P] [US7] API contract tests for `/api/contact` and `/api/newsletter` in `tests/unit/contact-newsletter-api.test.ts`

### Implementation for User Story 7

- [ ] T092 [P] [US7] Implement Zod schemas shared client/server in `src/lib/validators/contact.ts` and `src/lib/validators/newsletter.ts`
- [ ] T093 [US7] Implement `POST /api/contact` (honeypot, time-trap, rate limit, persist ContactInquiry, notify ops) in `src/app/api/contact/route.ts`
- [ ] T094 [US7] Implement `POST /api/newsletter` (dedupe, PENDING/CONFIRMED) in `src/app/api/newsletter/route.ts`
- [ ] T095 [US7] Wire Contact page + form submit + ContactPage JSON-LD in `src/app/[locale]/contact/page.tsx`
- [ ] T096 [US7] Wire Newsletter form submit across Footer/Home in `src/components/forms/newsletter-form.tsx`
- [ ] T097 [P] [US7] Implement Pricing page gated by `lib/flags.ts` in `src/app/[locale]/pricing/page.tsx` (`noindex` when disabled; omit from nav/sitemap)
- [ ] T098 [P] [US7] Emit analytics events (`contact_submit_*`, `newsletter_signup`, CTA clicks) via `src/lib/analytics.ts`

**Checkpoint**: Conversion capture flows complete.

---

## Phase 12: Polish â€” SEO, Performance, Testing DoD

**Purpose**: Cross-cutting SEO completeness, performance budgets, and Definition of Done validation.

### SEO completion

- [ ] T099 [P] Audit all indexable pages emit unique metadata + hreflang via `src/lib/seo.ts` (Home, marketing, doctors, blog, FAQ, contact)
- [ ] T100 [P] Verify OpenGraph/Twitter images fallback to `public/images/og-default.png` and entity images when present
- [ ] T101 [P] Finalize `src/app/robots.ts` and complete sitemap exclusions (search, drafts, disabled pricing, filtered listings)
- [ ] T102 [P] Playwright SEO validation suite (canonical, hreflang, JSON-LD required props, sitemap contents) in `tests/e2e/seo.spec.ts`

### Performance

- [ ] T103 [P] Enforce `next/image` AVIF/WebP + `sizes` + priority LCP hero across pages; remotePatterns in `next.config.ts`
- [ ] T104 [P] Code-split below-the-fold interactive islands with `next/dynamic` for filters/motion/forms where beneficial
- [ ] T105 [P] Confirm ISR/caching tags for doctors/posts and document cache strategy in comments near `unstable_cache` usage in `src/content/db-provider.ts`
- [ ] T106 Configure Lighthouse CI budgets (LCP â‰¤ 2.5s, CLS â‰¤ 0.1, score â‰¥ 95) in `lighthouserc.js` / CI workflow

### Testing & Definition of Done

- [ ] T107 [P] Expand responsive Playwright coverage to all 13 pages (mobile + desktop) in `tests/e2e/responsive.spec.ts`
- [ ] T108 [P] Expand axe WCAG AA coverage to Blog Details + Contact (+ both locales) in `tests/e2e/a11y.spec.ts`
- [ ] T109 Run Lighthouse CI against Home, Doctors, Doctor Profile, Blog Details; fix regressions until score â‰¥ 95
- [ ] T110 Visual QA pass: implement Stitch designs accurately for all pages vs `specs/001-public-website/design/*` (desktop + mobile)
- [ ] T111 Execute full quickstart.md validation scenarios 1â€“10 and record results
- [ ] T112 Production readiness checklist: env secrets, consent banner, no PHI on public surface, error/empty states, 404 localized

**Checkpoint**: Definition of Done met â€” Stitch-accurate, responsive, Lighthouse â‰¥ 95, WCAG AA, SEO optimized, production-ready.

---

## Dependencies & Execution Order

### Phase Dependencies

- **Phase 1 (Setup)** â†’ no deps
- **Phase 2 (Foundational)** â†’ depends on Setup; **BLOCKS** all user stories
- **Phases 3â€“5 (P1 stories)** â†’ after Foundational; US1 â†’ MVP; US2 and US8 can proceed in parallel after US1 or after Foundational
- **Phases 6â€“10 (P2 stories)** â†’ after Foundational; preferably after P1 for shared a11y patterns; mutually parallelizable
- **Phase 11 (P3)** â†’ after Foundational; Contact form UI exists from Phase 2 but API wiring here
- **Phase 12 (Polish)** â†’ after targeted stories complete (at minimum US1+US2+US8 for MVP DoD slice)

### User Story Dependencies

| Story | Priority | Depends on | Notes |
|---|---|---|---|
| US1 Home | P1 | Phase 2 | MVP; uses shared sections |
| US2 Doctors | P1 | Phase 2 | Independent of US1 content |
| US8 i18n/a11y | P1 | Phase 2 + pages under test | Hardens all delivered pages |
| US3 Marketing | P2 | Phase 2 | Independent |
| US4 AI Assistant | P2 | Phase 2 | Independent |
| US5 Trust/Legal | P2 | Phase 2 (+ T075 rich-text) | Independent |
| US6 Blog | P2 | Phase 2 (+ rich-text) | Independent; sitemap extends US2 pattern |
| US9 Search | P2 | US2 + US6 data ideally | Can stub with seeded data after Phase 2 |
| US7 Contact/Newsletter/Pricing | P3 | Phase 2 form shells | Independent APIs |

### Within Each Story

1. Tests written first (fail) where listed  
2. ContentProvider methods before pages  
3. Page + metadata/JSON-LD before checkpoint  
4. Story complete before relying on it in Polish

### Parallel Opportunities

```text
Phase 1: T002â€“T005, T007â€“T008 in parallel after T001
Phase 2: T011â€“T012; T014â€“T016; T018â€“T021; T022â€“T032; T033â€“T037 in parallel waves
After Phase 2:
  Dev A â†’ US1 then US3
  Dev B â†’ US2 then US6 then US9
  Dev C â†’ US8 hardening + US4 + US5
  Dev D â†’ US7 APIs/forms
Phase 12 SEO/Perf/Test tasks marked [P] can run in parallel
```

---

## Parallel Example: User Story 2

```bash
# Tests in parallel:
Task: "Playwright doctors.spec.ts"
Task: "Unit doctor-query.test.ts"

# Provider methods then pages:
Task: "listDoctors/getDoctor in db-provider.ts"
Task: "Find Doctors page + filters"
Task: "Doctor Profile + generateMetadata + Physician JSON-LD"
Task: "Sitemap doctor entries"
```

---

## Implementation Strategy

### MVP First (US1 only)

1. Phase 1 Setup  
2. Phase 2 Foundational (layout, nav, footer, theme, content provider, SEO helpers, reusable components)  
3. Phase 3 US1 Home (Stitch-accurate)  
4. **STOP & VALIDATE** â€” Home CTAs + metadata + responsive smoke  
5. Demo / soft deploy

### Incremental Delivery

1. Setup + Foundational â†’ shared chrome ready  
2. US1 Home â†’ MVP  
3. US2 Doctors + US8 a11y/RTL gates â†’ conversion + compliance  
4. US3â€“US6 + US9 â†’ full marketing + content SEO  
5. US7 â†’ contact/newsletter/pricing  
6. Phase 12 â†’ Lighthouse â‰¥ 95, WCAG AA, SEO suite, Stitch visual QA, production checklist

### Suggested MVP Scope

**Phases 1â€“3 (Setup + Foundation + Home)** â€” optionally include Phase 4 (Doctors) if first release must support discovery.

---

## Definition of Done (feature-level)

- [ ] Stitch designs implemented accurately (`design/` + `design/stitch-landing/`)
- [ ] Responsive across mobile, tablet, desktop
- [ ] Lighthouse score â‰¥ 95 on key pages
- [ ] WCAG 2.2 AA compliant (axe + manual keyboard/SR pass)
- [ ] SEO optimized (metadata, sitemap, robots, OG/Twitter, structured data)
- [ ] Production-ready (env, caching, error/empty states, no PHI)

---

## Notes

- [P] = different files, safe to parallelize
- Story labels map to spec.md user stories for traceability
- Reusable components are built in Phase 2; pages compose them in story phases
- Commit after each task or logical group; stop at any checkpoint to validate independently


## Phase 13: Convergence

**Purpose**: Close gaps found by `/speckit-converge` — incomplete Module 0 work marked done, and P1/spec gaps not covered by open tasks T045–T112.

- [ ] T113 CRITICAL: Add persistent Register, Login, and Book Appointment CTAs to `src/components/layout/navbar.tsx` and `src/components/layout/mobile-nav.tsx` via `src/lib/cta.ts` per FR-002, SC-003, US1/AC1 (partial)
- [ ] T114 Ensure Home communicates all seven value themes (Online Consultation, AI Medical Documentation, Secure EMR, Licensed Doctors, Appointment Booking, Video Consultation, Fast & Secure Healthcare) in `src/app/[locale]/page.tsx` / feature content per FR-009, US1/AC2 (partial)
- [ ] T115 [P] Compose Testimonials, Blog preview, and Newsletter band on Home in `src/app/[locale]/page.tsx` using ContentProvider + existing section/form components per T041, T042, US1 (partial)
- [ ] T116 Create and document initial Prisma migration under `prisma/migrations/` and wire Neon serverless adapter in `src/lib/prisma.ts` / `package.json` per T010, plan: Neon adapter (partial)
- [ ] T117 Implement real Prisma-backed queries in `src/content/db-provider.ts` (published-only, locale resolution) and provider selection in `src/content/static-provider.ts` or `src/content/index.ts` per T013, FR-044 (partial)
- [ ] T118 [P] Expand `prisma/seed.ts` to seed specialties, multiple doctors, posts, services, FAQs, testimonials, and legal documents per T011, data-model.md (partial)
- [ ] T119 [P] Extend primary navigation links in `src/components/layout/navbar.tsx` and `src/components/layout/mobile-nav.tsx` to reach How It Works, Blog, FAQ, and Contact per FR-003 (partial)
- [ ] T120 Update `src/lib/flags.ts` to read `pricing.enabled` from SiteSetting (env fallback allowed) per T036, plan: SiteSetting flags (partial)
- [ ] T121 [P] Add missing shadcn primitives `src/components/ui/select.tsx` and `src/components/ui/navigation-menu.tsx` per T003 (partial)
- [ ] T122 [P] Self-host Latin + Arabic font files via `next/font/local` in `src/app/[locale]/layout.tsx` and `public/fonts/` per T016, FR-050 (partial)

