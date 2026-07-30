# UI Review: Patient Portal (Stitch)

**Date**: 2026-07-29 | **Spec**: [spec.md](./spec.md) | **Plan**: [plan.md](./plan.md)

**Directive**: Review approved Stitch MCP design only. Do **not** generate a new UI.

## Review status

| Check | Result | Notes |
|-------|--------|-------|
| Stitch MCP access | **PARTIAL** | `mcp_auth` succeeded intermittently; `get_screen` / `download_assets` still **401** |
| Design export in repo | **PARTIAL** | `design/manifest.json` lists all target screen IDs + routes; PNG/HTML assets not downloaded |
| Pixel validation vs Stitch | **DEFERRED** | UI built with shared Hakeem tokens (primary `#00436f`, med-green) pending asset import |
| New UI generation | **NOT DONE** | No alternate design system invented beyond existing brand tokens |

## Sign-off criteria

UI visual QA against Stitch PNGs remains open until assets are exported. Functional portal routes are implemented and gated by PATIENT RBAC.


## Screens pending validation

Dashboard · Appointment screens · Medical records · AI assistant · Profile · Payments · Notifications · Settings

Each must be checked for: responsive frames, accessibility, loading/empty/error states, component reuse, design consistency, EN/AR RTL — see checklist in [design/README.md](./design/README.md).

## Missing requirements before UI implementation

1. Restore Stitch MCP OAuth **or** manually export approved screens into `design/`.
2. Provide desktop + mobile assets + `manifest.json`.
3. Confirm portal shell vs marketing nav (plan recommends dedicated `PortalShell`).
4. Capture video waiting-room, upload placement, notification badge, and payment chrome from Stitch (do not invent).

**Gate**: UI coding tasks blocked until design pack lands; domain/API/Prisma may proceed.
