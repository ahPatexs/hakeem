# Contract: Administration Portal API (Server Actions & Exports)

**Feature**: `005-admin-portal` | **Date**: 2026-07-30

Primary interface: **Server Actions** under `src/actions/admin/*` with Zod input and discriminated `ActionResult`. Route handlers only for streaming exports / optional health JSON.

Auth: Active `ADMIN` + `requirePermission(...)`. All sensitive successes/failures audited.

## Common result

```ts
type ActionResult<T = undefined> =
  | { ok: true; data?: T; message?: string }
  | { ok: false; code: AdminErrorCode };
```

### Error codes
| Code | Meaning |
|------|---------|
| `UNAUTHENTICATED` | No session |
| `FORBIDDEN` | Not ADMIN / missing permission |
| `VALIDATION_ERROR` | Zod / reason too short |
| `NOT_FOUND` | Unknown id (anti-enumeration where applicable) |
| `LAST_ADMIN` | Guardrail |
| `SELF_ACTION_BLOCKED` | Cannot suspend/deactivate self |
| `IDEMPOTENT_OK` | Already approved/rejected (optional treat as ok:true) |
| `REFUND_NOT_ALLOWED` | No balance / wrong status |
| `CONFLICT` | Concurrent update |
| `EXPORT_TOO_LARGE` | Exceeds row cap |
| `MAINTENANCE` | Shown to non-admins only |

## Dashboard

| Action | Perm | Behavior |
|--------|------|----------|
| `getDashboardSnapshot` | `admin:portal:access` | KPIs + recent activity ≤10 + notif ≤5; widget errors isolated in loader layer |

## Users

| Action | Perm | Behavior |
|--------|------|----------|
| `listUsers` | `admin:users:read` | search email/name; filter role/status; page 20 |
| `getUser` | `admin:users:read` | detail + lockout flags |
| `suspendUser` | `admin:users:write` | reason ≥10; revoke sessions+refresh; audit `admin.user.status_change` |
| `reinstateUser` | `admin:users:write` | → ACTIVE; audit |
| `deactivateUser` | `admin:users:write` | soft; audit; last-admin/self guards |
| `unlockUser` | `admin:users:write` | clear lockout; audit |
| `revokeUserSessions` | `admin:users:write` | force sign-out |

## Doctors

| Action | Perm | Behavior |
|--------|------|----------|
| `listDoctors` | `admin:doctors:approve` or read | filter approval/status |
| `listPendingDoctors` | `admin:doctors:approve` | queue |
| `createDoctorUser` | `admin:doctors:provision` | existing Auth behavior |
| `approveDoctor` | `admin:doctors:approve` | idempotent; invite password; bookable side effect; audit |
| `rejectDoctor` | `admin:doctors:approve` | reason ≥10; audit |
| `suspendDoctor` | `admin:users:write` | suspend account + unbookable + revoke; flag future appts |

## Appointments (ops)

| Action | Perm | Behavior |
|--------|------|----------|
| `listAppointments` | `admin:appointments:read` | filters date/status/doctor/patient |
| `getAppointmentOps` | `admin:appointments:read` | ops fields only (no SOAP editor) |
| `cancelAppointmentAdmin` | `admin:appointments:write` | reason; notify parties; audit `admin.appointment.cancel` |
| `flagAppointment` | `admin:appointments:write` | meta flag + audit |

## AI operations

| Action | Perm | Behavior |
|--------|------|----------|
| `getAiOpsSnapshot` | `admin:ai:ops` | usage + errors + flags |
| `setAiFeatureToggle` | `admin:ai:ops` | PlatformSetting key; audit `admin.ai.toggle` |
| `disableUserAi` / `enableUserAi` | `admin:ai:ops` | reason on disable; audit |
| `listFlaggedAi` / `reviewFlaggedAi` | `admin:ai:ops` | review note; audit |

## Billing & revenue

| Action | Perm | Behavior |
|--------|------|----------|
| `listTransactions` | `admin:billing:read` | filters status/date |
| `getTransaction` | `admin:billing:read` | |
| `refundTransaction` | `admin:billing:refund` | amount ≤ refundable; reason; audit `admin.billing.refund` |
| `markDispute` | `admin:billing:refund` | note; audit `admin.billing.dispute` |
| `getRevenueSummary` | `admin:billing:read` | gross/refunds/net for period |

## Analytics & exports

| Action / Route | Perm | Behavior |
|----------------|------|----------|
| `getAnalyticsSeries` | `admin:analytics:read` | domain + period → series DTO |
| `GET /api/admin/exports/analytics` | `admin:analytics:read` | CSV; ≤10k; audit `admin.export.analytics` |
| `GET /api/admin/exports/audit` | `admin:audit:read` | CSV; ≤10k; audit `admin.export.audit` |

## Settings & health

| Action | Perm | Behavior |
|--------|------|----------|
| `getPlatformSettings` / `updatePlatformSettings` | `admin:settings:write` (read: portal access) | validate; audit before/after |
| `getSystemHealth` / `refreshSystemHealth` | `admin:health:read` | run checks; persist snapshot |

## Audit

| Action | Perm | Behavior |
|--------|------|----------|
| `listAuditEvents` | `admin:audit:read` | filters; page 20; **no mutate** |

## Notifications & announcements

| Action | Perm | Behavior |
|--------|------|----------|
| `listAdminNotifications` | `admin:portal:access` | |
| `markNotificationRead` / `markAllNotificationsRead` | `admin:portal:access` | |
| `publishAnnouncement` | `admin:notifications:write` | segment; audit; omit if Stitch lacks UI |

## Roles

| Action | Perm | Behavior |
|--------|------|----------|
| `listRolesMatrix` | `admin:roles:write` or read | static matrix + user role list |
| `assignUserRole` | `admin:roles:write` | primary role; last-admin; audit `admin.user.role_change` |
| `inviteAdmin` | `admin:roles:write` | existing invite flow |

## Audit event types (admin module)

`admin.user.status_change` · `admin.user.role_change` · `admin.doctor.create` · `admin.doctor.approve` · `admin.doctor.reject` · `admin.invite` · `admin.appointment.cancel` · `admin.billing.refund` · `admin.billing.dispute` · `admin.settings.change` · `admin.ai.toggle` · `admin.ai.user_disable` · `admin.ai.flag_review` · `admin.announcement.publish` · `admin.export.audit` · `admin.export.analytics` · `admin.access.denied`
