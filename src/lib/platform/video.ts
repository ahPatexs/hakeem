import { prisma } from "@/lib/prisma";
import { getTelemedicineAdapter } from "@/adapters";
import { platformFail, platformOk, type PlatformResult } from "@/domain/platform/outcomes";
import { isPlatformVideoRecordingEnabled } from "@/lib/platform/flags";
import { platformAudit } from "@/lib/platform/audit";

const CANCELLED_STATUSES = new Set(["CANCELLED", "NO_SHOW", "RESCHEDULED"]);

type AppointmentRow = {
  id: string;
  patientUserId: string;
  doctorId: string;
  status: string;
  mode: string;
  videoRoomId: string | null;
  endAt: Date;
};

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
      endAt: true,
    },
  });
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

export async function createConsultationSession(input: {
  appointmentId: string;
  actorUserId: string;
}): Promise<PlatformResult<{ roomId: string }>> {
  const appointment = await loadVideoAppointment(input.appointmentId);
  if (!appointment) return platformFail("NOT_FOUND", "Appointment not found");

  const participant = await resolveParticipant(appointment, input.actorUserId);
  if (!participant) return platformFail("FORBIDDEN", "Not a participant on this appointment");

  const videoCheck = assertVideoAppointment(appointment);
  if (!videoCheck.ok) return videoCheck;

  const recordingEnabled = await isPlatformVideoRecordingEnabled();

  let roomId = appointment.videoRoomId;
  if (!roomId) {
    const room = await getTelemedicineAdapter().createRoom({
      appointmentId: appointment.id,
      patientUserId: appointment.patientUserId,
      doctorId: appointment.doctorId,
    });
    roomId = room.roomId;
    await prisma.appointment.update({
      where: { id: appointment.id },
      data: { videoRoomId: roomId },
    });
  }

  await platformAudit({
    type: "platform.video.session_create",
    outcome: "SUCCESS",
    actorUserId: input.actorUserId,
    targetUserId: appointment.patientUserId,
    meta: { appointmentId: appointment.id, roomId, recordingEnabled },
  });

  return platformOk({ roomId });
}

export async function getJoinCredentials(input: {
  appointmentId: string;
  actorUserId: string;
}): Promise<PlatformResult<{ token: string; url: string; expiresAt: string }>> {
  const appointment = await loadVideoAppointment(input.appointmentId);
  if (!appointment) return platformFail("NOT_FOUND", "Appointment not found");

  const participant = await resolveParticipant(appointment, input.actorUserId);
  if (!participant) return platformFail("FORBIDDEN", "Not a participant on this appointment");

  const videoCheck = assertVideoAppointment(appointment);
  if (!videoCheck.ok) return videoCheck;

  const session = await createConsultationSession(input);
  if (!session.ok) return session;

  const roomId = session.data.roomId;
  const token = await getTelemedicineAdapter().createJoinToken({
    roomId,
    participantId: input.actorUserId,
    participantName: participant.participantName,
    role: participant.role,
  });

  const graceMs = 30 * 60 * 1000;
  const cap = new Date(token.expiresAt);
  const appointmentEnd = new Date(appointment.endAt.getTime() + graceMs);
  const expiresAt = cap.getTime() < appointmentEnd.getTime() ? cap : appointmentEnd;

  await platformAudit({
    type: "platform.video.join_credentials",
    outcome: "SUCCESS",
    actorUserId: input.actorUserId,
    targetUserId: appointment.patientUserId,
    meta: { appointmentId: appointment.id, roomId },
  });

  return platformOk({
    token: token.token,
    url: token.url,
    expiresAt: expiresAt.toISOString(),
  });
}
