"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { withDoctor, withDoctorMutation } from "./_helpers";
import { getDaySchedule, getQueue, getUpcomingAppointments, getOwnedAppointment } from "@/lib/doctor/schedule";
import { assertCanStart, assertCanComplete, assertCanMarkNoShow } from "@/domain/doctor/consultation";
import { DomainRuleError } from "@/domain/doctor/errors";
import { appointmentIdSchema, markNoShowSchema, dateKeySchema } from "@/lib/doctor/schemas";
import { auditDoctorEvent } from "@/lib/doctor/phi-audit";
import { notifyDoctorPatientCheckedIn } from "@/lib/doctor/notification-triggers";

export async function getSchedule(dateKey?: string) {
  const parsed = dateKey ? dateKeySchema.safeParse(dateKey) : undefined;
  return withDoctor((ctx) => getDaySchedule(ctx.doctorId, parsed?.success ? parsed.data : undefined));
}

export async function getPatientQueue() {
  return withDoctor((ctx) => getQueue(ctx.doctorId));
}

export async function getUpcoming() {
  return withDoctor((ctx) => getUpcomingAppointments(ctx.doctorId));
}

export async function getAppointmentDetail(appointmentId: string) {
  const input = appointmentIdSchema.parse({ appointmentId });
  return withDoctor(async (ctx) => {
    const appointment = await getOwnedAppointment(ctx.doctorId, input.appointmentId);
    if (!appointment) throw new DomainRuleError("NOT_FOUND");
    return appointment;
  });
}

/** Front-desk fallback: doctor marks the patient as arrived. */
export async function checkInPatient(raw: { appointmentId: string }) {
  const input = appointmentIdSchema.parse(raw);
  return withDoctorMutation(async (ctx) => {
    const appointment = await getOwnedAppointment(ctx.doctorId, input.appointmentId);
    if (!appointment) throw new DomainRuleError("NOT_FOUND");
    if (appointment.status !== "CONFIRMED") throw new DomainRuleError("INVALID_STATUS");

    await prisma.appointment.update({
      where: { id: appointment.id },
      data: { status: "CHECKED_IN", checkedInAt: new Date() },
    });
    await notifyDoctorPatientCheckedIn(
      ctx.userId,
      appointment.id,
      appointment.patient.name ?? appointment.patient.email,
    );
    revalidatePaths();
  });
}

export async function startConsultation(raw: { appointmentId: string }) {
  const input = appointmentIdSchema.parse(raw);
  return withDoctorMutation(async (ctx) => {
    const appointment = await getOwnedAppointment(ctx.doctorId, input.appointmentId);
    if (!appointment) throw new DomainRuleError("NOT_FOUND");
    assertCanStart(appointment.status);

    // Single-active-consultation guard (FR-006)
    const active = await prisma.appointment.findFirst({
      where: { doctorId: ctx.doctorId, status: "IN_PROGRESS", id: { not: appointment.id } },
      select: { id: true },
    });
    if (active) throw new DomainRuleError("ALREADY_IN_PROGRESS");

    await prisma.appointment.update({
      where: { id: appointment.id },
      data: { status: "IN_PROGRESS" },
    });
    await auditDoctorEvent("doctor.visit.start", ctx.userId, { appointmentId: appointment.id }, appointment.patientUserId);
    revalidatePaths();
  });
}

export async function completeConsultation(raw: { appointmentId: string }) {
  const input = appointmentIdSchema.parse(raw);
  return withDoctorMutation(async (ctx) => {
    const appointment = await getOwnedAppointment(ctx.doctorId, input.appointmentId);
    if (!appointment) throw new DomainRuleError("NOT_FOUND");
    assertCanComplete(appointment.status);

    await prisma.appointment.update({
      where: { id: appointment.id },
      data: { status: "COMPLETED", completedAt: new Date() },
    });
    await auditDoctorEvent("doctor.visit.complete", ctx.userId, { appointmentId: appointment.id }, appointment.patientUserId);
    revalidatePaths();
  });
}

export async function markNoShow(raw: { appointmentId: string; reason?: string }) {
  const input = markNoShowSchema.parse(raw);
  return withDoctorMutation(async (ctx) => {
    const appointment = await getOwnedAppointment(ctx.doctorId, input.appointmentId);
    if (!appointment) throw new DomainRuleError("NOT_FOUND");
    assertCanMarkNoShow(appointment.status);

    await prisma.appointment.update({
      where: { id: appointment.id },
      data: { status: "NO_SHOW", noShowAt: new Date(), noShowReason: input.reason ?? null },
    });
    await auditDoctorEvent("doctor.visit.noshow", ctx.userId, { appointmentId: appointment.id }, appointment.patientUserId);
    revalidatePaths();
  });
}

function revalidatePaths() {
  revalidatePath("/[locale]/doctor", "layout");
}
