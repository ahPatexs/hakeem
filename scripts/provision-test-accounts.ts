import { PrismaClient } from "@prisma/client";
import { hash } from "bcryptjs";

const prisma = new PrismaClient();

const PATIENT_EMAIL = "ahelal@patexs.com";
const PATIENT_NAME = "Patexs";
const PATIENT_PASSWORD = "Patexs!Pass1234";

const DOCTOR_EMAIL = "alaa-helal@outlook.com";
const DOCTOR_NAME_EN = "Alaa Helal";
const DOCTOR_NAME_AR = "Alaa Helal";
const DOCTOR_PASSWORD = "AlaaHelal!Pass1234";
const DOCTOR_SLUG = "alaa-helal";

async function main() {
  let host = "unknown";
  try {
    host = new URL((process.env.DATABASE_URL ?? "").replace(/^prisma\+/, "")).host;
  } catch {
    /* ignore */
  }
  console.log("Provisioning test accounts on", host);

  const patientHash = await hash(PATIENT_PASSWORD, 12);
  const patient = await prisma.user.upsert({
    where: { email: PATIENT_EMAIL },
    update: {
      name: PATIENT_NAME,
      passwordHash: patientHash,
      role: "PATIENT",
      status: "ACTIVE",
      emailVerified: new Date(),
      failedLoginCount: 0,
      lockedUntil: null,
    },
    create: {
      email: PATIENT_EMAIL,
      name: PATIENT_NAME,
      passwordHash: patientHash,
      role: "PATIENT",
      status: "ACTIVE",
      emailVerified: new Date(),
      localePreference: "EN",
    },
  });

  await prisma.patientProfile.upsert({
    where: { userId: patient.id },
    update: {},
    create: { userId: patient.id },
  });
  await prisma.portalSettings.upsert({
    where: { userId: patient.id },
    update: {},
    create: { userId: patient.id, locale: "EN" },
  });
  await prisma.passwordHistory
    .create({ data: { userId: patient.id, passwordHash: patientHash } })
    .catch(() => undefined);

  const specialty =
    (await prisma.specialty.findFirst({ orderBy: { sortOrder: "asc" } })) ??
    (await prisma.specialty.create({
      data: {
        slug: "general-practice",
        nameEn: "General Practice",
        nameAr: "General Practice",
        sortOrder: 0,
      },
    }));

  const cmsDoctor = await prisma.doctor.upsert({
    where: { slug: DOCTOR_SLUG },
    update: {
      status: "PUBLISHED",
      nameEn: DOCTOR_NAME_EN,
      nameAr: DOCTOR_NAME_AR,
      titleEn: "Consultant",
      titleAr: "Consultant",
      isAvailable: true,
      publishedAt: new Date(),
      specialtyId: specialty.id,
      languages: ["en", "ar"],
    },
    create: {
      slug: DOCTOR_SLUG,
      status: "PUBLISHED",
      nameEn: DOCTOR_NAME_EN,
      nameAr: DOCTOR_NAME_AR,
      titleEn: "Consultant",
      titleAr: "Consultant",
      isAvailable: true,
      publishedAt: new Date(),
      specialtyId: specialty.id,
      languages: ["en", "ar"],
    },
  });

  const doctorHash = await hash(DOCTOR_PASSWORD, 12);
  const doctor = await prisma.user.upsert({
    where: { email: DOCTOR_EMAIL },
    update: {
      name: DOCTOR_NAME_EN,
      passwordHash: doctorHash,
      role: "DOCTOR",
      status: "ACTIVE",
      emailVerified: new Date(),
      doctorProfileId: cmsDoctor.id,
      doctorApproval: "APPROVED",
      failedLoginCount: 0,
      lockedUntil: null,
    },
    create: {
      email: DOCTOR_EMAIL,
      name: DOCTOR_NAME_EN,
      passwordHash: doctorHash,
      role: "DOCTOR",
      status: "ACTIVE",
      emailVerified: new Date(),
      doctorProfileId: cmsDoctor.id,
      doctorApproval: "APPROVED",
      localePreference: "EN",
    },
  });

  await prisma.portalSettings.upsert({
    where: { userId: doctor.id },
    update: {},
    create: { userId: doctor.id, locale: "EN" },
  });
  await prisma.passwordHistory
    .create({ data: { userId: doctor.id, passwordHash: doctorHash } })
    .catch(() => undefined);

  for (const weekday of [0, 1, 2, 3, 4]) {
    await prisma.doctorWeeklyHours.upsert({
      where: { doctorId_weekday: { doctorId: cmsDoctor.id, weekday } },
      update: { startMinutes: 9 * 60, endMinutes: 17 * 60, timezone: "Asia/Riyadh" },
      create: {
        doctorId: cmsDoctor.id,
        weekday,
        startMinutes: 9 * 60,
        endMinutes: 17 * 60,
        timezone: "Asia/Riyadh",
      },
    });
  }

  console.log("OK patient", PATIENT_EMAIL);
  console.log("OK doctor", DOCTOR_EMAIL);
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
