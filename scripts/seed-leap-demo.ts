import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();
const PATIENT_EMAIL = "patient@hakeem.local";
const DOCTOR_EMAIL = "doctor@hakeem.local";

async function acknowledgeTelehealth(patientUserId: string, actorUserId: string) {
  const telehealthType = await prisma.consentType.findUnique({ where: { code: "TELEHEALTH" } });
  if (!telehealthType) {
    console.warn("TELEHEALTH consent type missing");
    return;
  }
  const textVersion = await prisma.consentTextVersion.findFirst({
    where: { typeId: telehealthType.id, locale: "EN" },
    orderBy: { version: "desc" },
  });
  if (!textVersion) return;
  const existing = await prisma.consentEvent.findFirst({
    where: { patientUserId, textVersionId: textVersion.id, kind: "ACKNOWLEDGE" },
  });
  if (existing) return;
  await prisma.consentEvent.create({
    data: { patientUserId, textVersionId: textVersion.id, kind: "ACKNOWLEDGE", actorUserId },
  });
  console.log("TELEHEALTH consent acknowledged.");
}

async function main() {
  const patient = await prisma.user.findUnique({ where: { email: PATIENT_EMAIL } });
  const doctorUser = await prisma.user.findUnique({
    where: { email: DOCTOR_EMAIL },
    select: { id: true, doctorProfileId: true },
  });
  if (!patient) throw new Error("Demo patient not found. Run prisma:seed.");
  if (!doctorUser?.doctorProfileId) throw new Error("Demo doctor not found. Run prisma:seed.");
  const doctorId = doctorUser.doctorProfileId;
  await prisma.appointment.updateMany({
    where: {
      OR: [
        { patientUserId: patient.id, status: "IN_PROGRESS" },
        { doctorId, status: "IN_PROGRESS" },
      ],
    },
    data: { status: "COMPLETED", completedAt: new Date() },
  });
  await acknowledgeTelehealth(patient.id, patient.id);
  const startAt = new Date();
  const endAt = new Date(startAt.getTime() + 60 * 60 * 1000);
  const appointment = await prisma.appointment.create({
    data: {
      patientUserId: patient.id,
      doctorId,
      mode: "VIDEO",
      status: "CHECKED_IN",
      startAt,
      endAt,
      checkedInAt: new Date(),
      reason: "LEAP 2026 live demo",
    },
  });
  const site = process.env.NEXT_PUBLIC_SITE_URL || "https://hakeem-git-development-patexs.vercel.app";
  console.log("LEAP demo appointment:", appointment.id);
  console.log("Patient:", `${site}/en/patient/consultations/${appointment.id}`);
  console.log("Doctor:", `${site}/en/doctor/appointments/${appointment.id}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
