# Quickstart results: Payments & Billing

**Feature**: 010-payments-billing
**Date**: 2026-08-18
**Mode**: Automated unit/integration coverage + code review against [quickstart.md](./quickstart.md)

| Scenario | Result | Evidence |
|----------|--------|----------|
| 1. Patient checkout | PASS | Stub intent → PROCESSING → paid webhook → PAID; invoice `HK-INV-YYYY-NNNNNN`; checkout panel + receipt route |
| 2. Duplicate pay | PASS | Same stub intent id; paid webhook replay no-op |
| 3. Failed + retry | PASS | Failed→Processing allowed; 5 Failed/hour `RATE_LIMITED`; timeouts stay PROCESSING |
| 4. Refund request + partial | PASS | Patient request does not move money; admin partial + remainder; over-refund blocked |
| 5. Appointment consistency | PASS | Unpaid join blocked; cancel unpaid → CANCELLED; zero-price skips gate |
| 6. Doctor earnings | PASS | Summary = Paid − refunds; doctor RBAC cannot refund; `/doctor/earnings` |
| 7. Admin finance | PASS | Filters, revenue KPIs, stuck count, reconcile action, invalid signature rejected |
| 8. UI / i18n smoke | PASS | EN/AR key parity for `patient.payments`, `doctor.earnings`, `admin.billing` |

Live browser walkthrough of scenarios 1–8 still requires `PAYMENT_PROVIDER=stub`, migrated DB, and seeded demo accounts.
