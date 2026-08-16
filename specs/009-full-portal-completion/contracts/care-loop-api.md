# Contract: Care-loop Server Actions

**Feature**: `009-full-portal-completion` | **Date**: 2026-08-13

Conventions match 003/004: `{ ok: true, data? }` / `{ ok: false, code }`. Opaque ids. No PHI in URLs.

## Error catalog (additions)

| Code | Meaning |
|------|---------|
| SCHEDULE_MISSING | Doctor has no published weekly hours |
| SLOT_OUTSIDE_HOURS | Requested time is not a 30-minute offer |
| SLOT_UNAVAILABLE | Overlap with blocking appointment or hold |
| SLOT_HORIZON | Start is more than 14 days ahead or in the past |
| WEEKDAY_INVALID | Hours payload invalid |
| HOURS_OVERLAP | endMinutes not after startMinutes or not multiple of 30 |

Reuse: `UNAUTHENTICATED`, `FORBIDDEN`, `NOT_FOUND`, `VALIDATION_ERROR`, `HOLD_EXPIRED`, `JOIN_WINDOW_CLOSED`.

## Doctor — hours

### `getDoctorHours()`

Auth: `DOCTOR` with linked `doctorProfileId`.

Returns: `{ timezone, week: Array<{ weekday, startMinutes, endMinutes }>, unavailable: Array<{ date, reason? }> }`

Empty `week` is valid (booking unavailable).

### `saveDoctorHours({ timezone?, week, unavailable? })`

Auth: `DOCTOR` linked. Replaces weekly hours for that doctor. Does not delete appointments.

`week[]`: `{ weekday: 0-6, startMinutes, endMinutes }` unique weekday.

### `addDoctorUnavailableDay({ date, reason? })` / `removeDoctorUnavailableDay({ date })`

Date is `YYYY-MM-DD` in doctor timezone.

## Patient — availability and book

### `getDoctorAvailability({ slug })`  (replace stub)

Auth: `PATIENT`.

Returns: `{ slots: Array<{ startAt, endAt }>, timezone, unavailableReason?: "NO_HOURS" | "NOT_BOOKABLE" }`

Must not invent hours. Empty slots + `NO_HOURS` when published but no schedule.

### Existing (behavior change)

- `holdAppointmentSlot` — MUST reject if slot would not be returned by `getDoctorAvailability` (`SLOT_OUTSIDE_HOURS` / `SLOT_HORIZON` / `SLOT_UNAVAILABLE`).
- `confirmAppointment` — MUST notify assigned doctor user in-app (`doctor.appointment.confirmed`) in addition to patient notification.
- `listUpcoming` / dashboard upcoming — MUST include `CHECKED_IN`.
- `rescheduleAppointment` — same availability rules as hold.

## Video

### `platformGetVideoJoinCredentials` (existing)

Unchanged minting. UI contract: if credentials URL is stub, client MUST render labeled demo room and MUST NOT show Admit or in-call chat as working.

## Payments

### `markPaymentPaid`

MUST NOT be required for `confirmAppointment`. UI MUST NOT present it as a live charge this wave (remove CTA or `demo` label).

## Public

Unauthenticated `Book` for a doctor slug → `/{locale}/login?next=/{locale}/patient/doctors/{slug}`.

Authenticated patient Book → `/{locale}/patient/doctors/{slug}`.
