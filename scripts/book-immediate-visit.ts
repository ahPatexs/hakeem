import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const PATIENT_EMAIL = "ahelal@patexs.com";
const DOCTOR_EMAIL = "alaa-helal@outlook.com";
const SLOT_MINUTES = 30;

async function main() {
  const patient = await prisma.user.findUnique({
    where: { email: PATIENT_EMAIL },
    select: { id: true, name: true, email: true },
  });
  const doctorUser = await prisma.user.findUnique({
    where: { email: DOCTOR_EMAIL },
    select: { id: true, name: true, doctorProfileId: true },
  });
  if (!patient) throw new Error(`Missing patient ${PATIENT_EMAIL}`);
  if (!doctorUser?.doctorProfileId) throw new Error(`Missing doctor ${DOCTOR_EMAIL}`);

  const startAt = new Date();
  const endAt = new Date(startAt.getTime() + SLOT_MINUTES * 60 * 1000);

  await prisma.doctorPatientPanel.upsert({
    where: {
      doctorId_patientUserId: {
        doctorId: doctorUser.doctorProfileId,
        patientUserId: patient.id,
      },
    },
    update: {},
    create: {
      doctorId: doctorUser.doctorProfileId,
      patientUserId: patient.id,
    },
  });

  const appointment = await prisma.appointment.create({
    data: {
      patientUserId: patient.id,
      doctorId: doctorUser.doctorProfileId,
      mode: "VIDEO",
      status: "IN_PROGRESS",
      startAt,
      endAt,
      reason: "Immediate test visit",
      checkedInAt: startAt,
    },
  });

  await prisma.notification.createMany({
    data: [
      {
        recipientUserId: patient.id,
        category: "APPOINTMENT",
        title: "Video visit is ready",
        body: "You can join your visit with Dr. Alaa Helal now.",
        href: `/patient/consultations/${appointment.id}`,
      },
      {
        recipientUserId: doctorUser.id,
        category: "APPOINTMENT",
        title: "Patient is waiting",
        body: `${patient.name ?? patient.email} is ready to join the video visit.`,
        href: `/doctor/consultations/${appointment.id}`,
      },
    ],
  });

  console.log("appointmentId", appointment.id);
  console.log("patientJoin", `/en/patient/consultations/${appointment.id}`);
  console.log("doctorJoin", `/en/doctor/consultations/${appointment.id}`);
  console.log("windowUntil", endAt.toISOString());
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
