import type { Appointment, Notification, SoapNote, User } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { DOCTOR_DASHBOARD_CAPS } from "@/domain/doctor/dashboard";
import { auditDoctorEvent } from "@/lib/doctor/phi-audit";

export type WidgetResult<T> = { ok: true; data: T } | { ok: false; error: string };

export type ScheduleItem = Appointment & {
  patient: Pick<User, "id" | "name" | "email">;
};

export type PendingNote = SoapNote & {
  patient: Pick<User, "id" | "name">;
};

export interface DoctorDashboardStats {
  todayTotal: number;
  todayCompleted: number;
  inQueue: number;
  pendingNotes: number;
  weekUpcoming: number;
}

export interface DoctorDashboardBundle {
  today: WidgetResult<{ items: ScheduleItem[]; total: number }>;
  upcoming: WidgetResult<ScheduleItem[]>;
  stats: WidgetResult<DoctorDashboardStats>;
  pendingNotes: WidgetResult<PendingNote[]>;
  notifications: WidgetResult<{ unreadCount: number; items: Notification[] }>;
}

function dayRange(now = new Date()): { start: Date; end: Date } {
  const start = new Date(now);
  start.setHours(0, 0, 0, 0);
  const end = new Date(start);
  end.setDate(end.getDate() + 1);
  return { start, end };
}

const PATIENT_SELECT = { select: { id: true, name: true, email: true } } as const;

async function loadToday(doctorId: string): Promise<{ items: ScheduleItem[]; total: number }> {
  const { start, end } = dayRange();
  const where = {
    doctorId,
    startAt: { gte: start, lt: end },
    status: { notIn: ["HELD" as const, "RESCHEDULED" as const] },
  };
  const [items, total] = await Promise.all([
    prisma.appointment.findMany({
      where,
      orderBy: { startAt: "asc" },
      take: DOCTOR_DASHBOARD_CAPS.todayAppointments,
      include: { patient: PATIENT_SELECT },
    }),
    prisma.appointment.count({ where }),
  ]);
  return { items, total };
}

async function loadUpcoming(doctorId: string): Promise<ScheduleItem[]> {
  const { end } = dayRange();
  return prisma.appointment.findMany({
    where: {
      doctorId,
      startAt: { gte: end },
      status: { in: ["CONFIRMED", "CHECKED_IN"] },
    },
    orderBy: { startAt: "asc" },
    take: DOCTOR_DASHBOARD_CAPS.upcomingConsultations,
    include: { patient: PATIENT_SELECT },
  });
}

async function loadStats(doctorId: string): Promise<DoctorDashboardStats> {
  const { start, end } = dayRange();
  const weekEnd = new Date(end);
  weekEnd.setDate(weekEnd.getDate() + 7);

  const [todayTotal, todayCompleted, inQueue, pendingNotes, weekUpcoming] = await Promise.all([
    prisma.appointment.count({
      where: { doctorId, startAt: { gte: start, lt: end }, status: { notIn: ["HELD", "RESCHEDULED"] } },
    }),
    prisma.appointment.count({
      where: { doctorId, startAt: { gte: start, lt: end }, status: "COMPLETED" },
    }),
    prisma.appointment.count({
      where: { doctorId, status: "CHECKED_IN", startAt: { gte: start, lt: end } },
    }),
    prisma.soapNote.count({ where: { doctorId, status: "DRAFT" } }),
    prisma.appointment.count({
      where: { doctorId, startAt: { gte: end, lt: weekEnd }, status: { in: ["CONFIRMED", "CHECKED_IN"] } },
    }),
  ]);

  return { todayTotal, todayCompleted, inQueue, pendingNotes, weekUpcoming };
}

async function loadPendingNotes(doctorId: string): Promise<PendingNote[]> {
  return prisma.soapNote.findMany({
    where: { doctorId, status: "DRAFT" },
    orderBy: { updatedAt: "asc" },
    take: DOCTOR_DASHBOARD_CAPS.pendingNotes,
    include: { patient: { select: { id: true, name: true } } },
  });
}

async function loadNotifications(userId: string): Promise<{ unreadCount: number; items: Notification[] }> {
  const [unreadCount, items] = await Promise.all([
    prisma.notification.count({ where: { recipientUserId: userId, readAt: null, dismissedAt: null } }),
    prisma.notification.findMany({
      where: { recipientUserId: userId, dismissedAt: null },
      orderBy: { createdAt: "desc" },
      take: DOCTOR_DASHBOARD_CAPS.notificationPreview,
    }),
  ]);
  return { unreadCount, items };
}

function settle<T>(result: PromiseSettledResult<T>): WidgetResult<T> {
  if (result.status === "fulfilled") return { ok: true, data: result.value };
  console.error("[doctor dashboard] widget failed", result.reason);
  return { ok: false, error: "WIDGET_LOAD_FAILED" };
}

export async function getDoctorDashboardBundle(
  userId: string,
  doctorId: string,
): Promise<DoctorDashboardBundle> {
  const [today, upcoming, stats, pendingNotes, notifications] = await Promise.allSettled([
    loadToday(doctorId),
    loadUpcoming(doctorId),
    loadStats(doctorId),
    loadPendingNotes(doctorId),
    loadNotifications(userId),
  ]);

  await auditDoctorEvent("doctor.chart.view", userId, { surface: "dashboard" });

  return {
    today: settle(today),
    upcoming: settle(upcoming),
    stats: settle(stats),
    pendingNotes: settle(pendingNotes),
    notifications: settle(notifications),
  };
}
