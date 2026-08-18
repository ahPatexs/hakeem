import type { Prisma, VideoSessionState } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { getTelemedicineAdapter } from "@/adapters";
import { platformFail, platformOk, type PlatformResult } from "@/domain/platform/outcomes";
import {
  canJoinVideo,
  canTransitionVideoSession,
  computeJoinTokenTtlSeconds,
  normalizeVisitChatBody,
  parseVisitChatMetadata,
  type VideoAppointment,
  type VideoCallEventKind,
  type VideoSessionStateName,
} from "@/domain/platform/video";
import { isPlatformVideoRecordingEnabled } from "@/lib/platform/flags";
import { platformAudit } from "@/lib/platform/audit";
import { enqueueJob } from "@/lib/platform/jobs";
import { redactSecrets } from "@/lib/platform/redact";

const CANCELLED_STATUSES = new Set(["CANCELLED", "NO_SHOW", "RESCHEDULED"]);

type AppointmentRow = {
  id: string;
  patientUserId: string;
  doctorId: string;
  status: string;
  mode: string;
  videoRoomId: string | null;
  startAt: Date;
  endAt: Date;
};

function activeProvider(): string {
  return (process.env.TELEMEDICINE_ADAPTER ?? process.env.TELEMEDICINE_PROVIDER ?? "stub").toLowerCase();
}

async function loadVideoAppointment(appointmentId: string): Promise<AppointmentRow | null> {
  return prisma.appointment.findUnique({
    where: { id: appointmentId },
    select: {
      id: true,
      patientUserId: true,
      doctorId: true,
      status: true,
      mode: true,
      videoRoomId: true,
      startAt: true,
      endAt: true,
    },
  });
}

/**
 * Resolve the patient user id for a video appointment while enforcing
 * minimum access checks (the caller must be a participant).
 *
 * Used to scope AI actions (SOAP summary, Rx suggestions) to the correct
 * patient context from inside the visit video experience.
 */
export async function getVideoAppointmentPatientUserId(input: {
  appointmentId: string;
  actorUserId: string;
}): Promise<PlatformResult<{ patientUserId: string }>> {
  const appointment = await loadVideoAppointment(input.appointmentId);
  if (!appointment) return platformFail("NOT_FOUND", "Appointment not found");

  const videoCheck = assertVideoAppointment(appointment);
  if (!videoCheck.ok) return videoCheck;

  // Patient can always resolve their own appointment patientUserId.
  if (appointment.patientUserId === input.actorUserId) {
    return platformOk({ patientUserId: appointment.patientUserId });
  }

  // Doctor must match by doctorProfileId (appointment.doctorId stores profile id).
  const actorDoctorProfile = await prisma.user.findUnique({
    where: { id: input.actorUserId },
    select: { doctorProfileId: true },
  });
  const isDoctorParticipant = actorDoctorProfile?.doctorProfileId === appointment.doctorId;
  if (!isDoctorParticipant) {
    return platformFail("FORBIDDEN", "Not a participant on this appointment");
  }

  return platformOk({ patientUserId: appointment.patientUserId });
}

async function resolveParticipant(
  appointment: AppointmentRow,
  actorUserId: string,
): Promise<{ role: "patient" | "doctor"; participantName: string } | null> {
  if (appointment.patientUserId === actorUserId) {
    const patient = await prisma.user.findUnique({
      where: { id: actorUserId },
      select: { name: true, email: true },
    });
    return {
      role: "patient",
      participantName: patient?.name ?? patient?.email ?? "Patient",
    };
  }

  const doctorUser = await prisma.user.findFirst({
    where: { id: actorUserId, doctorProfileId: appointment.doctorId },
    select: { name: true, email: true },
  });
  if (!doctorUser) return null;

  return {
    role: "doctor",
    participantName: doctorUser.name ?? doctorUser.email ?? "Doctor",
  };
}

function assertVideoAppointment(appointment: AppointmentRow): PlatformResult<void> {
  if (appointment.mode !== "VIDEO") {
    return platformFail("VALIDATION_ERROR", "Appointment is not a video visit");
  }
  if (CANCELLED_STATUSES.has(appointment.status)) {
    return platformFail("FORBIDDEN", "Video session unavailable for cancelled appointment");
  }
  return platformOk(undefined);
}

async function recordCallEvent(input: {
  sessionId: string;
  actorUserId?: string;
  kind: VideoCallEventKind;
  metadata?: Prisma.InputJsonValue;
}): Promise<void> {
  const metadata = input.metadata
    ? (redactSecrets(input.metadata) as Prisma.InputJsonValue)
    : undefined;
  await prisma.videoCallEvent.create({
    data: {
      sessionId: input.sessionId,
      actorUserId: input.actorUserId,
      kind: input.kind,
      metadata,
    },
  });
}

async function setSessionState(
  sessionId: string,
  from: VideoSessionStateName,
  to: VideoSessionStateName,
  extra?: { startedAt?: Date; endedAt?: Date },
): Promise<boolean> {
  if (!canTransitionVideoSession(from, to) && from !== to) return false;
  await prisma.videoSession.update({
    where: { id: sessionId },
    data: {
      state: to as VideoSessionState,
      ...(extra?.startedAt ? { startedAt: extra.startedAt } : {}),
      ...(extra?.endedAt ? { endedAt: extra.endedAt } : {}),
    },
  });
  return true;
}

async function upsertSessionForRoom(input: {
  appointmentId: string;
  roomId: string;
  roomName: string;
  recordingEnabled: boolean;
}): Promise<{ id: string; state: VideoSessionStateName }> {
  const existing = await prisma.videoSession.findUnique({
    where: { appointmentId: input.appointmentId },
  });
  if (existing) {
    return { id: existing.id, state: existing.state as VideoSessionStateName };
  }
  const created = await prisma.videoSession.create({
    data: {
      appointmentId: input.appointmentId,
      provider: activeProvider() === "livekit" ? "livekit" : "stub",
      roomId: input.roomId,
      roomName: input.roomName,
      state: "WAITING",
      recordingEnabled: input.recordingEnabled,
    },
  });
  return { id: created.id, state: "WAITING" };
}

export async function createConsultationSession(input: {
  appointmentId: string;
  actorUserId: string;
}): Promise<PlatformResult<{ sessionId: string; roomId: string; state: "WAITING" | "IN_CALL" }>> {
  const appointment = await loadVideoAppointment(input.appointmentId);
  if (!appointment) return platformFail("NOT_FOUND", "Appointment not found");

  const participant = await resolveParticipant(appointment, input.actorUserId);
  if (!participant) {
    await platformAudit({
      type: "platform.video.session_create",
      outcome: "DENIED",
      actorUserId: input.actorUserId,
      targetUserId: appointment.patientUserId,
      meta: { appointmentId: appointment.id, reason: "not_participant" },
    });
    return platformFail("FORBIDDEN", "Not a participant on this appointment");
  }

  const videoCheck = assertVideoAppointment(appointment);
  if (!videoCheck.ok) return videoCheck;

  const recordingEnabled = await isPlatformVideoRecordingEnabled();
  const adapter = getTelemedicineAdapter();

  let roomId = appointment.videoRoomId;
  let roomName = roomId ?? `appt_${appointment.id}`;
  if (!roomId) {
    const room = await adapter.createRoom({
      appointmentId: appointment.id,
      patientUserId: appointment.patientUserId,
      doctorId: appointment.doctorId,
    });
    roomId = room.roomId;
    roomName = room.roomName ?? room.roomId;
    await prisma.appointment.update({
      where: { id: appointment.id },
      data: { videoRoomId: roomId },
    });
  }

  const session = await upsertSessionForRoom({
    appointmentId: appointment.id,
    roomId,
    roomName,
    recordingEnabled,
  });

  await recordCallEvent({
    sessionId: session.id,
    actorUserId: input.actorUserId,
    kind: "WAITING",
    metadata: { role: participant.role },
  });

  await platformAudit({
    type: "platform.video.session_create",
    outcome: "SUCCESS",
    actorUserId: input.actorUserId,
    targetUserId: appointment.patientUserId,
    meta: { appointmentId: appointment.id, roomId, recordingEnabled, sessionId: session.id },
  });

  return platformOk({
    sessionId: session.id,
    roomId,
    state: session.state === "IN_CALL" ? "IN_CALL" : "WAITING",
  });
}

export async function getJoinCredentials(input: {
  appointmentId: string;
  actorUserId: string;
}): Promise<
  PlatformResult<{
    token: string;
    url: string;
    roomName: string;
    expiresAt: string;
    role: "patient" | "doctor";
    sessionId: string;
  }>
> {
  const appointment = await loadVideoAppointment(input.appointmentId);
  if (!appointment) return platformFail("NOT_FOUND", "Appointment not found");

  const participant = await resolveParticipant(appointment, input.actorUserId);
  if (!participant) {
    const existing = await prisma.videoSession.findUnique({
      where: { appointmentId: appointment.id },
      select: { id: true },
    });
    if (existing) {
      await recordCallEvent({
        sessionId: existing.id,
        actorUserId: input.actorUserId,
        kind: "DENY",
        metadata: { reason: "not_participant" },
      });
    }
    await platformAudit({
      type: "platform.video.join_credentials",
      outcome: "DENIED",
      actorUserId: input.actorUserId,
      targetUserId: appointment.patientUserId,
      meta: { appointmentId: appointment.id },
    });
    return platformFail("FORBIDDEN", "Not a participant on this appointment");
  }

  // TELEHEALTH consent fail-closed for video joins (T145 / FR-045)
  {
    const { requireConsent } = await import("@/lib/emr/consents");
    const emrActor =
      participant.role === "patient"
        ? { userId: input.actorUserId, role: "PATIENT" as const }
        : {
            userId: input.actorUserId,
            role: "DOCTOR" as const,
            doctorId: appointment.doctorId,
          };
    const consent = await requireConsent(emrActor, {
      patientUserId: appointment.patientUserId,
      typeCode: "TELEHEALTH",
    });
    if (!consent.ok) {
      await platformAudit({
        type: "platform.video.join_credentials",
        outcome: "DENIED",
        actorUserId: input.actorUserId,
        targetUserId: appointment.patientUserId,
        meta: { appointmentId: appointment.id, reason: "consent_required", code: consent.code },
      });
      return platformFail("CONSENT_REQUIRED", consent.message ?? "Telehealth consent required");
    }
  }

  const videoCheck = assertVideoAppointment(appointment);
  if (!videoCheck.ok) return videoCheck;

  {
    const obligation = await prisma.paymentObligation.findUnique({
      where: { appointmentId: appointment.id },
      select: { status: true, amountCents: true },
    });
    if (obligation && obligation.amountCents > 0) {
      const { assertCanJoinAppointment } = await import("@/domain/billing/eligibility");
      const { PaymentDomainError } = await import("@/domain/billing/errors");
      try {
        assertCanJoinAppointment({ amountCents: obligation.amountCents, status: obligation.status });
      } catch (error) {
        if (error instanceof PaymentDomainError) {
          await platformAudit({
            type: "platform.video.join_credentials",
            outcome: "DENIED",
            actorUserId: input.actorUserId,
            targetUserId: appointment.patientUserId,
            meta: { appointmentId: appointment.id, reason: "unpaid" },
          });
          return platformFail("CONFLICT", "Payment required before joining this visit");
        }
        throw error;
      }
    }
  }

  if (
    !canJoinVideo({
      mode: appointment.mode,
      status: appointment.status,
      startAt: appointment.startAt,
      endAt: appointment.endAt,
    } as VideoAppointment)
  ) {
    return platformFail("FORBIDDEN", "JOIN_WINDOW_CLOSED");
  }

  const session = await createConsultationSession(input);
  if (!session.ok) return session;

  const ttlSeconds = computeJoinTokenTtlSeconds(appointment.endAt);
  const token = await getTelemedicineAdapter().createJoinToken({
    roomId: session.data.roomId,
    participantId: input.actorUserId,
    participantName: participant.participantName,
    role: participant.role,
    ttlSeconds,
  });

  const graceMs = 30 * 60 * 1000;
  const cap = new Date(token.expiresAt);
  const appointmentEnd = new Date(appointment.endAt.getTime() + graceMs);
  const expiresAt = cap.getTime() < appointmentEnd.getTime() ? cap : appointmentEnd;

  const dbSession = await prisma.videoSession.findUnique({
    where: { appointmentId: appointment.id },
  });
  if (dbSession) {
    await setSessionState(dbSession.id, dbSession.state as VideoSessionStateName, "IN_CALL", {
      startedAt: dbSession.startedAt ?? new Date(),
    });
    await recordCallEvent({
      sessionId: dbSession.id,
      actorUserId: input.actorUserId,
      kind: "JOIN",
      metadata: { role: participant.role },
    });
  }

  await platformAudit({
    type: "platform.video.join_credentials",
    outcome: "SUCCESS",
    actorUserId: input.actorUserId,
    targetUserId: appointment.patientUserId,
    meta: { appointmentId: appointment.id, roomId: session.data.roomId },
  });

  return platformOk({
    token: token.token,
    url: token.url,
    roomName: session.data.roomId,
    expiresAt: expiresAt.toISOString(),
    role: participant.role,
    sessionId: session.data.sessionId,
  });
}

export async function endConsultationSession(input: {
  appointmentId: string;
  actorUserId: string;
}): Promise<PlatformResult<void>> {
  const appointment = await loadVideoAppointment(input.appointmentId);
  if (!appointment) return platformFail("NOT_FOUND", "Appointment not found");

  const participant = await resolveParticipant(appointment, input.actorUserId);
  if (!participant) return platformFail("FORBIDDEN", "Not a participant on this appointment");

  const session = await prisma.videoSession.findUnique({
    where: { appointmentId: appointment.id },
  });
  if (!session) return platformFail("NOT_FOUND", "Video session not found");

  await setSessionState(session.id, session.state as VideoSessionStateName, "ENDED", {
    endedAt: new Date(),
  });
  await recordCallEvent({
    sessionId: session.id,
    actorUserId: input.actorUserId,
    kind: "LEAVE",
  });

  const adapter = getTelemedicineAdapter();
  if (adapter.closeRoom) {
    await adapter.closeRoom({ roomId: session.roomId }).catch(() => undefined);
  } else {
    await adapter.endRoom(session.roomId).catch(() => undefined);
  }

  await platformAudit({
    type: "platform.video.session_end",
    outcome: "SUCCESS",
    actorUserId: input.actorUserId,
    targetUserId: appointment.patientUserId,
    meta: { appointmentId: appointment.id, sessionId: session.id },
  });

  return platformOk(undefined);
}

export async function leaveConsultationSession(input: {
  appointmentId: string;
  actorUserId: string;
}): Promise<PlatformResult<void>> {
  const session = await prisma.videoSession.findUnique({
    where: { appointmentId: input.appointmentId },
  });
  if (!session) return platformFail("NOT_FOUND", "Video session not found");

  await recordCallEvent({
    sessionId: session.id,
    actorUserId: input.actorUserId,
    kind: "LEAVE",
  });
  return platformOk(undefined);
}

export async function recordVideoReconnect(input: {
  appointmentId: string;
  actorUserId: string;
}): Promise<PlatformResult<void>> {
  const session = await prisma.videoSession.findUnique({
    where: { appointmentId: input.appointmentId },
  });
  if (!session) return platformFail("NOT_FOUND", "Video session not found");
  await recordCallEvent({
    sessionId: session.id,
    actorUserId: input.actorUserId,
    kind: "RECONNECT",
  });
  return platformOk(undefined);
}

export async function startVideoRecording(input: {
  appointmentId: string;
  actorUserId: string;
}): Promise<PlatformResult<{ egressId: string }>> {
  if (!(await isPlatformVideoRecordingEnabled())) {
    return platformFail("FORBIDDEN", "Recording is disabled");
  }
  const appointment = await loadVideoAppointment(input.appointmentId);
  if (!appointment) return platformFail("NOT_FOUND", "Appointment not found");
  const participant = await resolveParticipant(appointment, input.actorUserId);
  if (!participant) return platformFail("FORBIDDEN", "Not a participant on this appointment");

  const session = await prisma.videoSession.findUnique({
    where: { appointmentId: appointment.id },
  });
  if (!session) return platformFail("NOT_FOUND", "Video session not found");

  const adapter = getTelemedicineAdapter();
  if (!adapter.startRecording) {
    return platformFail("DEPENDENCY_UNAVAILABLE", "Recording not supported by adapter");
  }
  const started = await adapter.startRecording({ roomId: session.roomId });
  await recordCallEvent({
    sessionId: session.id,
    actorUserId: input.actorUserId,
    kind: "RECORDING_START",
    metadata: { egressId: started.egressId },
  });
  await enqueueJob({
    type: "VIDEO_RECORDING_FINALIZE",
    idempotencyKey: `video-rec:${session.id}:${started.egressId}`,
    payload: { sessionId: session.id, egressId: started.egressId, appointmentId: appointment.id },
  });
  return platformOk({ egressId: started.egressId });
}

export async function listVideoCallEvents(input: {
  appointmentId: string;
  actorUserId: string;
  isAdmin?: boolean;
}): Promise<PlatformResult<{ events: Array<{ id: string; kind: string; actorUserId: string | null; createdAt: string }> }>> {
  const appointment = await loadVideoAppointment(input.appointmentId);
  if (!appointment) return platformFail("NOT_FOUND", "Appointment not found");

  if (!input.isAdmin) {
    const participant = await resolveParticipant(appointment, input.actorUserId);
    if (!participant) return platformFail("FORBIDDEN", "Not allowed to view call log");
  }

  const session = await prisma.videoSession.findUnique({
    where: { appointmentId: input.appointmentId },
    select: { id: true },
  });
  if (!session) return platformOk({ events: [] });

  const events = await prisma.videoCallEvent.findMany({
    where: { sessionId: session.id },
    orderBy: { createdAt: "asc" },
    select: { id: true, kind: true, actorUserId: true, createdAt: true },
  });

  return platformOk({
    events: events.map((e) => ({
      id: e.id,
      kind: e.kind,
      actorUserId: e.actorUserId,
      createdAt: e.createdAt.toISOString(),
    })),
  });
}

export type VisitChatMessageDto = {
  id: string;
  body: string;
  senderName: string;
  role: "patient" | "doctor";
  mine: boolean;
  createdAt: string;
};

export async function listVisitChatMessages(input: {
  appointmentId: string;
  actorUserId: string;
}): Promise<PlatformResult<{ messages: VisitChatMessageDto[] }>> {
  const appointment = await loadVideoAppointment(input.appointmentId);
  if (!appointment) return platformFail("NOT_FOUND", "Appointment not found");

  const participant = await resolveParticipant(appointment, input.actorUserId);
  if (!participant) return platformFail("FORBIDDEN", "Not allowed to view visit chat");

  const session = await prisma.videoSession.findUnique({
    where: { appointmentId: input.appointmentId },
    select: { id: true },
  });
  if (!session) return platformOk({ messages: [] });

  const events = await prisma.videoCallEvent.findMany({
    where: { sessionId: session.id, kind: "CHAT_MESSAGE" },
    orderBy: { createdAt: "asc" },
    take: 200,
    select: { id: true, actorUserId: true, metadata: true, createdAt: true },
  });

  const messages = events.flatMap((event) => {
    const parsed = parseVisitChatMetadata(event.metadata);
    if (!parsed) return [];
    return [
      {
        id: event.id,
        body: parsed.body,
        senderName: parsed.senderName,
        role: parsed.role,
        mine: event.actorUserId === input.actorUserId,
        createdAt: event.createdAt.toISOString(),
      } satisfies VisitChatMessageDto,
    ];
  });

  return platformOk({ messages });
}

export async function sendVisitChatMessage(input: {
  appointmentId: string;
  actorUserId: string;
  body: string;
}): Promise<PlatformResult<{ message: VisitChatMessageDto }>> {
  const body = normalizeVisitChatBody(input.body);
  if (!body) return platformFail("VALIDATION_ERROR", "Message cannot be empty");

  const appointment = await loadVideoAppointment(input.appointmentId);
  if (!appointment) return platformFail("NOT_FOUND", "Appointment not found");

  const participant = await resolveParticipant(appointment, input.actorUserId);
  if (!participant) return platformFail("FORBIDDEN", "Not a participant on this appointment");

  const videoCheck = assertVideoAppointment(appointment);
  if (!videoCheck.ok) return videoCheck;

  let session = await prisma.videoSession.findUnique({
    where: { appointmentId: appointment.id },
    select: { id: true },
  });
  if (!session) {
    const sessionResult = await createConsultationSession(input);
    if (!sessionResult.ok) return sessionResult;
    session = { id: sessionResult.data.sessionId };
  }

  const created = await prisma.videoCallEvent.create({
    data: {
      sessionId: session.id,
      actorUserId: input.actorUserId,
      kind: "CHAT_MESSAGE",
      metadata: redactSecrets({
        type: "message",
        body,
        senderName: participant.participantName,
        role: participant.role,
      }) as Prisma.InputJsonValue,
    },
    select: { id: true, createdAt: true },
  });

  await platformAudit({
    type: "platform.video.chat_send",
    outcome: "SUCCESS",
    actorUserId: input.actorUserId,
    targetUserId: appointment.patientUserId,
    meta: {
      appointmentId: appointment.id,
      sessionId: session.id,
      messageId: created.id,
      length: body.length,
    },
  });

  return platformOk({
    message: {
      id: created.id,
      body,
      senderName: participant.participantName,
      role: participant.role,
      mine: true,
      createdAt: created.createdAt.toISOString(),
    },
  });
}

export type VideoSessionAnalyticsSummary = {
  sessionCount: number;
  joinedCount: number;
  deniedCount: number;
  reconnectCount: number;
  avgDurationSeconds: number | null;
};

export async function getSessionAnalytics(input: {
  from: string;
  to: string;
}): Promise<PlatformResult<VideoSessionAnalyticsSummary>> {
  const from = new Date(input.from);
  const to = new Date(input.to);
  if (Number.isNaN(from.getTime()) || Number.isNaN(to.getTime())) {
    return platformFail("VALIDATION_ERROR", "Invalid date range");
  }

  const sessions = await prisma.videoSession.findMany({
    where: { createdAt: { gte: from, lte: to } },
    select: { id: true, startedAt: true, endedAt: true },
  });

  const sessionIds = sessions.map((s) => s.id);
  const events = sessionIds.length
    ? await prisma.videoCallEvent.groupBy({
        by: ["kind"],
        where: { sessionId: { in: sessionIds } },
        _count: { _all: true },
      })
    : [];

  const countKind = (kind: string) =>
    events.find((e) => e.kind === kind)?._count._all ?? 0;

  const durations = sessions
    .filter((s) => s.startedAt && s.endedAt)
    .map((s) => (s.endedAt!.getTime() - s.startedAt!.getTime()) / 1000);
  const avgDurationSeconds =
    durations.length > 0
      ? Math.round(durations.reduce((a, b) => a + b, 0) / durations.length)
      : null;

  return platformOk({
    sessionCount: sessions.length,
    joinedCount: countKind("JOIN"),
    deniedCount: countKind("DENY"),
    reconnectCount: countKind("RECONNECT"),
    avgDurationSeconds,
  });
}

export type AdminVideoSessionRow = {
  sessionId: string;
  appointmentId: string;
  state: string;
  provider: string;
  startedAt: string | null;
  endedAt: string | null;
  createdAt: string;
  durationSeconds: number | null;
  patientName: string;
  doctorName: string;
  appointmentStatus: string;
  startAt: string;
};

function mapAdminSessionRow(row: {
  id: string;
  state: string;
  provider: string;
  startedAt: Date | null;
  endedAt: Date | null;
  createdAt: Date;
  appointment: {
    id: string;
    status: string;
    startAt: Date;
    patient: { name: string | null; email: string };
    doctor: { nameEn: string; nameAr: string };
  };
}): AdminVideoSessionRow {
  const durationSeconds =
    row.startedAt && row.endedAt
      ? Math.max(0, Math.round((row.endedAt.getTime() - row.startedAt.getTime()) / 1000))
      : row.startedAt
        ? Math.max(0, Math.round((Date.now() - row.startedAt.getTime()) / 1000))
        : null;
  return {
    sessionId: row.id,
    appointmentId: row.appointment.id,
    state: row.state,
    provider: row.provider,
    startedAt: row.startedAt?.toISOString() ?? null,
    endedAt: row.endedAt?.toISOString() ?? null,
    createdAt: row.createdAt.toISOString(),
    durationSeconds,
    patientName: row.appointment.patient.name?.trim() || row.appointment.patient.email,
    doctorName: row.appointment.doctor.nameEn,
    appointmentStatus: row.appointment.status,
    startAt: row.appointment.startAt.toISOString(),
  };
}

export async function listAdminVideoBoard(): Promise<
  PlatformResult<{ live: AdminVideoSessionRow[]; recent: AdminVideoSessionRow[] }>
> {
  const include = {
    appointment: {
      select: {
        id: true,
        status: true,
        startAt: true,
        patient: { select: { name: true, email: true } },
        doctor: { select: { nameEn: true, nameAr: true } },
      },
    },
  } as const;

  const [live, recent] = await Promise.all([
    prisma.videoSession.findMany({
      where: { state: { in: ["WAITING", "IN_CALL"] } },
      orderBy: { updatedAt: "desc" },
      take: 50,
      include,
    }),
    prisma.videoSession.findMany({
      where: { state: { in: ["ENDED", "CANCELLED"] } },
      orderBy: { updatedAt: "desc" },
      take: 20,
      include,
    }),
  ]);

  return platformOk({
    live: live.map(mapAdminSessionRow),
    recent: recent.map(mapAdminSessionRow),
  });
}

export async function applyVideoWebhookEvent(input: {
  providerEventId: string;
  eventType: string;
  roomName?: string;
  rawHash: string;
}): Promise<PlatformResult<{ applied: boolean }>> {
  const existing = await prisma.webhookReceipt.findUnique({
    where: {
      provider_providerEventId: {
        provider: "video",
        providerEventId: input.providerEventId,
      },
    },
  });
  if (existing?.processedAt) {
    return platformOk({ applied: false });
  }

  await prisma.webhookReceipt.upsert({
    where: {
      provider_providerEventId: {
        provider: "video",
        providerEventId: input.providerEventId,
      },
    },
    create: {
      provider: "video",
      providerEventId: input.providerEventId,
      eventType: input.eventType,
      signatureValid: true,
      rawHash: input.rawHash,
      processedAt: new Date(),
    },
    update: {
      signatureValid: true,
      processedAt: new Date(),
      eventType: input.eventType,
    },
  });

  if (input.roomName) {
    const session = await prisma.videoSession.findFirst({
      where: { OR: [{ roomId: input.roomName }, { roomName: input.roomName }] },
    });
    if (session) {
      await recordCallEvent({
        sessionId: session.id,
        kind: "CHAT_META",
        metadata: { providerEventType: input.eventType },
      });
    }
  }

  return platformOk({ applied: true });
}
