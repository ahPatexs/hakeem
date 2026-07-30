import { prisma } from "@/lib/prisma";
import { getOwnedAppointment } from "./schedule";

/** Everything the consultation workspace needs, in one server load. */
export async function getWorkspaceBundle(doctorId: string, appointmentId: string) {
  const appointment = await getOwnedAppointment(doctorId, appointmentId);
  if (!appointment) return null;

  const patientUserId = appointment.patientUserId;

  const [medicalProfile, profile, latestSoap, latestSummary, prescriptions, recentRecords, recentLabs] =
    await Promise.all([
      prisma.medicalProfile.findUnique({ where: { userId: patientUserId } }),
      prisma.patientProfile.findUnique({ where: { userId: patientUserId } }),
      prisma.soapNote.findFirst({
        where: { appointmentId, status: { in: ["DRAFT", "FINAL"] } },
        orderBy: [{ version: "desc" }, { createdAt: "desc" }],
      }),
      prisma.clinicalSummary.findFirst({
        where: { appointmentId, status: { in: ["DRAFT", "FINAL"] } },
        orderBy: [{ version: "desc" }, { createdAt: "desc" }],
      }),
      prisma.prescription.findMany({
        where: { appointmentId },
        orderBy: { prescribedAt: "desc" },
        include: { lines: { orderBy: { sortOrder: "asc" } } },
      }),
      prisma.medicalRecord.findMany({
        where: { patientUserId },
        orderBy: { recordedAt: "desc" },
        take: 5,
      }),
      prisma.labResult.findMany({
        where: { patientUserId, releaseStatus: { in: ["PENDING_REVIEW", "RELEASED"] } },
        orderBy: { resultedAt: "desc" },
        take: 5,
      }),
    ]);

  return {
    appointment,
    medicalProfile,
    profile,
    latestSoap,
    latestSummary,
    prescriptions,
    recentRecords,
    recentLabs,
  };
}
