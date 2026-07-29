# Hakeem Public Website — UI Designs (Google Stitch)

**Stitch project (multi-screen)**: `Hakeem Public Website` (`projects/13964019538029496943`) — open at [stitch.withgoogle.com](https://stitch.withgoogle.com) to edit, generate variants, or export Tailwind/HTML code per screen.

**Stitch project (landing hero reference)**: `Hakeem AI Healthcare Landing Page` (`projects/2408493713147971043`), screen `9917580a95714d95b6d7ea9f9245c4d2` — assets in [`stitch-landing/`](./stitch-landing/) (`hakeem-landing-page.png`, `hakeem-landing-page.html`).

**Design language**: modern premium healthcare from approved Stitch landing (`stitch-landing/hakeem-landing-page.html`); primary `#00436f`, med-green `#00A884`, Lexend + Inter; soft glassmorphism; WCAG AA contrast; mobile-first.

**Implementation note (Module 0)**: Next.js Home and shared chrome were implemented from the downloaded Stitch HTML — do not regenerate UI in Stitch for this module.

## Screens

File naming: `d-` desktop · `m-` mobile · `t-` tablet. `manifest.json` maps each PNG to its Stitch screen ID.

| Page | Desktop | Mobile | Tablet |
|---|---|---|---|
| Home | `d-home-1.png` | `m-home.png` | `t-home.png` |
| About | `d-about.png` | `m-about-1.png` | — |
| Services | `d-services.png` | `m-services.png` | — |
| Find Doctors | `d-doctors.png` | `m-doctors.png` | `t-doctors.png` |
| Doctor Profile | `d-doctor-profile-1.png` | `m-doctor-profile.png` | `t-doctor-profile.png` |
| AI Assistant | `d-ai-assistant.png` | `m-ai-assistant.png` | — |
| How It Works | `d-how-it-works.png` | `m-how-it-works.png` | — |
| Blog | `d-blog.png` | `m-blog.png` | — |
| Blog Details | `d-blog-details.png` | `m-blog-details.png` | — |
| Contact | `d-contact.png` | `m-contact.png` | — |
| FAQ | `d-faq.png` | `m-faq.png` | — |
| Privacy | `d-privacy.png` | `m-privacy.png` | — |
| Terms | `d-terms.png` | `m-terms.png` | — |
| **Component Library** | `d-components.png` | `m-components.png` | — |

`d-home.png`, `d-doctor-profile.png`, and `m-about.png` are auxiliary brand/logo assets produced alongside those generations.

## Reusable components

The Component Library sheets (`d-components.png` / `m-components.png`) cover: Navbar, Hero Section, Feature Cards, Statistics, Doctor Cards, Search Filters, Testimonials, FAQ Accordion, CTA Sections, Newsletter, Contact Form, Footer — matching `plan.md → Component Architecture`.

## Notes

- Tablet variants were generated for the three highest-traffic templates (Home, Find Doctors, Doctor Profile); remaining pages interpolate between the mobile and desktop layouts via the responsive breakpoints defined in the plan. Additional tablet variants can be generated in Stitch on demand.
- Screens are English/LTR; the Arabic RTL treatment is a mirroring of these layouts per `plan.md → Layout Strategy` (logical properties, flipped directional icons).
