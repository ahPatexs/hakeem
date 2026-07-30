import type {
  Appointment,
  Doctor,
  MedicalRecord,
  Notification,
  PaymentObligation,
  Prescription,
} from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { isActivePrescription } from "@/domain/patient/prescriptions";
import { auditPhiAccess } from "@/lib/patient/phi-audit";

export const DASHBOARD_CAPS = {
  upcomingAppointments: 3,
  recentDoctors: 5,
  activePrescriptions: 3,
  recentRecords: 3,
  notificationPreview: 5,
} as const;

export type WidgetResult<T> =
  | { ok: true; data: T }
  | { ok: false; error: string };

export type UpcomingAppointment = Appointment & {
  doctor: Pick<Doctor, "id" | "slug" | "nameEn" | "nameAr" | "photoUrl">;
};

export type RecentDoctor = Pick<Doctor, "id" | "slug" | "nameEn" | "nameAr" | "photoUrl" | "titleEn" | "titleAr">;

export interface DashboardBundle {
  upcoming: WidgetResult<UpcomingAppointment[]>;
  recentDoctors: WidgetResult<RecentDoctor[]>;
  activePrescriptions: WidgetResult<Prescription[]>;
  recentRecords: WidgetResult<MedicalRecord[]>;
  notifications: WidgetResult<{ unreadCount: number; items: Notification[] }>;
  paymentStatus: WidgetResult<{ pendingCount: number; pendingTotalCents: number; obligations: PaymentObligation[] }>;
}

async function loadUpcoming(userId: string): Promise<UpcomingAppointment[]> {
  const now = new Date();
  return prisma.appointment.findMany({
    where: {
      patientUserId: userId,
      status: { in: ["HELD", "CONFIRMED", "IN_PROGRESS"] },
      OR: [{ status: "HELD" }, { startAt: { gte: now } }],
    },
    orderBy: { startAt: "asc" },
    take: DASHBOARD_CAPS.upcomingAppointments,
    include: {
      doctor: {
        select: { id: true, slug: true, nameEn: true, nameAr: true, photoUrl: true },
      },
    },
  });
}

async function loadRecentDoctors(userId: string): Promise<RecentDoctor[]> {
  const recent = await prisma.appointment.findMany({
    where: {
      patientUserId: userId,
      status: { in: ["CONFIRMED", "COMPLETED", "IN_PROGRESS"] },
    },
    orderBy: { startAt: "desc" },
    take: DASHBOARD_CAPS.recentDoctors * 2,
    select: { doctorId: true },
  });

  const seen = new Set<string>();
  const doctorIds: string[] = [];
  for (const row of recent) {
    if (seen.has(row.doctorId)) continue;
    seen.add(row.doctorId);
    doctorIds.push(row.doctorId);
    if (doctorIds.length >= DASHBOARD_CAPS.recentDoctors) break;
  }

  if (doctorIds.length === 0) return [];

  const doctors = await prisma.doctor.findMany({
    where: { id: { in: doctorIds } },
    select: {
      id: true,
      slug: true,
      nameEn: true,
      nameAr: true,
      photoUrl: true,
      titleEn: true,
      titleAr: true,
    },
  });

  const byId = new Map(doctors.map((d) => [d.id, d]));
  return doctorIds.map((id) => byId.get(id)).filter(Boolean) as RecentDoctor[];
}

async function loadActivePrescriptions(userId: string): Promise<Prescription[]> {
  const candidates = await prisma.prescription.findMany({
    where: { patientUserId: userId, status: "ACTIVE" },
    orderBy: { prescribedAt: "desc" },
    take: DASHBOARD_CAPS.activePrescriptions * 2,
  });
  return candidates.filter((rx: Prescription) => isActivePrescription(rx)).slice(0, DASHBOARD_CAPS.activePrescriptions);
}

async function loadRecentRecords(userId: string): Promise<MedicalRecord[]> {
  return prisma.medicalRecord.findMany({
    where: { patientUserId: userId },
    orderBy: { recordedAt: "desc" },
    take: DASHBOARD_CAPS.recentRecords,
  });
}

async function loadNotificationSummary(userId: string): Promise<{ unreadCount: number; items: Notification[] }> {
  const [unreadCount, items] = await Promise.all([
    prisma.notification.count({
      where: { recipientUserId: userId, readAt: null, dismissedAt: null },
    }),
    prisma.notification.findMany({
      where: { recipientUserId: userId, dismissedAt: null },
      orderBy: { createdAt: "desc" },
      take: DASHBOARD_CAPS.notificationPreview,
    }),
  ]);
  return { unreadCount, items };
}

async function loadPaymentStatus(userId: string): Promise<{
  pendingCount: number;
  pendingTotalCents: number;
  obligations: PaymentObligation[];
}> {
  const obligations = await prisma.paymentObligation.findMany({
    where: { patientUserId: userId, status: "PENDING" },
    orderBy: { createdAt: "desc" },
    take: 5,
  });
  const pendingTotalCents = obligations.reduce((sum: number, o: PaymentObligation) => sum + o.amountCents, 0);
  return { pendingCount: obligations.length, pendingTotalCents, obligations };
}

function settle<T>(result: PromiseSettledResult<T>, fallbackError = "WIDGET_LOAD_FAILED"): WidgetResult<T> {
  if (result.status === "fulfilled") {
    return { ok: true, data: result.value };
  }
  console.error("[dashboard] widget failed", result.reason);
  return { ok: false, error: fallbackError };
}

export async function getDashboardBundle(userId: string): Promise<DashboardBundle> {
  const [upcoming, recentDoctors, activePrescriptions, recentRecords, notifications, paymentStatus] =
    await Promise.allSettled([
      loadUpcoming(userId),
      loadRecentDoctors(userId),
      loadActivePrescriptions(userId),
      loadRecentRecords(userId),
      loadNotificationSummary(userId),
      loadPaymentStatus(userId),
    ]);

  await auditPhiAccess("phi.dashboard.load", userId);

  return {
    upcoming: settle(upcoming),
    recentDoctors: settle(recentDoctors),
    activePrescriptions: settle(activePrescriptions),
    recentRecords: settle(recentRecords),
    notifications: settle(notifications),
    paymentStatus: settle(paymentStatus),
  };
}
