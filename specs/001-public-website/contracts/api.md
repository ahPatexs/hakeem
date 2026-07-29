# API Contracts: Hakeem Public Website

**Date**: 2026-07-28 | **Plan**: [../plan.md](../plan.md)

All endpoints are Next.js Route Handlers under `/api`. JSON in/out. Zod-validated. Errors follow one envelope:

```json
{ "ok": false, "error": { "code": "VALIDATION_ERROR", "message": "Localized human message", "fields": { "email": "Invalid email" } } }
```

Success envelope: `{ "ok": true, "data": { ... } }`

## POST /api/contact

Create a contact inquiry (FR-031).

**Request**

```json
{
  "name": "string (2-100)",
  "email": "string (email)",
  "phone": "string | null",
  "topic": "general | appointments | doctors | technical | partnership",
  "message": "string (10-5000)",
  "locale": "en | ar",
  "website": ""            // honeypot — must be empty
}
```

**Responses**

| Status | Body | When |
|---|---|---|
| 201 | `{ ok: true, data: { id } }` | Stored + ops notification queued |
| 400 | VALIDATION_ERROR + fields | Any invalid/missing field |
| 429 | RATE_LIMITED | Per-IP limit exceeded (5/10 min) |
| 200 | `{ ok: true, data: { id: null } }` | Honeypot/time-trap tripped — silently accepted, flagged SPAM (no bot feedback) |
| 503 | CHANNEL_UNAVAILABLE | Store/notify failure → UI shows alternate contact guidance |

## POST /api/newsletter

Newsletter signup (FR-047).

**Request**: `{ "email": "string", "locale": "en | ar" }`

**Responses**

| Status | Body | When |
|---|---|---|
| 201 | `{ ok: true, data: { state: "PENDING" \| "CONFIRMED" } }` | New subscription (PENDING when double-opt-in active) |
| 200 | `{ ok: true, data: { state: "CONFIRMED" } }` | Already subscribed — idempotent, no enumeration detail |
| 400 | VALIDATION_ERROR | Bad email |
| 429 | RATE_LIMITED | Per-IP abuse |

## GET /api/search

Global typed search (FR-045/046).

**Query**: `q` (1–100 chars, required), `locale` (`en|ar`, required), `limit` (default 8, max 20)

**Response 200**

```json
{
  "ok": true,
  "data": {
    "doctors": [ { "slug": "", "name": "", "specialty": "", "photoUrl": null, "url": "/{locale}/doctors/{slug}" } ],
    "posts":   [ { "slug": "", "title": "", "summary": "", "publishedAt": "ISO", "url": "/{locale}/blog/{slug}" } ],
    "totals": { "doctors": 0, "posts": 0 }
  }
}
```

Empty `q` after trim → 400. Zero hits → 200 with empty arrays (UI renders empty state with recovery links).

## POST /api/revalidate

On-demand cache invalidation (CMS-webhook compatible).

**Headers**: `x-revalidate-secret: <REVALIDATE_SECRET>`

**Request**: `{ "tags": ["doctor:dr-ahmed-hassan", "doctors"] }`

**Responses**: 200 `{ ok: true, data: { revalidated: [...] } }` · 401 UNAUTHORIZED (bad/missing secret) · 400 (empty/invalid tags)

**Tag vocabulary**: `doctors`, `doctor:{slug}`, `posts`, `post:{slug}`, `faq`, `testimonials`, `services`, `legal`, `pricing`, `sitemap`

## External CTA handoffs (not APIs — URL contracts)

| CTA | Target |
|---|---|
| Register | `{APP_URL}/register?lang={locale}&utm_source=website&utm_content={page}` |
| Login | `{APP_URL}/login?lang={locale}` |
| Book Appointment | `{APP_URL}/book?lang={locale}&doctor={slug?}&utm_source=website` |

Doctor Profile passes its slug into the book handoff; all other pages omit it.
