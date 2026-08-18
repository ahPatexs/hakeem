import { prisma } from "@/lib/prisma";
import { ACTIVE_APPOINTMENT_STATUSES, periodStart, settleWidget, type WidgetResult } from "@/lib/admin/dashboard";

export type DashboardSnapshot = {
  totalPatients: WidgetResult<number>;
  totalDoctors: WidgetResult<number>;
  activeAppointments: WidgetResult<number>;
  revenueSummary: WidgetResult<{ grossCents: number; refundCents: number; netCents: number; stuckCount: number }>;
  aiUsage: WidgetResult<{ patientMessages: number; doctorMessages: number }>;
  platformStatus: WidgetResult<{ overall: string; checkedAt: string | null }>;
  pendingDoctorApprovals: WidgetResult<number>;
  recentActivities: WidgetResult<
    Array<{ id: string; type: string; outcome: string; createdAt: string; actorEmail: string | null }>
  >;
  unreadNotifications: WidgetResult<number>;
};

async function countPatients() {
  return prisma.user.count({ where: { role: "PATIENT", status: "ACTIVE" } });
}

async function countDoctors() {
  return prisma.user.count({ where: { role: "DOCTOR", doctorApproval: "APPROVED", status: "ACTIVE" } });
}

async function countActiveAppointments() {
  return prisma.appointment.count({ where: { status: { in: ACTIVE_APPOINTMENT_STATUSES } } });
}

async function revenueSummary() {
  const since = periodStart(30);
  const [paid, stuckCount] = await Promise.all([
    prisma.paymentObligation.findMany({
      where: { status: { in: ["PAID", "PARTIALLY_REFUNDED", "REFUNDED"] }, createdAt: { gte: since } },
      select: { amountCents: true, refundedAmountCents: true },
      take: 5000,
    }),
    prisma.paymentObligation.count({
      where: {
        status: "PROCESSING",
        processingStartedAt: { lte: new Date(Date.now() - 15 * 60 * 1000) },
      },
    }),
  ]);
  const grossCents = paid.reduce((s, p) => s + p.amountCents, 0);
  const refundCents = paid.reduce((s, p) => s + p.refundedAmountCents, 0);
  return { grossCents, refundCents, netCents: grossCents - refundCents, stuckCount };
}

async function aiUsage() {
  const since = periodStart(30);
  const [patientMessages, doctorMessages] = await Promise.all([
    prisma.aiMessage.count({ where: { createdAt: { gte: since } } }),
    prisma.doctorAiMessage.count({ where: { createdAt: { gte: since } } }),
  ]);
  return { patientMessages, doctorMessages };
}

async function platformStatus() {
  const snap = await prisma.systemHealthSnapshot.findFirst({ orderBy: { checkedAt: "desc" } });
  return { overall: snap?.overall ?? "HEALTHY", checkedAt: snap?.checkedAt.toISOString() ?? null };
}

async function pendingDoctorApprovals() {
  return prisma.user.count({ where: { role: "DOCTOR", doctorApproval: "PENDING_APPROVAL" } });
}

async function recentActivities() {
  const rows = await prisma.securityAuditEvent.findMany({
    where: { type: { startsWith: "admin." } },
    orderBy: { createdAt: "desc" },
    take: 10,
    include: { actor: { select: { email: true } } },
  });
  return rows.map((r) => ({
    id: r.id,
    type: r.type,
    outcome: r.outcome,
    createdAt: r.createdAt.toISOString(),
    actorEmail: r.actor?.email ?? null,
  }));
}

async function unreadNotifications(adminUserId: string) {
  return prisma.notification.count({
    where: { recipientUserId: adminUserId, readAt: null, dismissedAt: null },
  });
}

export async function buildDashboardSnapshot(adminUserId: string): Promise<DashboardSnapshot> {
  const results = await Promise.allSettled([
    countPatients(),
    countDoctors(),
    countActiveAppointments(),
    revenueSummary(),
    aiUsage(),
    platformStatus(),
    pendingDoctorApprovals(),
    recentActivities(),
    unreadNotifications(adminUserId),
  ]);

  const [a, b, c, d, e, f, g, h, i] = results;
  return {
    totalPatients: settleWidget(a),
    totalDoctors: settleWidget(b),
    activeAppointments: settleWidget(c),
    revenueSummary: settleWidget(d),
    aiUsage: settleWidget(e),
    platformStatus: settleWidget(f),
    pendingDoctorApprovals: settleWidget(g),
    recentActivities: settleWidget(h),
    unreadNotifications: settleWidget(i),
  };
}
