# UI Review: Electronic Medical Records (Stitch)

**Date**: 2026-08-04 | **Feature**: `007-electronic-medical-records`  
**Stitch project (known)**: `2408493713147971043` (`Hakeem AI Healthcare Landing Page`)  
**Directive**: Do **not** redesign. Approved Stitch is SoT.

## Review method

1. Attempted Stitch MCP `list_projects` / screen inventory during `/speckit-plan` — **API 401** after `mcp_auth` (credentials not usable in this session).
2. Validated against **existing exported design packs** and prior UI reviews:
   - `specs/004-doctor-portal/design/` (timeline, labs/radiology, prescriptions, patient overview, consultation workspace, SOAP-related flows)
   - `specs/003-patient-portal/design/` manifest
   - `specs/006-platform-services/ui-review.md` (Lab Results & Radiology EMR frame id noted)
3. Mapped required EMR surfaces → Stitch/design assets → planned `components/emr/*` (no new visual language).

**PNG pack for Module 7**: `design/manifest.json` starts with `exported: false` until Stitch export succeeds; implementers must still match Stitch + existing tokens from modules 003/004.

## Validation matrix

| Surface | Stitch / design expectation | Existing asset / reference | Plan action | Redesign? |
|---------|----------------------------|----------------------------|-------------|-----------|
| Patient Summary | Chart snapshot: allergies, meds, conditions, alerts | Doctor `d-patient-overview.png`; Patient medical record chrome | `components/emr/summary` | **No** |
| Medical Timeline | Chronological care events, filters | `d-medical-timeline.png`, `h-medical-timeline.html` | `components/emr/timeline` — complete wiring | **No** |
| Medical History | History / profile domains | Patient medical-profile screens; overview | `components/emr/history` | **No** |
| Diagnoses | Problem/encounter diagnoses list + optional code | Consultation / overview diagnosis areas in Stitch workspace | `components/emr/diagnoses` | **No** |
| SOAP Notes | SOAP sections + review/sign | Consultation workspace + doctor note flows | `components/emr/soap` (facade over existing) | **No** |
| Prescriptions | Active/history, create, review & sign | `d-*-prescription*.png`, patient Rx views | `components/emr/prescriptions` + renewal UI if in Stitch | **No** |
| Lab Results | List/detail, Preliminary/Final, critical | `d-lab-results-radiology.png`; Platform ui-review EMR labs frame | `components/emr/labs` | **No** |
| Medical Imaging | Radiology alongside labs | Same labs/radiology Stitch screen | `components/emr/imaging` | **No** |
| Documents | Uploads, referrals, certificates | Prescriptions & Documents / upload chrome (Platform ui-review) | `components/emr/documents` | **No** |
| Loading States | Skeleton/pulse on lists & summary widgets | Existing platform/portal skeletons | Reuse platform loading | **No** |
| Empty States | Short empty copy per list | Portal empty patterns + Stitch empties | Reuse platform empty | **No** |
| Error States | Safe error + retry / access denied | Access Denied patterns | Reuse platform error | **No** |
| Accessibility | Keyboard, focus, alert names, non-color-only status | Spec FR-030 / SC-010 | Enforce in EMR components | **No** |
| Responsive Design | Mobile/desktop Stitch breakpoints | Existing portal responsive shells | Keep portal shells; EMR content responsive | **No** |

## Stitch screen references (from prior inventories)

| Title / theme | Where recorded |
|---------------|----------------|
| Lab Results & Radiology - Hakeem EMR | `006-platform-services/ui-review.md` screen id suffix `d5cb724385e54f55a36856880f89837b` |
| Medical Timeline | `004-doctor-portal` design `d-medical-timeline.png` |
| Patient Overview | `004-doctor-portal` `d-patient-overview.png` |
| Consultation Workspace (SOAP entry) | `d-consultation-workspace.png` |
| Create / Review & Sign Prescription | doctor design pack |
| Prescriptions & Documents | Platform ui-review |
| Waiting/error/empty chrome | Platform + Auth Access Denied |

## Findings

1. **EMR UI largely already designed inside Patient/Doctor Stitch packs** — Module 7 work is consolidation under `components/emr`, not new IA.
2. **Medical Timeline** was marked **partial** in Doctor portal UI review — EMR plan prioritizes completing timeline against `d-medical-timeline.png`.
3. **Diagnoses** as a first-class list/picker may be embedded in workspace rather than a standalone Stitch frame — confirm on next successful Stitch list; do not invent a new page chrome.
4. **Consent forms** may lack a dedicated exported PNG — if missing in Stitch, use Documents + modal patterns already in design system; document as gap below (business/UX), do not freestyle a new brand.
5. **Admin EMR oversight** screens may be thin/absent in current exports — Admin uses existing audit/user tools until Stitch admin clinical screens are confirmed.
6. **Do not redesign** colors, type, or shell navigation to “unify” EMR.

## Missing business / design requirements (before / during implement)

Documented gaps (not redesign tasks):

| ID | Gap | Impact | Suggested default until Stitch confirms |
|----|-----|--------|----------------------------------------|
| G1 | Dedicated **Consent** Stitch screen not verified in exports | Consent UX | Use document viewer + acknowledge/withdraw controls consistent with existing dialogs; copy EN/AR from i18n |
| G2 | **Admin clinical oversight** Stitch screen not verified | Admin US9 | Read-only reuse of doctor summary/timeline with admin banner; no sign CTAs |
| G3 | **Prescription renewal** explicit Stitch frame unclear | Renewal UX | Extend Review & Sign flow with “Renew” action using same prescription chrome |
| G4 | **ICD-10 picker** UI not confirmed as standalone | Diagnosis coding | Combobox on diagnosis form; free-text always available |
| G5 | Stitch MCP **401** blocked live inventory this session | Pixel QA | Use module 003/004 PNGs; re-run export when auth works; set `design/manifest.json` exported true |
| G6 | Patient-facing **Diagnoses** list may be clinician-only in Stitch | Patient FR | Hide patient diagnoses nav unless Stitch patient frame exists; still show conditions on summary |

## Sign-off criteria for implement

- [x] Required surfaces mapped to existing Stitch/design assets or explicit gaps
- [ ] Live Stitch `list_screens` when MCP auth works
- [ ] Optional PNG export into `specs/007-electronic-medical-records/design/`
- [x] No new color/typography system planned
- [x] Portal shells unchanged except mounting `components/emr`
- [x] a11y: alerts labelled; loading `aria-busy`; empty/error roles
- [x] Responsive: reuse portal breakpoints

## Conclusion

EMR UI implementation is **Stitch-faithful consolidation** of already-approved clinical screens. **No redesign approved.** Resolve gaps G1–G6 with defaults above; re-validate against live Stitch when credentials work.
