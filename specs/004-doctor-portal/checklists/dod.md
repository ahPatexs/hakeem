# Definition of Done: Doctor Portal

**Feature**: [spec.md](../spec.md) | **Date**: 2026-07-30

- [x] Doctors can manage consultations (schedule/queue/start/complete/workspace)
- [x] Clinical documentation complete (SOAP + clinical summary draft/finalize)
- [x] AI Assistant integrated (medical / documentation / prescription modes)
- [x] Prescription workflow complete (draft → review & sign; patient drafts hidden)
- [x] Secure access to patient records (care relationship + lab review)
- [x] Stitch design pack exported under `design/`
- [x] Production-ready baseline: RBAC DOCTOR, Zod validation, audit helpers, unit domain tests, seed `doctor@hakeem.local`

## Notes

- Pixel-perfect Stitch alignment remains iterative against `design/*.png` (see [ui-review.md](../ui-review.md)).
- Streaming AI route and Notification.recipientUserId rename deferred as non-blocking (notifications use doctor userId in patientUserId field by convention).
