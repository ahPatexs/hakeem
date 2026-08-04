# UI Contract: AI Healthcare Platform (Module 7)

**Date**: 2026-08-04 · **Design SoT**: approved Stitch designs — **no redesign**. This contract lists surfaces, mounted components, and behavioral requirements; visual specifics defer to Stitch frames.

## Global rules (all AI surfaces)

- EN/AR with full RTL; AI-generated content honors locale/direction (FR-041/043); `ai.*` keys added to `en.json`/`ar.json` with parity enforced by the existing i18n test.
- Every AI response surface shows AI identity + medical disclaimer per Stitch placement (FR-002).
- Accessibility: keyboard-operable chat and controls, visible focus, `role`/`aria-live` for streamed content (polite) and emergency notices (assertive), contrast per approved design (FR-042).
- Error states map per [ai-api.md §9](./ai-api.md); manual workflows always reachable when AI is down (FR-027).

## Patient portal

| Surface | Route | Components (`components/ai/*`) | Behavior contract |
|---|---|---|---|
| AI Assistant | `patient/ai` | `chat/assistant-chat`, `chat/message-bubble`, `chat/disclaimer`, `chat/emergency-banner`, `feedback/response-feedback` | streaming via `use-ai-chat`; red-flag banner interrupts flow ahead of content (FR-006); refusal messaging for diagnosis/Rx asks (FR-005) |
| Conversation history | `patient/ai` (list pane per Stitch) | `chat/conversation-list` | owner-only, newest first, reopen/continue/rename/hide (FR-003/004) |
| Symptom checker | `patient/ai/symptom-checker` | `symptom/session-wizard`, `symptom/outcome-card` | guided steps; outcome card with rationale + non-diagnostic disclaimer (FR-009/010); emergency escalation state (FR-011); "attach to booking" CTA (FR-012) |
| Education & recommendations | `patient/ai/health` (per Stitch) | `recommendations/recommendation-card`, `recommendations/education-list` | "why shown" line (FR-013), dismiss persists (FR-014), general-wellness fallback (FR-015) |

## Doctor portal (panels inside existing surfaces — no new shell)

| Surface | Route | Components | Behavior contract |
|---|---|---|---|
| AI documentation panel | `doctor/consultations/[appointmentId]` | `doctor/draft-panel` | generate SOAP/summary drafts; clearly labeled AI-assisted draft; accept → populates existing EMR draft forms; discard available (FR-016–FR-019) |
| Rx assistant panel | `doctor/prescriptions/new` (compose) | `doctor/rx-suggest-panel` | suggestion + evidence + conflict flags before accept (FR-020/021); accept fills draft only; sign flow unchanged |
| CDS insights | `doctor/patients/[id]` chart | `doctor/cds-insights` | evidence-cited, dismissible, read-only (FR-022) |

## Admin portal

| Surface | Route | Components | Behavior contract |
|---|---|---|---|
| AI Operations Dashboard | `admin/ai` | `admin/ops-dashboard`, `admin/usage-charts` | period selector; usage/cost/latency/error/guardrail/feedback aggregates; budget breach prominence; zero message content (FR-034/036/037) |
| Usage analytics | `admin/ai/usage` | `admin/usage-charts` | filters: feature/role/locale; totals reconcile (SC-008) |
| Prompt management | `admin/ai/prompts` | `admin/prompt-editor` | draft/publish/rollback with change notes; en+ar bodies; safety layer shown read-only (FR-038) |
| Model management | `admin/ai/models` | `admin/model-config-form` | per-feature model/params/fallback; versioned (FR-039) |
| Budgets | `admin/ai/budgets` | `admin/budget-form` | monthly amount, threshold %, hard cap (FR-036) |
| Monitoring / guardrails | `admin/ai/monitoring` | `admin/guardrail-log` | guardrail events metadata; health signals (FR-025/037) |

Admin AI nav items append to the existing `admin-nav` component pattern.

## Design manifest

`specs/008-ai-healthcare-platform/design/manifest.json` tracks the Stitch export state per surface (same convention as Module 6). Until frames are exported (`exported: true`), build against existing portal chrome + shadcn primitives already matching Stitch tokens; do not invent new visual language.
