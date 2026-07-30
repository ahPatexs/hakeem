import { prisma } from "@/lib/prisma";
import { canAccessDocument } from "@/domain/platform/documents";
import { hasCareRelationship } from "@/domain/doctor/care-relationship";
import { platformFail, platformOk, type PlatformResult } from "@/domain/platform/outcomes";

export async function getPatientTimeline(input: {
  patientUserId: string;
  viewerUserId: string;
  viewerRole: "PATIENT" | "DOCTOR" | "ADMIN";
  doctorId?: string | null;
  limit?: number;
}): Promise<
  PlatformResult<
    Array<{
      id: string;
      kind: "appointment" | "upload" | "notification";
      title: string;
      occurredAt: string;
      href?: string;
    }>
  >
> {
  const limit = Math.min(input.limit ?? 30, 50);

  let hasCare = false;
  if (input.viewerRole === "DOCTOR" && input.doctorId) {
    hasCare = await hasCareRelationship(input.doctorId, input.patientUserId);
  }

  const allowed = canAccessDocument(input.viewerUserId, input.patientUserId, input.viewerRole, {
    scanStatus: "CLEAN",
    hasCareRelationship: hasCare,
  });
  if (!allowed && input.viewerRole !== "ADMIN") {
    return platformFail("FORBIDDEN", "Timeline access denied");
  }

  const [appointments, uploads, notifications] = await Promise.all([
    prisma.appointment.findMany({
      where: { patientUserId: input.patientUserId },
      orderBy: { startAt: "desc" },
      take: limit,
      select: { id: true, status: true, startAt: true, mode: true },
    }),
    prisma.patientUpload.findMany({
      where: { patientUserId: input.patientUserId, scanStatus: "CLEAN" },
      orderBy: { createdAt: "desc" },
      take: limit,
      select: { id: true, fileName: true, createdAt: true },
    }),
    prisma.notification.findMany({
      where: { recipientUserId: input.patientUserId },
      orderBy: { createdAt: "desc" },
      take: limit,
      select: { id: true, title: true, createdAt: true, href: true },
    }),
  ]);

  const events = [
    ...appointments.map((a) => ({
      id: `appt:${a.id}`,
      kind: "appointment" as const,
      title: `${a.mode} · ${a.status}`,
      occurredAt: a.startAt.toISOString(),
      href: `/patient/appointments/${a.id}`,
    })),
    ...uploads.map((u) => ({
      id: `upload:${u.id}`,
      kind: "upload" as const,
      title: u.fileName,
      occurredAt: u.createdAt.toISOString(),
    })),
    ...notifications.map((n) => ({
      id: `notif:${n.id}`,
      kind: "notification" as const,
      title: n.title,
      occurredAt: n.createdAt.toISOString(),
      href: n.href ?? undefined,
    })),
  ]
    .sort((a, b) => (a.occurredAt < b.occurredAt ? 1 : -1))
    .slice(0, limit);

  return platformOk(events);
}
