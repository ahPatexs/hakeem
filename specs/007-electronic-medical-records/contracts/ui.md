# Contract: EMR UI Surfaces (Stitch)

**Feature**: `007-electronic-medical-records`  
**Date**: 2026-08-04  
**Directive**: Do **not** redesign. Approved Stitch + existing portal design packs are SoT.

## Shared EMR component map

| UI surface | Component home | Consumer routes (existing) |
|------------|----------------|----------------------------|
| Patient Summary | `components/emr/summary/*` | Patient records home; Doctor patient overview |
| Medical Timeline | `components/emr/timeline/*` | Patient + Doctor chart |
| Medical History | `components/emr/history/*` | Patient medical profile / history |
| Diagnoses | `components/emr/diagnoses/*` | Doctor chart; patient read-only list if designed |
| SOAP Notes | `components/emr/soap/*` | Doctor consultation workspace |
| Prescriptions | `components/emr/prescriptions/*` | Patient + Doctor Rx |
| Lab Results | `components/emr/labs/*` | Patient + Doctor labs |
| Medical Imaging | `components/emr/imaging/*` | Labs & radiology screens |
| Documents | `components/emr/documents/*` | Documents / uploads |
| Loading | platform or `emr/loading-state` | all lists |
| Empty | platform or `emr/empty-state` | all lists |
| Error | platform or `emr/error-state` | all lists |

## Non-negotiables

- Tokens, typography, spacing from existing Hakeem/Stitch theme — no new visual system.  
- EN/AR + RTL.  
- Allergy/critical alerts must be perceivable without color alone (icon + text).  
- Keyboard focus visible on primary actions and alert regions.

## Detailed inventory

See [ui-review.md](../ui-review.md).
