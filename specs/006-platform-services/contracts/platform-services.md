# Contract: Platform Services APIs & Facades

**Feature**: `006-platform-services` | **Date**: 2026-07-30

Technology-agnostic behavior with TypeScript-shaped facades matching the Next.js app. HTTP only for webhooks and cron.

## Outcome taxonomy

```ts
type PlatformCode =
  | "OK"
  | "PARTIAL_SUCCESS"
  | "VALIDATION_ERROR"
  | "UNAUTHORIZED"
  | "FORBIDDEN"
  | "NOT_FOUND"
  | "CONFLICT"
  | "RATE_LIMITED"
  | "DEPENDENCY_UNAVAILABLE"
  | "INTERNAL_FAILURE";

type PlatformResult<T> =
  | { ok: true; data: T; code?: "OK" | "PARTIAL_SUCCESS"; channelStatuses?: Record<string, PlatformCode> }
  | { ok: false; code: PlatformCode; message?: string };
```

## Facades (`lib/platform/*`)

### Notifications

```ts
notify(input: {
  recipientUserId: string;
  eventType: string;
  category: string;
  title: string;
  body: string;
  href?: string;
  locale?: "en" | "ar";
  data?: Record<string, string>;
}): Promise<PlatformResult<{ notificationId: string }>>;

markNotificationRead(input: { id: string; userId: string }): Promise<PlatformResult<void>>;
markAllNotificationsRead(input: { userId: string }): Promise<PlatformResult<{ count: number }>>;
```

**Rules**: Apply channel matrix; in-app sync; email/SMS/push via jobs; PartialSuccess if any mirror fails.

### Email / SMS / Push

```ts
sendEmail(input: { to: string; subject: string; text: string; html?: string; purpose: string; locale?: "en" | "ar"; idempotencyKey: string }): Promise<PlatformResult<{ messageId: string }>>;
sendSms(input: { to: string; body: string; purpose: string; idempotencyKey: string }): Promise<PlatformResult<{ messageId: string }>>;
sendPush(input: { userId: string; title: string; body: string; href?: string; idempotencyKey: string }): Promise<PlatformResult<void>>;
```

Unauthenticated Auth flows may call `sendEmail` with anti-enumeration handled by caller.

### Payments / Billing

```ts
createPaymentIntent(input: { obligationId: string; idempotencyKey: string }): Promise<PlatformResult<PaymentIntentResult>>;
applyPaymentWebhook(input: { rawBody: string; signature: string }): Promise<PlatformResult<{ eventId: string; applied: boolean }>>;
refundObligation(input: { obligationId: string; amountCents: number; reason: string; actorUserId: string }): Promise<PlatformResult<void>>;
```

### AI

```ts
assertAiAllowed(userId: string, feature: "patient" | "doctorDocumentation" | "doctorPrescription"): Promise<boolean>;
chat(input: AiChatInput & { userId: string; feature: ... }): Promise<PlatformResult<AiChatResult>>;
```

### Documents / Storage

```ts
uploadMedicalFile(input: { userId: string; file: Bytes; fileName: string; contentType: string; purpose: string }): Promise<PlatformResult<{ uploadId: string; scanStatus: "PENDING" }>>;
getDownloadUrl(input: { userId: string; documentId: string }): Promise<PlatformResult<{ url: string; expiresAt: string }>>;
```

### Video

```ts
createConsultationSession(input: { appointmentId: string; actorUserId: string }): Promise<PlatformResult<{ roomId: string }>>;
getJoinCredentials(input: { appointmentId: string; actorUserId: string }): Promise<PlatformResult<{ token: string; url: string; expiresAt: string }>>;
```

### Search

```ts
searchDoctors(input: { q?: string; specialty?: string; locale: "en" | "ar"; bookableOnly?: boolean }): Promise<PlatformResult<{ items: DoctorSearchHit[] }>>;
enqueueDoctorSearchRefresh(doctorId: string): Promise<void>;
```

### Jobs

```ts
enqueueJob(input: { type: string; idempotencyKey: string; payload: object; runAfter?: Date }): Promise<PlatformResult<{ jobId: string }>>;
processDueJobs(limit: number): Promise<{ processed: number; failed: number }>;
```

## HTTP contracts

### `POST /api/webhooks/payments`

| Item | Rule |
|------|------|
| Headers | Provider signature header (e.g. `x-stub-signature` / vendor equivalent) |
| Body | Raw bytes verified before JSON parse |
| 200 | Processed or idempotent replay |
| 400 | Invalid signature / malformed |
| 500 | Unexpected (provider may retry) |

Side effects (notifications) enqueued; handler stays fast.

### `POST /api/cron/platform-jobs`

| Item | Rule |
|------|------|
| Auth | `Authorization: Bearer CRON_SECRET` or Vercel Cron header |
| Body | Optional `{ limit?: number }` |
| 200 | `{ processed, failed, deadLetter }` |
| 401 | Missing/invalid secret |

### Health (optional)

`GET /api/platform/health` — internal; or reuse Admin health action. Must not expose secrets.

## Port interfaces (extensions)

Documented in `src/ports/*`. New:

```ts
interface EmailPort { send(input: EmailSendInput): Promise<{ id: string }>; ping?(): Promise<boolean>; }
interface SmsPort { send(input: SmsSendInput): Promise<{ id: string }>; ping?(): Promise<boolean>; }
interface PushPort { send(input: PushSendInput): Promise<void>; ping?(): Promise<boolean>; }
```

`PaymentsPort` / `TelemedicinePort` / `AiAssistantPort` / `StoragePort` / `MalwareScanPort` remain canonical.

## Authorization matrix (summary)

| Facade | Who |
|--------|-----|
| notify | Server-only (trusted modules) |
| uploadMedicalFile | Authenticated owner or permitted role |
| getDownloadUrl | Owner, treating doctor, or Admin policy |
| getJoinCredentials | Appointment patient or assigned doctor |
| searchDoctors (bookable) | Public / Patient |
| refundObligation | Admin with billing permission |
| processDueJobs | Cron secret only |

## Idempotency

| Operation | Key |
|-----------|-----|
| Outbound email/SMS/push | `purpose:recipient:eventId` |
| Webhook apply | `provider:providerEventId` |
| Job | `type:idempotencyKey` |
| Payment intent | Caller-supplied idempotencyKey |
