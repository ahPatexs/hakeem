import { prisma } from "@/lib/prisma";

export async function notifyDoctorPatientCheckedIn(
  doctorUserId: string,
  appointmentId: string,
  patientName: string,
): Promise<void> {
  await prisma.notification.create({
    data: {
      recipientUserId: doctorUserId,
      category: "QUEUE",
      title: "Patient checked in",
      body: `${patientName} has checked in and is waiting.`,
      href: `/doctor/consultations/${appointmentId}`,
    },
  });
}

export async function notifyDoctorVisitSoon(
  doctorUserId: string,
  appointmentId: string,
  patientName: string,
  startsAt: Date,
): Promise<void> {
  const time = startsAt.toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" });
  await prisma.notification.create({
    data: {
      recipientUserId: doctorUserId,
      category: "APPOINTMENT",
      title: "Upcoming visit",
      body: `${patientName} is scheduled at ${time}.`,
      href: `/doctor/appointments/${appointmentId}`,
    },
  });
}

export async function notifyDoctorNewLab(
  doctorUserId: string,
  patientUserId: string,
  labTitle: string,
): Promise<void> {
  await prisma.notification.create({
    data: {
      recipientUserId: doctorUserId,
      category: "RESULTS",
      title: "New lab result",
      body: `${labTitle} is ready for review.`,
      href: `/doctor/patients/${patientUserId}/labs`,
    },
  });
}

export async function notifyDoctorPendingNotesAging(
  doctorUserId: string,
  noteCount: number,
): Promise<void> {
  await prisma.notification.create({
    data: {
      recipientUserId: doctorUserId,
      category: "DOCUMENTATION",
      title: "Pending documentation",
      body:
        noteCount === 1
          ? "You have 1 unsigned SOAP note older than 24 hours."
          : `You have ${noteCount} unsigned SOAP notes older than 24 hours.`,
      href: "/doctor",
    },
  });
}
