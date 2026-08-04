# Quickstart results: Platform Services

**Date**: 2026-07-30  
**Feature**: `006-platform-services`  
**Phase**: 19 LiveKit Video Communication (T135–T177)

## Automated

| Suite | Result |
|-------|--------|
| `tests/unit/platform` (video + LiveKit helpers) | PASS |
| `tests/integration/platform` (stub adapter + webhook helpers) | PASS |
| `tests/perf/platform/video-token.perf.test.ts` | PASS |
| `tsc --noEmit` | PASS |

## Design export (FR-002 / SC-013)

| Item | Status |
|------|--------|
| Stitch MCP export PNGs | **Deferred** — `exported: false` (honest) |
| Shared video / AI SoT | `src/components/platform/video/*`, `src/components/platform/ai/*` + Stitch ids in manifest |

## Manual scenarios (quickstart.md)

| # | Scenario | Code path | Operator E2E |
|---|----------|-----------|--------------|
| 1–12 | See quickstart.md | Implemented behind `lib/platform/*` | Optional staging smoke |
| 7 | Video Communication (LiveKit) | `lib/platform/video` + `components/platform/video` + stub/LiveKit adapter | Set `TELEMEDICINE_ADAPTER=livekit` + LiveKit env for cloud; stub default in CI |
| Cron | `POST /api/cron/platform-jobs` | Includes `VIDEO_RECORDING_FINALIZE` | Pending local verify |
| Webhooks | payments + video fail-closed + skew | Implemented | Pending local verify |

## DoD checklist

- [x] Shared facades under `src/lib/platform/*`
- [x] LiveKit integrated behind `TelemedicinePort` / `adapters/livekit-telemedicine.ts` (reusable; portals have no LiveKit Server SDK)
- [x] Shared video UI kit (waiting room, preview, devices, grid, controls, session shell)
- [x] AI services centralized + shared AI chrome
- [x] Notification / payment / storage / search / audit / timeline / i18n / flags operational from prior phases
- [x] Design export status recorded honestly (`exported: false`)
- [ ] Operator confirms scenarios 1–12 in staging UI once
