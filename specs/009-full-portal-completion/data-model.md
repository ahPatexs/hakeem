# Data Model: Full Portal Completion

**Feature**: `009-full-portal-completion` | **Date**: 2026-08-13

Reuse existing `Appointment`, `Doctor`, `User`, `Notification`, `VideoSession`, clinical EMR tables. Add only schedule ownership tables.

## New entities

### DoctorWeeklyHours

Weekly working window owned by the CMS `Doctor` (the same id patients book against).

| Field | Type | Rules |
|-------|------|--------|
| id | cuid | PK |
| doctorId | string | FK `Doctor.id`, cascade |
| weekday | int | 0 = Sunday … 6 = Saturday (ISO-unaligned clinic week starting Sunday) |
| startMinutes | int | Minutes from local midnight, 0–1439, inclusive |
| endMinutes | int | Exclusive end, > startMinutes, ≤ 1440 |
| timezone | string | IANA, default `Asia/Riyadh` if omitted at doctor level |

**Constraints**: unique `(doctorId, weekday)` for v1 (one window per day). No hours row for a weekday = closed that day.

**Validation**: `endMinutes - startMinutes` must be a multiple of 30. Windows that are not multiples of 30 are rejected.

### DoctorUnavailableDay

Full-day exception (vacation / clinic closed).

| Field | Type | Rules |
|-------|------|--------|
| id | cuid | PK |
| doctorId | string | FK `Doctor.id` |
| date | date | Local calendar date in the doctor timezone |
| reason | string? | Optional, max 200 |

**Constraints**: unique `(doctorId, date)`.

Clearing all `DoctorWeeklyHours` for a doctor = booking unavailable (FR-001). Existing `Appointment` rows are **not** deleted (FR-015).

## Existing entities (behavior changes)

### Appointment

No new columns. Occupancy statuses that block a slot:

`HELD` (and `holdExpiresAt` > now), `CONFIRMED`, `CHECKED_IN`, `IN_PROGRESS`.

Terminal / free: `CANCELLED`, `COMPLETED`, `NO_SHOW`, `RESCHEDULED`, expired `HELD`.

**Hold**: 10 minutes (`holdExpiresAt`), unchanged from 003.

**Overlap**: two appointments overlap if `startAt < other.endAt AND endAt > other.startAt` for the same `doctorId`.

**Duration**: offered slots always `endAt = startAt + 30 minutes`.

### Doctor

`status = PUBLISHED` and `isAvailable = true` still required to appear in search. Bookable **offers** additionally require at least one `DoctorWeeklyHours` row.

### User

Doctor user links via `User.doctorProfileId` → `Doctor.id` (existing). Notifications for “new booking” go to that user.

### Notification

Reuse platform `notify()`. New event type string: `doctor.appointment.confirmed`. Category: `APPOINTMENT`. Href: `/doctor/appointments/{id}` (locale added by app). Patient confirm event already exists.

### VideoSession

Reuse. `provider` reflects adapter (`livekit` vs `stub`). UI labels demo when provider is stub / stub URL. No new chat/admit tables this wave.

## Derived: AvailabilitySlot (not stored)

Generated at read time:

```
for each date D in [today, today+13] in doctor TZ:
  if D is unavailable day → skip
  hours = weekly row for weekday(D)
  if none → skip
  split [startMinutes, endMinutes) into 30-minute starts
  skip starts <= now
  skip if overlapping blocking appointment
  emit { startAt, endAt } as UTC ISO
```

Horizon: 14 calendar days from viewing instant (clarify Q5).

## State: Appointment (unchanged, completeness)

```
HELD → CONFIRMED → CHECKED_IN → IN_PROGRESS → COMPLETED
                 ↘ CANCELLED / RESCHEDULED
CONFIRMED or CHECKED_IN → NO_SHOW
HELD → (expire) treated as free
```

Patient Upcoming must list: `HELD`, `CONFIRMED`, `CHECKED_IN`, `IN_PROGRESS`.

## Relationships

```
Doctor 1──* DoctorWeeklyHours
Doctor 1──* DoctorUnavailableDay
Doctor 1──* Appointment
User (DOCTOR) 0..1──1 Doctor  (doctorProfileId)
Appointment 1──0..1 VideoSession
User 1──* Notification
```
