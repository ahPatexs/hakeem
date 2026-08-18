# Feature Specification: Payments & Billing

**Feature Branch**: `010-payments-billing`

**Created**: 2026-08-18

**Status**: Draft

**Input**: User description: "Module 8: Payments & Billing — complete financial lifecycle of Hakeem consultations and healthcare services: payment processing, invoices, transactions, refunds, payment status, billing history, and financial reporting. Patient, Doctor, and Administrator roles. Payment provider integration remains behind the shared Payment Service / adapter from Module 5. Do not redesign the UI; use the approved Stitch MCP design as the single source of truth."

## Clarifications

### Session 2026-08-18

Non-interactive clarification pass: user directed **do not ask questions**; identify missing business and technical requirements; apply enterprise-grade assumptions; document every assumption. Validated: payment provider strategy, idempotency, duplicate payment prevention, webhook handling, payment reconciliation, refund policy, partial refunds, failed payments, payment retries, currency handling, taxes, invoice numbering, receipt generation, transaction audit logs, payment security, PCI compliance boundaries, sensitive payment data handling, appointment/payment consistency.

- Q: Payment provider strategy? → A: **One primary payment provider** behind the Module 5 shared Payment Service. This module never talks to a second provider or embeds a private gateway. Cards and local methods are whatever that provider offers in **SAR**. Non-production may use the existing demo/stub path; production uses the same service boundary. Multi-provider routing, split settlement, and doctor bank payouts remain **out of v1**.
- Q: Idempotency? → A: Every pay submit and every provider outcome is applied **at most once**. Pay submits share a stable key per payment obligation (plus attempt identity). Provider outcome notices share a unique provider event identity. Replays return success without a second money movement or status regression.
- Q: Duplicate payment prevention? → A: **At most one successful capture** per obligation. While status is **Processing**, further Pay actions are blocked. Retry is allowed only after **Failed** (or after a confirmed no-capture). Rapid double-tap, refresh, and back-button resubmit cannot create two Paid charges.
- Q: Webhook handling? → A: Signed (or shared-secret) **provider outcome notices** are the **system of record** for asynchronous success/failure. Unsigned or invalid notices are rejected and do not change money state. Notices with a signed timestamp outside a **≤5 minute** skew window are rejected. Same event identity is a no-op. Status only moves **forward** (never Paid → Pending). Client “success” is **provisional** until the notice or reconcile confirms. Heavy side effects (notifications, receipts) run after the money state is recorded.
- Q: Payment reconciliation? → A: Obligations left **Processing** longer than **15 minutes** appear in Administrator finance as stuck/in-flight. Ops reconcile those against the provider at least **daily** and on demand. Reconcile and outcome notices update the **same** obligation. If the provider captured money that Hakeem marked Failed, Hakeem **corrects to Paid** (one charge) and notifies the Patient — never a second capture. If Hakeem is Processing and the provider has no capture after the reconcile window (**30 minutes** default), status becomes **Failed** and retry is allowed.
- Q: Refund policy? → A: **Patient-request eligible** when remaining captured balance > 0 **and** the related appointment was cancelled **before scheduled start**. **Not** patient-eligible: no-show, completed visit, cancel at/after start, or already fully refunded. **Administrators** may still refund any remaining balance (goodwill, error correction, disputes) with a **mandatory reason** and confirmation. Patient requests do **not** move money until an Administrator **approves**. Doctors never approve refunds. Rejected requests stay visible with the reason; they do not change status.
- Q: Partial refunds? → A: Patients request the **full remaining** balance. **Only Administrators** choose a partial amount (greater than zero, not more than remaining). Multiple partials are allowed until remaining is zero, then status is **Refunded**. Each partial is its own audited money movement and credit document.
- Q: Failed payments? → A: **Failed** means the provider **declined** or reconcile confirmed **no capture**. Failed items are not revenue. The appointment stays unpaid. User-facing copy is safe (no raw provider codes). **Hard declines** (e.g. insufficient funds, blocked card) go to Failed immediately. **Timeouts and unknown outcomes stay Processing** until notice or reconcile — they must not become Failed immediately (that is how duplicate charges happen).
- Q: Payment retries? → A: After **Failed**, the Patient may retry the same obligation. Pay is disabled during **Processing**. Excessive failed retries are **rate-limited** (max **5 Failed attempts per obligation per hour**; then a cooldown with a clear message). Retries reuse the same obligation; they never create a second obligation for the same appointment.
- Q: Currency handling? → A: **SAR only**. Amounts are stored and shown to **two decimal places** (halalas). No foreign-exchange conversion. Locale affects numerals/grouping only; the currency code remains SAR. Price on the obligation is **locked at creation** (booking); later catalog/doctor fee changes do not alter existing obligations.
- Q: Taxes? → A: **No tax engine in v1**. The displayed consultation price **is** the amount charged (treated as a single gross total). Invoices do not compute VAT/line tax. Future VAT rate or tax ID, if required, is a configuration/legal change — not this module’s calculator. Aligns with Administration Portal: no tax engine.
- Q: Invoice numbering? → A: On first **Paid**, the obligation receives a unique, never-reused **invoice number** (human-readable, sequential per calendar year in Asia/Riyadh). Refunds do not replace that number; each refund issues a unique **credit note number** linked to the original invoice. Gaps from cancelled drafts are acceptable; reuse is not.
- Q: Receipt generation? → A: After Paid, the Patient can view an on-screen invoice and **download/print a receipt** matching Stitch. Receipt includes invoice number, amount, currency, date/time (Asia/Riyadh), visit/service reference, status, and payment-method brand/last four **only if** the provider supplied them. Full card numbers never appear. Each completed refund produces a downloadable credit/refund receipt. Receipts for never-captured items are not offered.
- Q: Transaction audit logs? → A: **Append-only**, not editable or deletable in product UIs. Events: pay submit, outcome applied, refund request, refund approve/reject, partial/full refund executed, billing configuration change, invoice/receipt download, reconcile correction. Each event: actor, action, obligation/transaction ids, amounts, outcome, time, optional reason. **Retention ≥6 years** (aligned with Patient Portal financial/PHI-adjacent audit). Operational diagnostics are separate and **must not** hold card secrets.
- Q: Payment security? → A: Every read/pay/refund is **authorized** for that role and record. Pay and refund require **explicit confirmation** where Stitch shows it. Sessions expired mid-pay do not mark Paid. Transport is encrypted. Identifiers are not enumerable across patients. Destructive money actions are confirmed and audited.
- Q: PCI compliance boundaries? → A: Hakeem is **not** a cardholder-data environment. **PAN, CVV, and track data are never entered into, stored by, or logged by Hakeem.** Card capture happens on the **provider-hosted** checkout (fields or redirect) via Module 5. Hakeem may store provider tokens, obligation ids, amounts, status, and brand/last four. Production go-live assumes the provider’s PCI attestation; Hakeem does not claim PCI certification of its own card vault (there is none).
- Q: Sensitive payment data handling? → A: Allowed to persist: amounts, SAR, status, invoice/credit numbers, provider references, method brand/last four, payer identity already known to the account. **Forbidden** in databases, logs, URLs, analytics, and support copies: PAN, CVV, full magnetic/track data, unredacted webhook secrets, raw provider bodies in user UI. Support and Doctor views never show card numbers.
- Q: Appointment/payment consistency? → A: **One payment obligation per payable appointment** (1:1). Price > 0 appointments are **not joinable / not treated as ready for the visit** until status is **Paid** (or remaining balance rules after partial refund still require original Paid before start). Cancel **before any capture** → obligation **Cancelled**. Cancel **after Paid** → stays Paid until refund policy runs; the visit does not stay “unpaid.” Completed unpaid visits remain **owed**; they do not auto-cancel the debt. Free (zero-price) visits skip payment. Doctor earnings count only captured amounts minus refunds for **their** appointments.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Patient pays for a consultation (Priority: P1)

A Patient books or confirms a visit, sees the consultation price in Saudi Riyals, chooses an available payment method, and completes payment. While the charge is in flight they see **Processing**. When it succeeds they see **Paid**, an invoice number, and a downloadable receipt. If it fails they see a clear **Failed** state and can try again without being charged twice. Card details are entered only at the payment provider, never into Hakeem forms that Hakeem stores.

**Why this priority**: No paid visit can complete without a trustworthy charge. Duplicate charges destroy trust.

**Independent Test**: As a Patient, open a payable appointment, confirm the displayed price, pay, and observe status move Pending → Processing → Paid (or Failed). Retry after failure creates at most one successful charge for that visit. Double-submit during Processing does not create a second charge.

**Acceptance Scenarios**:

1. **Given** a Patient has a visit that requires payment, **When** they open it, **Then** they see the consultation price, SAR, and current payment status matching the locked obligation amount.
2. **Given** the Patient selects a payment method and confirms pay, **When** the charge is submitted, **Then** status becomes Processing until a signed provider outcome or reconcile records a final result; further Pay is blocked while Processing.
3. **Given** payment succeeds, **When** they return to the visit or billing history, **Then** status is Paid, a unique invoice number exists, and they can view the invoice and download a receipt.
4. **Given** payment is declined, **When** they view the visit, **Then** status is Failed, they are not marked paid, the visit is not joinable, and they can retry without creating a second successful charge.
5. **Given** the Patient cancels the appointment before a successful charge, **When** they view billing, **Then** status is Cancelled and no receipt of payment is offered.
6. **Given** a network timeout after Pay, **When** the outcome is unknown, **Then** status stays Processing (not Failed) until the provider outcome or reconcile confirms capture or no-capture.

---

### User Story 2 - Patient billing history, invoices, and refunds (Priority: P1)

A Patient opens billing history to see past payments, invoices, credit notes, and statuses (including Refunded and Partially Refunded). They download receipts for collected amounts. When a refund is allowed, they request the remaining balance; money moves only after Administrator approval.

**Why this priority**: Transparent billing is a stated business goal and the main way patients resolve “was I charged?” questions.

**Independent Test**: As a Patient, list history, open one Paid item, download a receipt, request a refund when the appointment was cancelled before start, and after admin approval see Refunded or Partially Refunded with a credit note.

**Acceptance Scenarios**:

1. **Given** the Patient has completed payments, **When** they open payment history, **Then** they see each charge with date, visit/service, amount, invoice number, and status (default last 24 months, filterable).
2. **Given** a Paid (or later refunded) item, **When** they view the invoice, **Then** they see payer, gross amount, status, invoice number, and visit reference consistent with the charge.
3. **Given** a Paid item, **When** they download a receipt, **Then** they receive a save/print artifact that never includes a full card number.
4. **Given** the related appointment was cancelled before scheduled start and remaining balance > 0, **When** they request a refund, **Then** the request is recorded as under review; status does not become Refunded until an Administrator approves.
5. **Given** a refund is not patient-eligible (no-show, completed visit, already fully refunded), **When** they attempt to request, **Then** they see why it is not available and no extra money movement is created.
6. **Given** an Administrator rejects the request, **When** the Patient views the item, **Then** they see the rejection reason and the item remains Paid (or Partially Refunded) with unchanged remaining balance.

---

### User Story 3 - Doctor earnings and paid consultations (Priority: P2)

A Doctor opens an earnings area to see consultation revenue, which visits were paid, payment status for those visits, a period earnings summary, and a transaction history of money related to their consultations. They cannot take payouts, see card data, or change charges from this module.

**Why this priority**: Doctors need financial visibility for completed paid work; settlement/payouts stay out of v1 to keep the payment adapter boundary intact.

**Independent Test**: As a Doctor, open earnings, filter or view a period summary, open a completed paid visit, and confirm amounts match the patient’s paid consultation minus refunds — with no pay or refund controls.

**Acceptance Scenarios**:

1. **Given** the Doctor has completed paid visits, **When** they open earnings, **Then** they see a summary of revenue for a selectable period (at least current month and a recent range) in SAR.
2. **Given** paid consultations exist, **When** they list completed paid consultations, **Then** each row shows visit, patient identifier appropriate to their role, amount, and payment status.
3. **Given** a visit is unpaid or failed, **When** they view payment status for that visit, **Then** they see it is not counted as collected revenue.
4. **Given** refunds occurred on their visits, **When** they view transaction history, **Then** refunds reduce displayed earnings for those visits and statuses show Refunded or Partially Refunded.
5. **Given** the Doctor is signed in, **When** they use earnings views, **Then** they only see money tied to their own consultations and never full card numbers.

---

### User Story 4 - Administrator financial operations (Priority: P1)

An Administrator reviews all transactions, platform revenue, refunds, failed payments, stuck Processing items, and payment analytics; manages billing configuration; approves or rejects patient refund requests; issues full or partial refunds with reason; and reviews financial audit logs.

**Why this priority**: Finance and operations cannot run the platform without a single accurate picture of money in and money out.

**Independent Test**: As an Administrator, list all transactions, filter failed and refunded, open stuck Processing, complete or reject a patient refund request, issue a partial refund, change an allowed billing setting, and confirm each sensitive action appears in the financial audit log.

**Acceptance Scenarios**:

1. **Given** charges exist across patients, **When** the Administrator opens transactions, **Then** they can view all of them with status, amount, payer, visit/service, invoice number, and time.
2. **Given** a date range, **When** they view revenue, **Then** they see aggregated gross, refunds, and net suitable for operational review (Failed and Cancelled excluded from gross collected).
3. **Given** failed payments exist, **When** they filter Failed, **Then** they see those attempts without treating them as revenue.
4. **Given** a patient refund request or a remaining refundable balance, **When** they approve a full or partial refund within remaining balance with a reason, **Then** status becomes Refunded or Partially Refunded, a credit note is issued, the patient can see the update, and the action is audited.
5. **Given** they open financial audit logs, **When** they inspect a refund, reconcile correction, or configuration change, **Then** they see who did it, when, amounts, and what changed — with no card secrets.
6. **Given** billing configuration, **When** they update allowed settings (refund eligibility messaging already in product, whether a service type is payable), **Then** **new** visits follow the new rules; existing locked obligation amounts do not change; the change is audited.
7. **Given** obligations Processing longer than 15 minutes, **When** they open finance operations, **Then** they can see them as in-flight and trigger or review reconcile so records match the provider.

---

### User Story 5 - Accurate lifecycle and no duplicate charges (Priority: P1)

Every payable item follows a single lifecycle: **Pending**, **Processing**, **Paid**, **Failed**, **Cancelled**, **Refunded**, **Partially Refunded**. Status only moves forward in allowed ways. Replays, double-clicks, repeated Pay, and duplicate provider notices must not create two successful charges for the same obligation.

**Why this priority**: Accurate records and duplicate-charge prevention are explicit business goals.

**Independent Test**: Create one payable visit; pay twice in rapid succession; confirm one success. Replay a signed provider success notice; confirm no second charge and no status regression. Refund more than remaining balance; confirm rejection. Mark Failed then discover a capture on reconcile; confirm correction to a single Paid.

**Acceptance Scenarios**:

1. **Given** a new payable visit, **When** it is created, **Then** exactly one obligation exists at the locked price and status is Pending until the Patient starts pay.
2. **Given** pay has been submitted, **When** the provider has not yet confirmed, **Then** status is Processing and Pay is disabled.
3. **Given** status is Paid, **When** a duplicate success notice arrives, **Then** records stay a single Paid charge (idempotent) with the same invoice number.
4. **Given** status is Paid, **When** a full refund completes, **Then** status is Refunded; a partial refund leaves Partially Refunded until remaining balance is zero.
5. **Given** status is Cancelled or Failed with no successful capture, **When** refund is attempted, **Then** it is not offered or is rejected.
6. **Given** Processing lasts beyond 15 minutes, **When** the Patient or Administrator views it, **Then** they see it is still in progress (not silently Paid) until a final outcome is recorded.
7. **Given** an invalid or unsigned provider notice, **When** it is received, **Then** money state does not change.

---

### User Story 6 - Appointment and payment stay consistent (Priority: P1)

A payable appointment and its obligation stay in lockstep: unpaid visits cannot be consumed as if paid; cancelled unpaid visits do not stay collectible as Pending forever; paid then cancelled visits remain Paid until refund policy runs.

**Why this priority**: Clinical access and money state must not diverge (join without paying, or paid without a visit record).

**Independent Test**: Attempt to join a paid-required visit while Pending/Failed — blocked. Pay then join — allowed. Cancel before pay — Cancelled. Cancel after pay — still Paid until refund. Confirm one obligation per appointment.

**Acceptance Scenarios**:

1. **Given** a visit with price greater than zero and status not Paid, **When** the Patient or Doctor tries to start/join that visit, **Then** the visit is not treated as ready; they are directed to complete payment (Patient) or see unpaid status (Doctor).
2. **Given** status is Paid, **When** the scheduled visit window is valid, **Then** join/start is not blocked for payment reasons.
3. **Given** the appointment is cancelled before any capture, **When** billing is viewed, **Then** the obligation is Cancelled and Pay is not offered.
4. **Given** the appointment is cancelled after Paid, **When** billing is viewed, **Then** status remains Paid until a refund is approved; the Patient may request a refund if cancelled before scheduled start.
5. **Given** a zero-price visit, **When** the Patient opens it, **Then** no charge is required and payment does not block the visit.

---

### Edge Cases

- Patient taps Pay twice or refreshes during Processing — at most one successful charge for that visit; second submit is ignored or returns the in-flight attempt.
- Provider confirms success after the Patient already sees Failed — reconcile **corrects to Paid** for the single capture; Patient is notified; no second charge.
- Provider notice arrives twice with the same event identity — second is a no-op.
- Unsigned, invalid, or skewed (>5 minutes) provider notice — rejected; no state change.
- Refund requested for more than the remaining paid amount — rejected; remaining balance unchanged.
- Refund after already fully Refunded — blocked with a clear reason.
- Visit cancelled after Paid — Patient may request if before start; money does not move until Administrator approves; status does not stay Paid if money is returned.
- Visit cancelled before any successful charge — Cancelled; no receipt of payment.
- No-show or completed visit — Patient refund request unavailable; Administrator may still refund remaining balance with reason.
- Doctor views a visit paid by the Patient then refunded — earnings exclude refunded amounts.
- Administrator without billing permission — cannot refund, change billing configuration, or export financial detail.
- Download receipt when never captured — not offered.
- Partial refund then another partial refund — allowed until remaining balance is zero, then Refunded.
- Failed payment with no money captured — not listed as revenue; Patient may retry until rate limit (5 Failed attempts per hour per obligation).
- Session expires mid-pay — not marked Paid; obligation remains Pending, Processing, or Failed per last confirmed provider state.
- Price change on the doctor’s future slots — does not change an already created obligation.
- Two appointments — two obligations; paying one never pays the other.
- Dispute/chargeback reported operationally — Administrator annotation (existing Disputed handling from Administration Portal) does not replace the seven user-facing statuses; finance still shows the money truth after refunds.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST present the consultation (or payable service) price to the Patient before they confirm pay, in SAR, matching the locked obligation amount that will be charged.
- **FR-002**: Patients MUST be able to select an available payment method and submit payment for a payable appointment or service; card capture MUST occur only at the payment provider (never stored by Hakeem).
- **FR-003**: System MUST record and display payment status using: Pending, Processing, Paid, Failed, Cancelled, Refunded, Partially Refunded.
- **FR-004**: Patients MUST be able to view current payment status on the relevant visit and in payment history.
- **FR-005**: Patients MUST be able to view payment history for their own charges (date, amount, status, invoice number, related visit/service); default last 24 months with status/date filters.
- **FR-006**: Patients MUST be able to view invoices for their charges and download receipts for payments that were successfully collected (including items later refunded, clearly labeled, with credit notes for refunds).
- **FR-007**: Patients MUST be able to request a refund of remaining balance when the related appointment was cancelled before scheduled start and remaining captured amount > 0; ineligible items MUST explain why; requests MUST NOT move money until Administrator approval.
- **FR-008**: Doctors MUST be able to view consultation revenue and an earnings summary for a selectable period, limited to their own consultations, excluding Failed/Cancelled and subtracting refunds.
- **FR-009**: Doctors MUST be able to view completed paid consultations, payment status for those visits, and a transaction history (charges and refunds) for their consultations.
- **FR-010**: Doctors MUST NOT initiate patient charges, capture cards, issue refunds, or see full card numbers.
- **FR-011**: Administrators MUST be able to view all transactions, revenue (gross, refunds, net), refunds, failed payments, in-flight Processing items older than 15 minutes, and payment analytics over a selectable period.
- **FR-012**: Administrators MUST be able to manage billing configuration exposed by the product (payable services/prices for **new** obligations, refund-eligibility messaging) with audit of changes; existing obligation amounts stay locked.
- **FR-013**: Administrators MUST be able to review financial audit logs for payment, refund, reconcile, invoice/receipt access, and billing-configuration events (actor, time, action, amounts, target); logs are append-only in product UIs; retention ≥6 years.
- **FR-014**: Administrators with billing permission MUST be able to approve, reject, or originate full or partial refunds up to the remaining captured amount with mandatory reason and confirmation; over-refunds MUST be rejected; each executed refund MUST issue a unique credit note number.
- **FR-015**: System MUST prevent duplicate successful charges for the same payment obligation (idempotent pay submit, blocked Pay while Processing, idempotent provider outcomes by event identity).
- **FR-016**: System MUST keep a durable, accurate transaction record for every money movement (charge attempt outcome and refund), suitable for history, invoices, credit notes, and admin review.
- **FR-017**: All card capture and provider settlement MUST go through the existing shared Payment Service from Module 5; this module MUST NOT introduce a second payment provider or bypass that service.
- **FR-018**: Role boundaries MUST hold: Patients see only their bills; Doctors see only earnings from their consultations; Administrators see platform-wide finance according to permission.
- **FR-019**: Payment and billing screens MUST follow the approved Stitch MCP designs already used in Patient, Doctor, and Admin portals; this module MUST NOT introduce a redesigned visual system for checkout, history, invoices, earnings, or admin finance.
- **FR-020**: English and Arabic (including right-to-left where the rest of the portal is RTL) MUST be supported for patient- and doctor-facing billing copy; amounts remain SAR with locale-aware formatting; times use Asia/Riyadh for financial documents.
- **FR-021**: Sensitive payment actions (pay submit, refund request, refund decision, billing configuration change, reconcile correction) MUST be auditable.
- **FR-022**: Failed and cancelled items MUST NOT be counted as collected revenue; refunds MUST reduce net revenue and doctor earnings associated with the original consultation.
- **FR-023**: Signed provider outcome notices MUST be verified; invalid, unsigned, or timestamp-skewed (>5 minutes when a timestamp is signed) notices MUST be rejected without changing money state; duplicate event identities MUST be no-ops; client success is provisional until notice or reconcile confirms.
- **FR-024**: System MUST reconcile in-flight Processing obligations against the provider (Administrator-visible after 15 minutes; no-capture after 30 minutes → Failed and retry allowed; captured-but-locally-Failed → correct to a single Paid and notify the Patient).
- **FR-025**: Currency MUST be SAR only, two decimal places; no conversion; obligation price locked at creation.
- **FR-026**: System MUST NOT calculate taxes or VAT line items in v1; the locked price is the gross amount charged.
- **FR-027**: System MUST assign a unique never-reused invoice number when an obligation first becomes Paid, sequential per calendar year (Asia/Riyadh).
- **FR-028**: Receipts and invoices MUST omit PAN/CVV; they MAY show brand and last four only if supplied by the provider.
- **FR-029**: Hakeem MUST NOT store, log, or accept into its own forms PAN, CVV, or track data; only provider tokens and non-sensitive payment metadata.
- **FR-030**: Payable appointments MUST have exactly one obligation; visits with price > 0 MUST NOT be joinable/startable until Paid; cancel before capture → Cancelled; cancel after Paid leaves Paid until refund; zero-price visits skip payment.
- **FR-031**: After Failed, Patients MAY retry the same obligation; retries are rate-limited to 5 Failed attempts per obligation per hour; unknown/timeout outcomes MUST stay Processing rather than Failed until confirmed.
- **FR-032**: Patient refund requests are for the full remaining balance; only Administrators MAY set a partial refund amount greater than zero and ≤ remaining.
- **FR-033**: Pay and refund actions MUST require explicit confirmation when Stitch specifies it; expired sessions MUST NOT mark an obligation Paid.

### Key Entities

- **Payment obligation**: The amount due for exactly one payable appointment (or payable service), with locked SAR amount, current lifecycle status, remaining refundable balance, and invoice number once Paid.
- **Payment attempt / transaction**: A recorded try to collect or return money (success, failure, or refund), linked to one obligation, with provider references and event identity for idempotency.
- **Invoice**: Patient-visible statement of what was billed, identified by a unique invoice number assigned on first Paid.
- **Credit note**: Document of a refund movement, unique number, linked to the original invoice.
- **Receipt**: Downloadable proof of a successful collection or of a refund; never contains full card data.
- **Refund request**: Patient-initiated ask to return remaining balance; pending Administrator decision; does not itself capture or return money.
- **Earnings summary**: Doctor-facing roll-up of collected amounts minus refunds for their consultations in a period.
- **Billing configuration**: Administrator-managed rules that affect what is payable for **new** obligations and how refund eligibility is presented (not a new payment provider, not a tax engine).
- **Financial audit event**: Append-only record of who changed money or billing rules, when, amounts, and on which obligation.
- **Provider outcome notice**: Authenticated message from the payment provider used to confirm capture, failure, or refund; system of record with the reconcile process.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: A Patient can see price, choose a method, and reach a final Paid or Failed result for a test visit in under 3 minutes in a normal session (excluding bank/payer-authentication wait time outside the product).
- **SC-002**: In duplicate-pay tests (double submit, refresh, or replayed success notice), 100% of cases result in at most one successful charge per obligation.
- **SC-003**: After a successful pay, 100% of test Patients can open history, see Paid, see an invoice number, open the invoice, and download a receipt without contacting support.
- **SC-004**: Refunds never exceed remaining captured amount in test and review; over-refund attempts are rejected 100% of the time; patient requests never move money until approval.
- **SC-005**: Doctor earnings for a period match the sum of their consultations’ collected amounts minus refunds, within one halala of displayed SAR (no extra or missing visits).
- **SC-006**: An Administrator can answer “what was collected, refunded, failed, and still Processing this period?” from the finance views without exporting raw provider files, for the same period the product displays.
- **SC-007**: At least 95% of Patients in usability review can state their latest payment status correctly from the portal (Paid, Failed, Processing, or Refunded) on first look.
- **SC-008**: Financial audit review can reconstruct actor, time, and amount for refund decisions, billing configuration changes, and reconcile corrections sampled from a test period (100% of sampled sensitive actions present).
- **SC-009**: No Patient, Doctor, or Administrator finance screen in this module introduces a new visual language; screens remain recognizable against the approved Stitch designs already used for payments and billing.
- **SC-010**: Invalid or replayed provider outcome notices never create a second charge or a backward status in 100% of tests.
- **SC-011**: Stored records, receipts, invoices, and audit exports in test contain **zero** full card numbers or CVV values.
- **SC-012**: 100% of paid-required test visits refuse join/start while not Paid, and allow join after Paid (within the visit’s normal time rules).
- **SC-013**: Invoice numbers assigned on Paid are unique in 100% of tests; two Paid obligations never share a number.
- **SC-014**: After a simulated timeout, test obligations remain Processing (not Failed) until a confirmed decline or a 30-minute no-capture reconcile; 100% of those cases avoid a second capture on retry-before-confirm.

## Assumptions

- Currency is SAR only for v1 (same as Module 5 billing). Multi-currency ledgers and doctor bank payouts are out of scope.
- Card collection, payer authentication (e.g. 3-D Secure), signed outcome notices, and refund execution stay inside the Module 5 Payment Service. This module owns product workflows, user-visible status, invoices, receipts, refund requests, doctor visibility, appointment consistency, and admin finance operations on top of that service.
- Existing Patient payments views, Admin billing/revenue views, and any Stitch checkout/status screens are the visual source of truth; copy and fields may be completed but layout/theme must not be redesigned.
- “Processing” is the in-flight state after the Patient confirms pay and before a final provider outcome or reconcile. Administrator-side **Disputed** annotation from the Administration Portal remains operational overlay and does not replace the seven user-facing lifecycle states.
- Patient refund requests require Administrator approval before money moves. Doctors do not approve refunds. Default patient eligibility is **cancel before scheduled start** only.
- Demo or test payment paths already used on the platform may stand in for a live card scheme in non-production; production still uses the single shared adapter.
- Invoices and receipts may be the same underlying statement presented as on-screen invoice vs downloadable receipt if Stitch treats them that way; credit notes are required when refunds execute even if Stitch shows them as a labeled receipt.
- Consultation price comes from the appointment/service at obligation creation; this module does not invent a separate catalog UI.
- Notifications of payment success, failure, refund decision, and refund completion reuse existing notification channels; this spec does not add a new notification product.
- Authentication, roles, and portal shells already exist; this module adds or completes billing capabilities inside those shells.
- No tax engine, VAT line calculator, insurance claims adjudication, general ledger, or payroll in v1. Gross price charged = displayed price.
- PCI: Hakeem never holds PAN/CVV; compliance of card capture is the provider’s attested environment plus Hakeem’s boundary (tokens and metadata only). This is a HIPAA-ready / PCI-boundary architecture, not a claim of PCI or HIPAA certification.
- Reconcile window defaults (15 minutes visible stuck, 30 minutes no-capture → Failed) are operational defaults Administrators may tighten later via billing configuration if the product already exposes such settings; if not exposed in Stitch, the defaults apply.
- Rate limit of 5 Failed attempts per obligation per hour is an anti-abuse default, not a credit-score or fraud-engine product.
- Financial document timestamps use Asia/Riyadh; invoice sequence resets conceptually per calendar year in that zone.
- Chargeback network case management remains out of v1 beyond Administrator notes and refunds already specified in the Administration Portal.

### Out of scope (v1)

- Second payment provider, smart routing, or marketplace split payouts to doctor bank accounts.
- Multi-currency, FX, or tax/VAT calculation engine.
- Patient-chosen partial refund amounts.
- Automatic refund without Administrator approval.
- Storing or keying card numbers inside Hakeem.
- Redesigning checkout, billing, earnings, or finance UI away from approved Stitch.
- Replacing the Module 5 Payment Service with portal-local provider calls.
