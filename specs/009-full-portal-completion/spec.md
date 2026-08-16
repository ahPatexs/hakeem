# Feature Specification: Full Portal Completion

**Feature Branch**: `009-full-portal-completion`

**Created**: 2026-08-13

**Status**: Draft

**Input**: User description: "Make a full portal complete from all sides. List the features and go step by step. Run Speckit clarify together."

## Overview

Close remaining gaps so the **care loop** works honestly across every side that participates: **Public website, Auth, Patient, Doctor, Admin, Platform (video), and EMR**. A patient and a doctor must finish: find care → book a true slot → confirm → consult → document → patient sees results. Public CTAs must enter that loop. Silent no-ops are not allowed.

This wave does **not** rebuild every leftover from modules 001–008 (blog, pricing, global search, full AI productization, insurance, messaging networks). Modules 001–008 remain the source specs for deep behavior; this feature is the completion overlay for the care loop.

## Clarifications

### Session 2026-08-13

- Q: What does “full portal complete” mean for this wave? → A: Care loop only (Option B): real slots, honest video, doctor notified on book, no silent no-ops, public Login/Register/Book CTAs into the app. Out of this wave: blog/pricing/search, full AI productization, insurance, patient–doctor messaging product, refill networks.
- Q: Who publishes the doctor’s bookable hours? → A: Doctor publishes weekly hours (and days off) in the doctor portal (Option A). Admin only approves/publishes the account. No hours → booking unavailable. Demo doctors may be seeded with hours.
- Q: When live video is not configured, what should Join video do? -> A: Labeled demo room (Option B). Patient and doctor join the same appointment session; copy must say it is a demo, not a live call. When live media is configured, the same join path uses live video.
- Q: How long is each bookable slot? -> A: Fixed 30-minute slots (Option A). Weekly hours are split into 30-minute offers. Doctor does not choose other durations in this wave.
- Q: How far ahead can a patient book? -> A: Next 14 days (Option B). Slots are offered from now through the next 14 calendar days only.

## Existing module map (inventory)

| Module | Side | Already in product | Still incomplete (this wave) |
|--------|------|--------------------|------------------------------|
| 001 Public website | Visitor | Landing, doctors list/profile, services, FAQ, how-it-works, contact, EN/AR | Book/Login/Register CTAs must enter in-app care loop; other public leftovers out of wave |
| 002 Auth & RBAC | All roles | Login, register (patient), forgot/reset, verify, lockout, sessions, change password, role gates | Keep required; email delivery remains an ops dependency |
| 003 Patient portal | Patient | Dashboard, find doctor, hold/confirm, upcoming/history, cancel/reschedule, records, labs, Rx (read), payments list, notifications, profile | Real slots; checked-in visit still visible; honest video; remove/label stub pay and dead chat/admit |
| 004 Doctor portal | Doctor | Dashboard, schedule viewer, queue, check-in/start/complete/no-show, SOAP/summary/Rx, chart, labs, video join | Doctor-owned weekly hours; notify on new book; no silent admit/chat |
| 005 Admin portal | Admin | Users, doctor approve/reject, settings, appointments view, audit | Approve remains the gate to bookable doctors |
| 006 Platform services | Ops | Video/email/SMS/push/payments adapters | Live video when configured; otherwise labeled demo room; stub pay not presented as a real charge |
| 007 EMR | Clinical | Records, timeline, SOAP, summary, Rx, labs, history, consents, documents | Patient must see signed summary and active Rx after the visit |
| 008 AI | Patient/Doctor | Assistant, symptom checker, documentation/Rx assist | Out of this wave except existing screens must not be silent no-ops; no new AI product work |

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Patient books a true available slot (Priority: P1)

A patient finds a published doctor, sees only times the doctor can actually take, holds a slot, and confirms. The doctor sees the new visit without a fake hourly grid.

**Why this priority**: Fake availability makes the marketplace dishonest and causes double-booking. Nothing downstream is trustworthy until slots are real.

**Independent Test**: Doctor publishes weekly hours in the doctor portal; patient books a listed slot; a second patient cannot take the same slot; doctor dashboard/schedule shows the visit. A doctor with no hours shows booking unavailable.

**Acceptance Scenarios**:

1. **Given** a published, bookable doctor with defined hours, **When** a patient opens that doctor’s booking screen, **Then** they see only open 30-minute slots from that schedule within the next 14 days (not a generic 09:00–17:00 stub), with an empty state if none remain.
2. **Given** a slot is held or confirmed, **When** another patient views the same doctor, **Then** that slot is not offered.
3. **Given** a patient confirms a hold within the hold window, **When** confirmation succeeds, **Then** the appointment is Confirmed, the patient sees it in Upcoming, and the assigned doctor can see it on Today/Upcoming/Schedule and receives an in-app notification.
4. **Given** no real schedule exists for a doctor, **When** a patient tries to book, **Then** the system does not invent hours; it shows that booking is unavailable.

---

### User Story 2 - Patient and doctor complete a consultation and records follow (Priority: P1)

After confirmation, the doctor checks in and starts the visit; both can join video in the allowed window; the doctor documents and signs SOAP/summary/Rx; the patient sees the published summary and active prescriptions.

**Why this priority**: This is the clinical loop the business sells. If video, documentation, or patient-visible output fails, the portal is incomplete.

**Independent Test**: Use a confirmed VIDEO appointment inside the join window; doctor check-in → start → document → sign → complete; patient opens records and prescriptions.

**Acceptance Scenarios**:

1. **Given** a confirmed visit, **When** the doctor checks the patient in, **Then** the visit remains visible to the patient (Upcoming or an explicit “today / waiting” state) and appears in the doctor queue.
2. **Given** a VIDEO visit inside the join window, **When** patient and doctor join, **Then** they enter the same live call if live media is configured, otherwise the same clearly labeled demo room for that appointment, and they cannot join another patient’s room.
3. **Given** an in-progress visit, **When** the doctor signs a clinical summary and an active prescription, **Then** the patient can open those artifacts in Records and Prescriptions without seeing drafts.
4. **Given** the doctor completes the visit, **When** the patient opens History, **Then** the visit shows Completed and no further join is offered.

---

### User Story 3 - Notifications are honest and dead controls are gone (Priority: P1)

Confirmations and alerts match the appointment. Silent doctor inboxes and fake Pay/Admit/Chat controls are not acceptable.

**Why this priority**: Patients and doctors will not trust a loop where buttons do nothing and new bookings arrive unnoticed.

**Independent Test**: Confirm a visit; doctor gets an in-app notification with a deep link; patient confirmation appears in the notification center; stub pay/admit/chat are either implemented or not offered as working.

**Acceptance Scenarios**:

1. **Given** a patient confirms a booking, **When** the confirmation succeeds, **Then** the doctor receives an in-app notification with a deep link to the appointment, and the patient receives a confirmation notification.
2. **Given** this wave does not include collectible payments, **When** the patient opens Payments, **Then** stub “Pay now” is removed or clearly labeled as demo — it must not look like a real charge and must not be required to confirm a booking.
3. **Given** waiting-room admit or in-call chat cannot work for both parties, **When** the video experience is shown, **Then** those controls are hidden or labeled unavailable — not silent no-ops.
4. **Given** any other primary control on the care-loop happy path, **When** the portal is marked complete, **Then** it either performs its labeled action or is removed/disabled with honest copy.

---

### User Story 4 - Public, auth, and admin support the same loop (Priority: P2)

Public visitors reach in-app login/register/book. Patients can complete booking after verify. Admins approve doctors who then become eligible to be booked. Role gates stay in place.

**Why this priority**: Completion means no orphan CTAs and no public path that leaves the product.

**Independent Test**: Walk public → register → verify → patient home → find doctor; admin approve doctor → doctor login; wrong-role URLs denied.

**Acceptance Scenarios**:

1. **Given** a visitor on the public site, **When** they choose Login, Register, or Book, **Then** they land on in-app auth or the patient booking journey (not an external or empty page).
2. **Given** an administrator approves a doctor, **When** that doctor sets a password, signs in, and publishes weekly hours, **Then** they reach the doctor portal and become bookable; until hours exist, patients see booking unavailable.
3. **Given** a wrong-role user, **When** they open another role’s URL, **Then** they see Access denied without data leakage.

---

### Edge Cases

- Hold expires before confirm: slot returns to open; patient must pick again.
- Two patients confirm the same slot: only one Confirmed appointment exists; the other sees a conflict and remaining slots.
- Doctor already has a visit In progress: starting another is blocked until complete/no-show/resolve.
- Video join outside the 15-minute-before to 60-minute-after window: join is refused with the next allowed action (wait or history).
- Live media provider down: patient and doctor see a safe failure and can still complete documentation if the doctor started the visit.
- Unverified patient: cannot use protected booking or clinical pages; must verify email first.
- Unpublished or unapproved doctor: never appears in patient search as bookable.
- Doctor published but has no hours: patient sees booking unavailable, not invented slots.
- Requested slot more than 14 days ahead: it is not offered.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST offer patient booking slots only from hours the assigned doctor published in the doctor portal, or show booking unavailable — never a silent generic stub grid. Offered slots MUST be exactly 30 minutes and MUST fall within the next 14 calendar days from the time of viewing. Administrators MUST NOT be the publishers of those hours in this wave.
- **FR-002**: System MUST prevent double-booking of the same doctor time.
- **FR-003**: System MUST notify the assigned doctor in-app when a patient confirms an appointment.
- **FR-004**: System MUST keep checked-in and in-progress visits visible to the patient until the visit completes or is cancelled.
- **FR-005**: System MUST connect patient and doctor to the same video session for a VIDEO appointment inside the join window. When live media is configured, both parties MUST join a live call. When live media is not configured, Join video MUST open a clearly labeled demo room for that appointment (not a silent fake call and not a hidden button).
- **FR-006**: System MUST persist signed clinical summary and signed prescriptions so the patient can read them; drafts remain clinician-only.
- **FR-007**: System MUST ensure every primary control on the care-loop happy path either performs its labeled action or is removed/disabled with honest copy (no silent no-ops).
- **FR-008**: System MUST keep public Login/Register/Book CTAs on in-app routes used by the portals.
- **FR-009**: System MUST allow administrators to approve doctors and only then allow those doctors to authenticate. A published approved doctor becomes bookable only after that doctor has published weekly hours.
- **FR-015**: Authenticated doctors MUST be able to publish, update, and clear weekly hours (and mark days unavailable) from the doctor portal. Changes MUST take effect for new booking offers; existing Confirmed appointments MUST NOT be silently deleted.
- **FR-010**: Confirming a booking MUST NOT require payment in this wave. Stub checkout MUST NOT be presented as a real charge (remove or label as demo).
- **FR-011**: In-call chat and waiting-room admit MUST NOT be offered as working features unless both parties can use them; otherwise hide or disable with honest copy.
- **FR-012**: Patient–doctor messaging, refill requests, and structured follow-up booking are out of this wave and MUST NOT appear as working features.
- **FR-013**: Auth flows (login, patient register with terms, verify, reset, role gates) MUST remain required for all protected sides.
- **FR-014**: New AI product work is out of this wave. Existing AI screens MAY remain but MUST NOT block the care loop if the AI provider is stubbed.

### Key Entities

- **Doctor schedule**: Weekly hours and unavailable days owned by the doctor; used to generate 30-minute bookable slots for the next 14 days. Absent schedule means no offers.
- **Appointment**: Hold → Confirmed → Checked in → In progress → Completed (also Cancelled, Rescheduled, No-show).
- **Video session**: Shared session for one appointment’s patient and doctor.
- **Clinical artifacts**: SOAP, clinical summary, prescription, lab result, medical record.
- **Notification**: In-app event with authorized deep link.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: A new patient can go from public site to a confirmed appointment with a published, scheduled doctor in one sitting without encountering unlabeled stub screens.
- **SC-002**: 100% of offered booking slots correspond to the doctor’s published schedule and conflict rules (zero invented stub hours in production). Offers MUST NOT extend beyond 14 days.
- **SC-003**: After doctor check-in, the patient can still find the same visit in the portal without hunting a hidden URL.
- **SC-004**: After the doctor signs a summary and a prescription, the patient can open both artifacts within one minute of signing.
- **SC-005**: A reviewer can list every primary care-loop button and classify each as working or honestly disabled — zero silent no-ops.
- **SC-006**: Wrong-role and unauthenticated access to patient/doctor/admin areas is denied without exposing clinical data.

## Assumptions

- Modules 001–008 remain the source specs for deep behavior; this feature only closes care-loop completeness gaps.
- Patient-only self-registration; doctors and admins stay invite/approve.
- Cancel/reschedule 12-hour rule and video join window (15 minutes before through 60 minutes after) stay as specified in 003/004.
- English and Arabic (RTL) remain required on all completed screens.
- HIPAA-ready architecture (authorization, audit, no PHI in URLs) remains in force; this is not a certification claim.
- Demo doctor accounts may ship with seeded weekly hours so booking can be tested immediately. Slot length is fixed at 30 minutes this wave. The booking horizon is the next 14 calendar days. Live video is used when the environment has a provider; otherwise the labeled demo room satisfies this wave.

## Out of scope (this wave)

- Native mobile apps.
- Insurance claims / Nphies integration.
- Pharmacy fulfillment and refill networks.
- Patient–doctor inbox messaging and structured post-visit follow-up booking.
- Collectible payments / pay-to-confirm.
- Public blog, pricing pages, and global search.
- New AI features or replacing the stub AI provider.
- OAuth / MFA (reserved in 002).
- Multi-doctor group practices and referral networks.