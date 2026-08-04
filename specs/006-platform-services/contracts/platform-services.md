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
createConsultationSession(input: {
  appointmentId: string;
  actorUserId: string;
}): Promise<PlatformResult<{ sessionId: string; roomId: string; state: "WAITING" | "IN_CALL" }>>;

getJoinCredentials(input: {
  appointmentId: string;
  actorUserId: string;
}): Promise<PlatformResult<{
  token: string;          // LiveKit AccessToken JWT (short-lived)
  url: string;            // LiveKit room / ws URL
  roomName: string;
  expiresAt: string;
  role: "patient" | "doctor";
}>>;

endConsultationSession(input: {
  appointmentId: string;
  actorUserId: string;
}): Promise<PlatformResult<void>>;

listVideoCallEvents(input: {
  appointmentId: string;
  actorUserId: string;    // Admin or party
}): Promise<PlatformResult<{ events: VideoCallEventDto[] }>>;

getSessionAnalytics(input: {
  from: string;
  to: string;
}): Promise<PlatformResult<VideoSessionAnalyticsSummary>>; // Admin
```

**Rules**:
- JWT minted only in platform (`livekit-server-sdk`); portals never hold LiveKit API secrets.
- Participants limited to appointment patient + assigned doctor; denials audited.
- Waiting room / device preview / participant grid / call controls live in `components/platform/video/*`.
- Recording optional, off by default; media never written to audit logs.
- LiveKit webhooks → `POST /api/webhooks/video` (verify + skew + idempotent).

### Search

```ts
searchDoctors(input: { q?: string; specialty?: string; locale: "en" | "ar"; bookableOnly?: boolean; clientKey?: string }): Promise<PlatformResult<{ items: DoctorSearchHit[] }>>;
enqueueDoctorSearchRefresh(doctorId: string): Promise<void>;
```

Public/anonymous callers: abuse-oriented rate limiting → `RATE_LIMITED` without taking down normal browsing (FR-046 / SC-020).

### Jobs

```ts
enqueueJob(input: { type: string; idempotencyKey: string; payload: object; runAfter?: Date }): Promise<PlatformResult<{ jobId: string }>>;
processDueJobs(limit: number): Promise<{ processed: number; failed: number }>;
```

## HTTP contracts

### `POST /api/webhooks/payments`

| Item | Rule |
|------|------|
| Headers | Provider signature header (e.g. `x-stub-signature` / vendor equivalent); timestamp claim when provider supports it |
| Body | Raw bytes verified before JSON parse |
| Verify | Signature/shared secret **and** freshness skew ≤5 minutes when timestamp present (FR-045) |
| Transport | HTTPS only (FR-044) |
| 200 | Processed or idempotent replay |
| 400 | Invalid signature, stale skew, or malformed — **no billing state change** |
| 500 | Unexpected (provider may retry) |

Side effects (notifications) enqueued; handler stays fast. Same verify+idempotency pattern for `POST /api/webhooks/video` when enabled.

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

`PaymentsPort` / `TelemedicinePort` (LiveKit-capable) / `AiAssistantPort` / `StoragePort` / `MalwareScanPort` remain canonical.

`TelemedicinePort` extensions for LiveKit:

```ts
interface TelemedicinePort {
  createRoom(input: { roomName: string; appointmentId: string; metadata?: Record<string, string> }): Promise<{ roomId: string }>;
  createJoinToken(input: {
    roomId: string;
    identity: string;
    role: "patient" | "doctor";
    ttlSeconds: number;
  }): Promise<{ token: string; url: string; expiresAt: Date }>;
  closeRoom?(input: { roomId: string }): Promise<void>;
  startRecording?(input: { roomId: string }): Promise<{ egressId: string }>; // optional; off by default
  stopRecording?(input: { egressId: string }): Promise<void>;
  ping?(): Promise<boolean>;
}
```


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
