"use server";

import { prisma } from "@/lib/prisma";
import { withDoctor } from "./_helpers";
import { getOwnedAppointment } from "@/lib/doctor/schedule";
import { assertDoctorCanJoinVideo } from "@/domain/doctor/video";
import { DomainRuleError } from "@/domain/doctor/errors";
import { appointmentIdSchema } from "@/lib/doctor/schemas";
import { auditDoctorEvent } from "@/lib/doctor/phi-audit";

/** Doctor joins as host within the join window (FR-024..FR-026). Gated by TELEHEALTH consent (T145). */
export async function joinVideoAsHost(raw: { appointmentId: string }) {
  const input = appointmentIdSchema.parse(raw);
  return withDoctor(async (ctx) => {
    const appointment = await getOwnedAppointment(ctx.doctorId, input.appointmentId);
    if (!appointment) throw new DomainRuleError("NOT_FOUND");
    assertDoctorCanJoinVideo(appointment);

    const { requireConsent } = await import("@/lib/emr/consents");
    const consent = await requireConsent(
      { userId: ctx.userId, role: "DOCTOR", doctorId: ctx.doctorId },
      { patientUserId: appointment.patientUserId, typeCode: "TELEHEALTH" },
    );
    if (!consent.ok) throw new DomainRuleError("SIGN_REQUIREMENTS", consent.message);

    const { createConsultationSession, getJoinCredentials } = await import("@/lib/platform/video");
    const session = await createConsultationSession({
      appointmentId: appointment.id,
      actorUserId: ctx.userId,
    });
    if (!session.ok) throw new DomainRuleError("INVALID_STATUS");

    const creds = await getJoinCredentials({
      appointmentId: appointment.id,
      actorUserId: ctx.userId,
    });
    if (!creds.ok) throw new DomainRuleError("JOIN_WINDOW_CLOSED");

    await auditDoctorEvent(
      "doctor.video.join",
      ctx.userId,
      { appointmentId: appointment.id, roomId: session.data.roomId },
      appointment.patientUserId,
    );

    return { url: creds.data.url, expiresAt: creds.data.expiresAt };
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
