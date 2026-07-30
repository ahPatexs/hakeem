"use server";

import { prisma } from "@/lib/prisma";
import { withDoctor } from "./_helpers";
import { getOwnedAppointment } from "@/lib/doctor/schedule";
import { assertDoctorCanJoinVideo } from "@/domain/doctor/video";
import { DomainRuleError } from "@/domain/doctor/errors";
import { appointmentIdSchema } from "@/lib/doctor/schemas";
import { stubTelemedicineAdapter } from "@/adapters/stub-telemedicine";
import { auditDoctorEvent } from "@/lib/doctor/phi-audit";

/** Doctor joins as host within the join window (FR-024..FR-026). */
export async function joinVideoAsHost(raw: { appointmentId: string }) {
  const input = appointmentIdSchema.parse(raw);
  return withDoctor(async (ctx) => {
    const appointment = await getOwnedAppointment(ctx.doctorId, input.appointmentId);
    if (!appointment) throw new DomainRuleError("NOT_FOUND");
    assertDoctorCanJoinVideo(appointment);

    let roomId = appointment.videoRoomId;
    if (!roomId) {
      const room = await stubTelemedicineAdapter.createRoom({
        appointmentId: appointment.id,
        patientUserId: appointment.patientUserId,
        doctorId: ctx.doctorId,
      });
      roomId = room.roomId;
      await prisma.appointment.update({
        where: { id: appointment.id },
        data: { videoRoomId: roomId },
      });
    }

    const token = await stubTelemedicineAdapter.createJoinToken({
      roomId,
      participantId: ctx.userId,
      participantName: ctx.displayName,
      role: "doctor",
    });

    await auditDoctorEvent(
      "doctor.video.join",
      ctx.userId,
      { appointmentId: appointment.id, roomId },
      appointment.patientUserId,
    );

    return { url: token.url, expiresAt: token.expiresAt.toISOString() };
  });
}

/** Admit a patient from the video waiting room (stub — FR-025). */
export async function admitVideoPatient(raw: { appointmentId: string }) {
  const input = appointmentIdSchema.parse(raw);
  return withDoctor(async (ctx) => {
    const appointment = await getOwnedAppointment(ctx.doctorId, input.appointmentId);
    if (!appointment) throw new DomainRuleError("NOT_FOUND");
    if (appointment.mode !== "VIDEO") throw new DomainRuleError("INVALID_STATUS");

    await auditDoctorEvent(
      "doctor.video.admit",
      ctx.userId,
      { appointmentId: appointment.id },
      appointment.patientUserId,
    );

    return { admitted: true as const };
  });
}
