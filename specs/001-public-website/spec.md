# Feature Specification: Hakeem Public Website

**Feature Branch**: `001-public-website`

**Created**: 2026-07-27

**Status**: Draft

**Input**: User description: "Define the complete Public Website for Hakeem — an AI-powered Telemedicine Platform. Visitors browse without an account. Pages: Home, About Hakeem, Our Services, Find Doctors, Doctor Profile, AI Medical Assistant, How It Works, Pricing (Optional), Testimonials, FAQ, Blog, Blog Details, Contact Us, Privacy Policy, Terms & Conditions. Homepage communicates online consultation, AI medical documentation, secure EMR, licensed doctors, appointment booking, video consultation, and fast & secure healthcare. Every page encourages Register, Login, and Book Appointment. Doctor Profile pages must support SEO. Blog pages must support dynamic content. Website must be responsive, accessible, multilingual, and production-ready."

## Clarifications

### Session 2026-07-27

Non-interactive clarification pass: user directed no questions; enterprise-grade assumptions applied and recorded below.

- Q: SEO strategy for the public site? → A: Hybrid SEO — unique metadata per page type; priority indexation for Home, Find Doctors, Doctor Profiles, Blog listing/details, Services, About; legal/utility pages indexable with lower priority; noindex for empty search-result states and unpublished/unavailable entities.
- Q: Metadata strategy? → A: Every public page MUST expose unique title, meta description, canonical URL, language/alternate-language links, and robots directives derived from page type and publish state.
- Q: Sitemap generation? → A: Auto-generated XML sitemap(s) covering all indexable public URLs in both languages, including doctor profiles and published blog posts; updated when content publish state changes.
- Q: Robots.txt? → A: Public robots.txt allowing crawling of marketing/content paths; disallowing private/app/auth paths and non-public APIs; referencing sitemap location(s).
- Q: Structured Data (Schema.org)? → A: Organization + WebSite on Home; Physician/MedicalBusiness (or equivalent medical professional) on Doctor Profiles; Article/BlogPosting on Blog Details; FAQPage on FAQ; BreadcrumbList on hierarchical pages; ContactPage on Contact Us.
- Q: OpenGraph? → A: Required on all shareable public pages with title, description, URL, type, locale, and image (page-specific or brand fallback).
- Q: Twitter Cards? → A: summary_large_image (or equivalent large card) on shareable pages using the same core share metadata as OpenGraph where possible.
- Q: Localization scope? → A: Full UI + content parity for English and Arabic at launch; language preference persisted for the visit; hreflang/alternate links between language variants.
- Q: RTL support? → A: Arabic MUST render full RTL layout (navigation, forms, icons mirroring, reading order); English LTR; no broken bidirectional text in mixed content where avoidable.
- Q: Blog architecture? → A: Dynamic content model with categories/tags, author attribution, publish/unpublish, listing pagination, related posts optional; CMS-ready content contract for future headless CMS without redesigning public URLs.
- Q: Site search functionality? → A: Global search across published blog posts and public doctor directory at minimum; empty and no-result states required.
- Q: Doctor search filters? → A: Filters for specialty, name/keyword, language spoken (if available), gender (if available), and availability/consultation readiness; clear/reset filters supported.
- Q: Analytics integration? → A: Privacy-aware analytics for page views, CTA clicks (Register/Login/Book), search usage, contact submit success/fail, newsletter signup; consent-respecting where legally required.
- Q: Newsletter subscription? → A: Footer and/or dedicated capture with email validation, confirmation message, and unsubscribe path described in Privacy Policy; double-opt-in preferred where feasible.
- Q: Contact workflow? → A: Required fields name, email, topic/category, message; optional phone; spam protection; confirmation to visitor; internal delivery to operations inbox/queue; failure fallback messaging.
- Q: Image optimization? → A: Responsive images, modern efficient formats where supported, lazy-loading below the fold, meaningful alt text; LCP/hero images prioritized for fast display.
- Q: Font optimization? → A: Limited font families for EN/AR, subsetting where practical, non-blocking load strategy, readable fallbacks to avoid invisible text.
- Q: Accessibility target? → A: WCAG 2.2 Level AA for all public pages at launch.
- Q: Performance strategy? → A: Fast first contentful experience on mobile; Core Web Vitals–oriented targets (see Success Criteria); progressive loading for heavy lists (doctors/blog).
- Q: Future CMS integration? → A: Public site MUST consume content via a stable content contract (pages, blog, FAQ, testimonials, legal) so a future CMS can replace the source without changing public URLs or SEO metadata contracts.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Discover Hakeem and understand the value (Priority: P1)

A first-time visitor lands on the homepage (or arrives from search/ads) and immediately understands that Hakeem is an AI-powered telemedicine platform offering online consultation, licensed doctors, appointment booking, video consultation, AI medical documentation, and secure electronic medical records. The visitor can explore key benefits without creating an account.

**Why this priority**: The homepage is the primary conversion and trust surface; without a clear value proposition, other pages underperform.

**Independent Test**: Open the homepage as a guest; verify all core value messages and primary CTAs (Register, Login, Book Appointment) are visible and usable without authentication.

**Acceptance Scenarios**:

1. **Given** an unauthenticated visitor on the homepage, **When** they view the first screenful of content, **Then** they see Hakeem’s brand, a clear telemedicine value statement, and CTAs for Register, Login, and Book Appointment.
2. **Given** an unauthenticated visitor on the homepage, **When** they scroll or navigate homepage sections, **Then** they encounter messaging for Online Consultation, AI Medical Documentation, Secure Electronic Medical Records, Licensed Doctors, Appointment Booking, Video Consultation, and Fast & Secure Healthcare.
3. **Given** an unauthenticated visitor, **When** they select Register, Login, or Book Appointment from the homepage, **Then** they are taken to the corresponding registration, login, or booking entry flow.
4. **Given** a crawler or social preview of the homepage, **When** metadata is read, **Then** Organization/WebSite structured data and OpenGraph/Twitter share fields are present with brand imagery.

---

### User Story 2 - Find a doctor and open a doctor profile (Priority: P1)

A visitor browses or searches doctors, applies filters, reviews doctor information, and opens a doctor profile that is suitable for search engines (shareable, descriptive URL/title/content, structured data). From the profile they can start registration, login, or booking.

**Why this priority**: Doctor discovery and profiles are core to telemedicine conversion and organic acquisition.

**Independent Test**: As a guest, open Find Doctors, apply filters and keyword search, open a doctor profile, and verify profile content, CTAs, SEO metadata, and structured data.

**Acceptance Scenarios**:

1. **Given** an unauthenticated visitor on Find Doctors, **When** they browse or search available doctors, **Then** they see a list of doctor summaries (name, specialty, and key trust signals) without needing an account.
2. **Given** a visitor on Find Doctors, **When** they apply filters (specialty, name/keyword, and available optional filters such as language spoken, gender, availability), **Then** results update to matching doctors and filters can be cleared.
3. **Given** a visitor viewing search/browse results, **When** they select a doctor, **Then** they open that doctor’s public profile with clinical credentials, specialty, availability cues, and CTAs for Register, Login, and Book Appointment.
4. **Given** a doctor profile page, **When** the page is indexed or shared, **Then** it provides unique title, description, canonical URL, OpenGraph/Twitter fields, and medical-professional structured data suitable for search and social sharing.
5. **Given** an empty or no-match doctor search, **When** results are shown, **Then** the visitor sees a clear empty state and guidance to adjust search or contact support / browse services; the empty-result state is not treated as a primary index target.

---

### User Story 3 - Learn how Hakeem works and what services are offered (Priority: P2)

A visitor reads About Hakeem, Our Services, and How It Works to build trust and understand the patient journey from discovery to consultation and records.

**Why this priority**: Trust and education reduce friction before registration and booking.

**Independent Test**: Navigate About, Services, and How It Works as a guest; verify clear narrative, service descriptions, and persistent conversion CTAs.

**Acceptance Scenarios**:

1. **Given** a visitor on About Hakeem, **When** they read the page, **Then** they understand Hakeem’s mission as an AI-powered telemedicine platform and see CTAs to Register, Login, and Book Appointment.
2. **Given** a visitor on Our Services, **When** they review listed services, **Then** each service has a plain-language description and a path toward booking or registration.
3. **Given** a visitor on How It Works, **When** they follow the steps, **Then** they understand the end-to-end journey (discover → book → consult → records/documentation) without needing an account to read it.

---

### User Story 4 - Explore the AI Medical Assistant offering (Priority: P2)

A visitor opens the AI Medical Assistant page to understand what the assistant does (e.g., guided health questions, documentation support) and is encouraged to register or log in to use the full experience.

**Why this priority**: AI is a differentiator for Hakeem; the public page must educate and convert without requiring an account to browse.

**Independent Test**: Open AI Medical Assistant as a guest; verify educational content and CTAs; verify that starting the full assistant experience prompts Register or Login when authentication is required.

**Acceptance Scenarios**:

1. **Given** an unauthenticated visitor on the AI Medical Assistant page, **When** they view the content, **Then** they understand the assistant’s purpose and benefits in plain language.
2. **Given** an unauthenticated visitor who chooses to start using the assistant, **When** authentication is required, **Then** they are guided to Register or Login before continuing the full experience.
3. **Given** any state of the AI Medical Assistant page, **When** CTAs are shown, **Then** Register, Login, and Book Appointment remain available.

---

### User Story 5 - Build trust via testimonials, FAQ, and legal pages (Priority: P2)

A visitor reviews Testimonials and FAQ to resolve doubts, and can open Privacy Policy and Terms & Conditions before registering.

**Why this priority**: Trust and legal transparency are required for a production healthcare site and for conversion.

**Independent Test**: Open Testimonials, FAQ, Privacy Policy, and Terms as a guest; verify readable content, FAQ structured data, and navigation back to conversion CTAs on marketing pages.

**Acceptance Scenarios**:

1. **Given** a visitor on Testimonials, **When** they view the page, **Then** they see patient (or representative) testimonials relevant to telemedicine experiences.
2. **Given** a visitor on FAQ, **When** they browse questions, **Then** they find answers covering consultations, booking, AI features, privacy, and accounts, with CTAs to Register, Login, or Book Appointment, and FAQ structured data present for indexable Q&A.
3. **Given** a visitor considering registration, **When** they open Privacy Policy or Terms & Conditions, **Then** they can read the full current legal text without an account.

---

### User Story 6 - Consume and share blog content (Priority: P2)

A visitor browses Blog listings (optionally by category/tag), opens Blog Details articles managed as dynamic CMS-ready content, and can share articles with correct social previews.

**Why this priority**: Content marketing and SEO drive sustained organic traffic.

**Independent Test**: Open Blog, filter or paginate if available, select an article, verify dynamic content, Article structured data, and OpenGraph/Twitter previews.

**Acceptance Scenarios**:

1. **Given** published blog posts exist, **When** a visitor opens the Blog page, **Then** they see a dynamic paginated list of posts (title, summary, date, and thumbnail or equivalent).
2. **Given** categories or tags exist, **When** a visitor filters the Blog listing, **Then** only matching published posts are shown.
3. **Given** a visitor selects a post, **When** Blog Details opens, **Then** the full article content, author attribution, title, metadata, Article structured data, and share metadata are displayed.
4. **Given** content editors publish, update, or unpublish a post via the content source/CMS contract, **When** a visitor returns to Blog or Blog Details, **Then** they see the updated dynamic content without a marketing-site redesign or public URL change for content-only updates.
5. **Given** no published posts, **When** a visitor opens Blog, **Then** they see a clear empty state.

---

### User Story 7 - Contact Hakeem, subscribe, and evaluate pricing (Priority: P3)

A visitor submits a contact inquiry, may subscribe to the newsletter, and optionally reviews Pricing if enabled.

**Why this priority**: Contact and newsletter support acquisition/retention; Pricing is optional.

**Independent Test**: Submit Contact Us; subscribe with a valid email; if Pricing enabled, open it; verify analytics-relevant success confirmations without requiring account.

**Acceptance Scenarios**:

1. **Given** an unauthenticated visitor on Contact Us, **When** they submit a complete inquiry (name, email, topic, message), **Then** they receive confirmation that the message was received and Hakeem can follow up.
2. **Given** incomplete contact form fields or suspected spam, **When** the visitor attempts to submit, **Then** they see clear validation or blocking feedback and the message is not accepted as a valid inquiry.
3. **Given** a visitor enters a valid email in the newsletter capture, **When** they subscribe, **Then** they receive confirmation of signup (and preference/confirmation step if double-opt-in is active).
4. **Given** Pricing is enabled with published plans, **When** a visitor opens Pricing, **Then** they see plan/options in plain language plus CTAs for Register, Login, and Book Appointment.
5. **Given** Pricing is not enabled, **When** a visitor uses primary site navigation, **Then** Pricing is not presented as an available destination.

---

### User Story 8 - Use the site in preferred language on any device with WCAG AA (Priority: P1)

A visitor uses the public website on mobile, tablet, and desktop; switches between English and Arabic with correct LTR/RTL; and completes primary journeys with keyboard and assistive technologies meeting WCAG 2.2 AA.

**Why this priority**: Responsive, accessible, bilingual delivery is a hard product requirement for production readiness.

**Independent Test**: Walk primary journeys on small and large viewports in EN and AR; verify RTL layout for Arabic; verify WCAG AA–oriented checks on key pages; verify performance-friendly loading of images/fonts.

**Acceptance Scenarios**:

1. **Given** a visitor on a mobile-sized screen, **When** they navigate primary pages, **Then** content and CTAs remain usable without horizontal scrolling of the main layout.
2. **Given** a visitor who selects Arabic or English, **When** pages update, **Then** navigation and page content appear in that language with correct reading direction (RTL for Arabic, LTR for English) and alternate-language links for the equivalent page.
3. **Given** a visitor using keyboard-only navigation, **When** they move through header navigation and primary CTAs, **Then** focus order is logical, visible, and controls are operable without a pointer.
4. **Given** a visitor using a screen reader, **When** they land on key pages (Home, Find Doctors, Doctor Profile, Blog Details, Contact), **Then** landmarks, headings, form labels, and interactive controls have accessible names consistent with WCAG 2.2 AA.
5. **Given** a visitor on a constrained mobile network, **When** they load Home or Doctor Profile, **Then** primary content becomes readable quickly per performance success criteria without invisible text from late-loading fonts.

---

### User Story 9 - Search the public site (Priority: P2)

A visitor uses global site search to find doctors and blog articles without an account.

**Why this priority**: Search reduces friction for content-rich and directory-heavy public sites.

**Independent Test**: Run searches that match doctors, match blog posts, and match nothing; verify result grouping/labels and empty state.

**Acceptance Scenarios**:

1. **Given** published doctors and blog posts, **When** a visitor searches a known doctor name or article keyword, **Then** relevant results appear labeled by type (doctor vs article).
2. **Given** a query with no matches, **When** results render, **Then** an empty state offers links to Find Doctors, Blog, and Contact Us.

---

### Edge Cases

- What happens when doctor search returns no matches? Show empty state with suggestions and CTAs; do not promote empty-result URLs as index targets.
- What happens when a doctor profile is unpublished or unavailable? Show a not-found/unavailable message with links back to Find Doctors and Contact Us; exclude from sitemap.
- What happens when blog content fails to load? Show a recoverable error state without breaking site navigation.
- What happens when the contact channel is temporarily unavailable? Show a clear failure message and alternate contact guidance if available; record analytics failure event if enabled.
- What happens when Pricing is empty or disabled? Hide from primary navigation; direct URLs may show a friendly unavailable/coming-soon state; omit from sitemap when disabled.
- What happens when a guest tries to Book Appointment? Start booking entry; require Register/Login before completing a protected booking step.
- What happens when a language translation is missing for a string? Fall back to the default language for that string without blanking the page.
- What happens on very slow networks? Core navigation and primary CTAs remain usable; content areas show loading or progressive feedback; images below the fold defer loading.
- What happens when newsletter email is invalid or already subscribed? Show clear validation or informative confirmation without exposing sensitive subscription details.
- What happens when social share image is missing for a page? Use brand fallback image in OpenGraph/Twitter metadata.
- What happens when CMS/content source is unreachable? Show degraded but navigable experience for static shell; dynamic sections show recoverable errors; do not serve stale unpublished content as published.

## Requirements *(mandatory)*

### Functional Requirements

#### Site-wide

- **FR-001**: Visitors MUST be able to browse all public marketing and content pages without creating an account.
- **FR-002**: Every public marketing page MUST present clear calls to action for Register, Login, and Book Appointment (header and/or in-page; legal pages may rely on global header/footer CTAs).
- **FR-003**: The website MUST provide a consistent global navigation that reaches all enabled public pages.
- **FR-004**: The website MUST provide a footer with secondary links including Privacy Policy, Terms & Conditions, Contact Us, newsletter capture, and key marketing destinations.
- **FR-005**: The website MUST be usable on mobile, tablet, and desktop viewports.
- **FR-006**: The website MUST support English and Arabic for public content and navigation, including LTR for English and full RTL for Arabic.
- **FR-007**: The website MUST conform to WCAG 2.2 Level AA for public pages.
- **FR-008**: Completing account-gated actions (full AI assistant use, completing appointment booking) MUST require Register or Login; browsing related marketing pages MUST NOT.
- **FR-032**: Language preference MUST be selectable by the visitor and applied consistently for the session (and remembered across visits when technically feasible without account).
- **FR-033**: Each localized page MUST expose alternate-language references to its counterpart where a translation exists.

#### Page inventory

- **FR-009**: The website MUST include a Home page that communicates Online Consultation, AI Medical Documentation, Secure Electronic Medical Records, Licensed Doctors, Appointment Booking, Video Consultation, and Fast & Secure Healthcare.
- **FR-010**: The website MUST include an About Hakeem page describing the platform and brand.
- **FR-011**: The website MUST include an Our Services page listing telemedicine and related services in plain language.
- **FR-012**: The website MUST include a Find Doctors page for browsing/searching public doctor listings.
- **FR-013**: The website MUST include Doctor Profile pages for individual doctors.
- **FR-014**: The website MUST include an AI Medical Assistant page explaining the offering and converting visitors to Register/Login/Book.
- **FR-015**: The website MUST include a How It Works page describing the patient journey.
- **FR-016**: The website MUST support an optional Pricing page that can be enabled or hidden without removing other public pages.
- **FR-017**: The website MUST include a Testimonials page.
- **FR-018**: The website MUST include an FAQ page.
- **FR-019**: The website MUST include a Blog listing page and Blog Details pages for individual posts.
- **FR-020**: The website MUST include a Contact Us page with an inquiry submission flow and confirmation/error feedback.
- **FR-021**: The website MUST include Privacy Policy and Terms & Conditions pages with the current published legal text.

#### SEO, metadata & discoverability

- **FR-034**: Every indexable public page MUST expose a unique document title, meta description, canonical URL, and robots directive appropriate to its type and publish state.
- **FR-035**: The website MUST publish XML sitemap(s) listing all indexable URLs for English and Arabic variants, including doctor profiles and published blog posts; sitemaps MUST update when publish state changes.
- **FR-036**: The website MUST publish a robots.txt that allows crawling of public marketing/content paths, disallows private/auth/app paths, and references sitemap location(s).
- **FR-037**: Home MUST expose Organization and WebSite structured data; Doctor Profiles MUST expose medical-professional structured data; Blog Details MUST expose Article/BlogPosting structured data; FAQ MUST expose FAQPage structured data; hierarchical pages SHOULD expose BreadcrumbList; Contact Us SHOULD expose ContactPage structured data.
- **FR-038**: Shareable public pages MUST expose OpenGraph metadata (title, description, URL, type, locale, image) with page-specific or brand-fallback image.
- **FR-039**: Shareable public pages MUST expose Twitter Card metadata consistent with OpenGraph core fields, using a large-image card style where an image is available.
- **FR-040**: Priority indexation focus MUST include Home, Find Doctors, Doctor Profiles, Blog listing/details, Our Services, and About; empty search-result states and unpublished entities MUST NOT be presented as primary index targets.

#### Doctors & search filters

- **FR-022**: Doctor Profile pages MUST be publicly addressable with stable, shareable URLs that remain stable across CMS/content-source changes.
- **FR-023**: Doctor Profile pages MUST expose unique, descriptive titles and summaries suitable for search engines.
- **FR-024**: Doctor Profile pages MUST present doctor identity, specialty/credentials, and booking-oriented CTAs.
- **FR-025**: Find Doctors MUST support keyword/name search and filters for specialty at minimum, plus language spoken, gender, and availability/consultation readiness when those attributes exist in the public doctor data.
- **FR-041**: Find Doctors MUST allow clearing/resetting applied filters and MUST show result counts or equivalent feedback.

#### Blog architecture & CMS readiness

- **FR-026**: Blog listing and Blog Details MUST be driven by dynamic published content (create/update/unpublish reflected on the public site without a content-only redesign).
- **FR-027**: Blog Details pages MUST expose unique titles and summaries suitable for search discovery and sharing.
- **FR-028**: Unpublished or missing blog posts MUST resolve to a clear not-found experience and MUST be excluded from sitemaps.
- **FR-042**: Blog posts MUST support title, summary, body, publish state, publish date, author attribution, optional category/tag classification, and a stable public details URL.
- **FR-043**: Blog listing MUST support pagination (or equivalent progressive loading) when post volume exceeds a single comfortable page.
- **FR-044**: Public content (marketing pages as applicable, blog, FAQ, testimonials, legal text) MUST be delivered through a stable content contract so a future CMS can replace the source without changing public URLs or SEO metadata contracts.

#### Site search

- **FR-045**: The website MUST provide global search covering at least published blog posts and public doctor directory entries.
- **FR-046**: Search results MUST distinguish result types (e.g., doctor vs article) and provide an empty state with recovery links.

#### Conversion, contact & newsletter

- **FR-029**: Register and Login CTAs MUST route visitors into the platform’s registration and authentication entry points.
- **FR-030**: Book Appointment CTAs MUST route visitors into the appointment booking entry flow, requiring authentication before completing protected steps.
- **FR-031**: Contact Us MUST require name, email, topic/category, and message; MAY accept phone; MUST validate required fields; MUST apply spam protection; MUST confirm successful receipt to the visitor; MUST deliver the inquiry to an internal operations inbox/queue.
- **FR-047**: The website MUST provide newsletter subscription capture (footer and/or dedicated placement) with email validation, visitor confirmation, privacy disclosure alignment, and an unsubscribe path documented in Privacy Policy (double-opt-in preferred when operationally available).

#### Analytics

- **FR-048**: The website MUST integrate privacy-aware analytics capturing at minimum: page views, Register/Login/Book CTA clicks, site search usage, contact submit success/failure, and newsletter signup events, respecting consent requirements where applicable.

#### Media, fonts, performance & accessibility quality

- **FR-049**: Images MUST use responsive delivery, efficient modern formats where supported, lazy-loading for below-the-fold media, and meaningful alternative text; primary/hero images MUST be prioritized for timely display.
- **FR-050**: Fonts MUST be limited to a small EN/AR set, loaded to avoid invisible text, with readable system fallbacks; Arabic and Latin scripts MUST remain legible across breakpoints.
- **FR-051**: The public site MUST pursue a performance strategy oriented to strong mobile Core Web Vitals (see Success Criteria), including progressive loading for large doctor/blog lists.

### Key Entities

- **Public Page**: A browseable marketing or legal destination with localized title/body, metadata (title, description, canonical, robots), OpenGraph/Twitter fields, optional structured data, language variants, and CTA placement rules.
- **Doctor (Public Profile)**: Publicly visible clinician information for discovery and SEO (name, specialty, credentials/trust signals, profile summary, availability cues, optional language/gender attributes, public URL, share image, structured data).
- **Doctor Listing Result**: A summarized doctor card/row shown in Find Doctors search/browse/filter results.
- **Doctor Search Query**: Keyword plus optional filters (specialty, language spoken, gender, availability) applied to the public directory.
- **Service Offering**: A named telemedicine or platform service described on Our Services and referenced on Home.
- **Testimonial**: A published endorsement attributed to a patient or representative persona.
- **FAQ Item**: A question/answer pair grouped for visitors evaluating the platform; eligible for FAQ structured data.
- **Blog Post**: Dynamic article with title, summary, body, publish state, publish date, author, optional categories/tags, share image, and stable public URL.
- **Site Search Result**: A typed hit (doctor or article) returned from global search.
- **Pricing Plan** *(optional)*: A named plan or package shown only when Pricing is enabled.
- **Contact Inquiry**: Visitor-submitted message with name, email, topic/category, message body, optional phone, and processing/delivery status.
- **Newsletter Subscription**: Email signup with validation/confirmation state and unsubscribe pathway.
- **Language Preference**: Visitor-selected language (en | ar) affecting labels, content, reading direction, and alternate links.
- **Sitemap Entry**: Indexable public URL with language variant and last-updated cue for crawlers.
- **Content Contract Document**: CMS-ready representation of a public content entity that preserves URL and metadata stability when the content source changes.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Unauthenticated visitors can open and understand the Home page value proposition (all seven homepage themes present) in under 30 seconds of first visit.
- **SC-002**: At least 95% of guest users in usability testing can locate Find Doctors and open a Doctor Profile within 2 minutes without assistance.
- **SC-003**: At least 90% of guest users can initiate Register, Login, or Book Appointment from any primary marketing page within one click/tap from the global header (or equivalent persistent CTA region).
- **SC-004**: Doctor Profile pages achieve unique indexed titles/summaries such that two different doctors never share the same public title/summary content.
- **SC-005**: Newly published blog posts appear on the Blog listing and are openable on Blog Details within 5 minutes of publish (content-only change), and appear in the sitemap within the same window.
- **SC-006**: Contact Us successful submissions show confirmation to the visitor in under 5 seconds after submit under normal conditions.
- **SC-007**: Primary public journeys remain fully usable on a 375px-wide viewport without loss of primary CTAs or navigation.
- **SC-008**: Switching between English and Arabic updates navigation and sampled page content with correct LTR/RTL and no blank primary headings.
- **SC-009**: Keyboard-only users can complete the path Home → Find Doctors → Doctor Profile → Book Appointment CTA without a pointer.
- **SC-010**: Pre-launch accessibility review against WCAG 2.2 AA reports zero critical/serious defects on Home, Find Doctors, Doctor Profile, Blog Details, and Contact Us.
- **SC-011**: When Pricing is disabled, 100% of primary navigation samples omit Pricing; when enabled, visitors can open Pricing and see plan content plus conversion CTAs.
- **SC-012**: On a reference mid-tier mobile network profile, Home reaches readable primary content within 3 seconds for at least 90% of test loads.
- **SC-013**: Largest primary content image/hero on Home and Doctor Profile meets “fast display” expectations in performance review (no systematically delayed LCP caused by unoptimized media).
- **SC-014**: 100% of sampled Doctor Profile and Blog Details pages include OpenGraph + Twitter share fields and required structured data types for their page class.
- **SC-015**: XML sitemap contains every published doctor profile and published blog post URL for both languages and omits unpublished/unavailable entities in automated verification.
- **SC-016**: At least 90% of usability testers can complete a newsletter signup with a valid email without assistance.
- **SC-017**: Global search returns a relevant doctor or article in the top results for known fixture queries in at least 95% of scripted cases.
- **SC-018**: Analytics receives events for CTA click, contact success, and newsletter signup in staging verification for 100% of scripted successful actions (when consent allows).

## Assumptions

### Audience & scope

- Target visitors are prospective patients (and caregivers) evaluating telemedicine; clinicians may browse but doctor onboarding portals are out of scope for this public website feature.
- Full interactive AI Medical Assistant chat/session requires authentication; the public page is primarily educational/conversion-oriented for guests.
- Completing an appointment booking requires an authenticated patient account; guests may start the booking CTA but must Register or Login before finishing protected steps.
- Pricing is optional: included in the information architecture but can be hidden when no plans are published.
- Register/Login destinations are the platform’s existing or planned auth entry points; designing the full authenticated patient app is out of scope except for CTA handoff.
- Testimonials may be curated/approved content; live social embeds are not required for v1.

### Localization & RTL

- Launch languages are English and Arabic only; additional languages are out of scope for v1.
- Arabic requires full RTL layout mirroring (nav, icons, forms, breadcrumbs), not text-direction alone.
- Default language for first visit MAY follow browser preference when it is en/ar; otherwise default to Arabic for primary regional audience, with easy switch to English.
- Missing translation strings fall back to the other language rather than blank UI.

### SEO / metadata / social / crawl

- SEO is a launch requirement, not a post-launch add-on: metadata, sitemap, robots.txt, structured data, OpenGraph, and Twitter Cards ship with v1.
- Canonical URLs are language-specific; duplicates across languages are related via alternate links, not collapsed into one URL.
- Brand fallback share image exists for pages without a dedicated social image.
- Private patient data never appears in public metadata, sitemaps, or structured data.

### Blog & CMS

- Blog is a first-class dynamic content system with author, dates, and taxonomy; not a set of static hard-coded pages.
- Public URLs and metadata fields are treated as a stable contract so a future headless CMS can replace the content source without SEO regressions.
- Content editors may use an interim content source at launch; CMS migration is planned-for, not necessarily implemented in v1.

### Search & filters

- Doctor filters beyond specialty/name appear only when attributes exist; UI does not show empty filter facets as active choices.
- Global search is first-party site search (doctors + blog), not a general web search.

### Contact, newsletter, analytics

- Contact delivery goes to an internal operations queue/inbox monitored by Hakeem staff; SLA for human reply is operational, not a public website hard guarantee beyond receipt confirmation.
- Spam protection is required (e.g., bot resistance) without blocking legitimate accessibility tools.
- Newsletter double-opt-in is preferred; if email provider constraints block it at launch, single opt-in with clear Privacy Policy disclosure is acceptable temporarily.
- Analytics is privacy-aware and consent-respecting for regions/laws applicable to Hakeem’s audience; essential operational measurement may still occur where legally permitted.

### Media, fonts, performance, accessibility

- WCAG 2.2 AA is the accessibility bar for public launch.
- Performance strategy prioritizes mobile users in regional network conditions; Core Web Vitals–oriented outcomes are success criteria, not optional polish.
- Image and font optimization are mandatory production behaviors, not enhancements.
- “Production-ready” means the public site meets responsive, WCAG AA, bilingual RTL/LTR, SEO/discoverability, performance, analytics, and conversion requirements defined in this specification before public launch.

### Data & dependencies

- Doctor directory and blog/FAQ/testimonial/legal content are supplied by existing or companion platform content sources conforming to the content contract; clinician admin tooling is out of scope.
- Privacy Policy and Terms & Conditions content is provided by the business/legal team for publication and must disclose newsletter and analytics practices at a business-appropriate level.
