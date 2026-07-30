/**
 * Seed script for Neon/Prisma.
 * Requires DATABASE_URL. Module 0 uses StaticContentProvider until Neon is provisioned.
 *
 * Run: npm run prisma:seed
 */
import { PrismaClient, PublishStatus } from "@prisma/client";
import { hash } from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  const cardiology = await prisma.specialty.upsert({
    where: { slug: "cardiology" },
    update: {},
    create: { slug: "cardiology", nameEn: "Cardiology", nameAr: "أمراض القلب", sortOrder: 1 },
  });

  await prisma.doctor.upsert({
    where: { slug: "dr-ahmed-al-faisal" },
    update: {},
    create: {
      slug: "dr-ahmed-al-faisal",
      status: PublishStatus.PUBLISHED,
      nameEn: "Dr. Ahmed Al-Faisal",
      nameAr: "د. أحمد الفيصل",
      titleEn: "Senior Cardiologist",
      titleAr: "استشاري قلب أول",
      bioEn: "Specializing in minimally invasive cardiac procedures and preventive heart health.",
      bioAr: "متخصص في إجراءات القلب طفيفة التوغل والوقاية من أمراض القلب.",
      languages: ["ar", "en"],
      yearsExperience: 15,
      isAvailable: true,
      specialtyId: cardiology.id,
      publishedAt: new Date(),
    },
  });

  await prisma.siteSetting.upsert({
    where: { key: "pricing.enabled" },
    update: { value: false },
    create: { key: "pricing.enabled", value: false },
  });

  const adminEmail = "admin@hakeem.local";
  const passwordHash = await hash("Admin!Pass1234", 12);
  await prisma.user.upsert({
    where: { email: adminEmail },
    update: {
      passwordHash,
      role: "ADMIN",
      status: "ACTIVE",
      emailVerified: new Date(),
    },
    create: {
      email: adminEmail,
      name: "Bootstrap Admin",
      passwordHash,
      role: "ADMIN",
      status: "ACTIVE",
      emailVerified: new Date(),
    },
  });

  const patientEmail = "patient@hakeem.local";
  const patientHash = await hash("Patient!Pass1234", 12);
  const patient = await prisma.user.upsert({
    where: { email: patientEmail },
    update: {
      passwordHash: patientHash,
      status: "ACTIVE",
      emailVerified: new Date(),
      name: "Demo Patient",
    },
    create: {
      email: patientEmail,
      name: "Demo Patient",
      passwordHash: patientHash,
      role: "PATIENT",
      status: "ACTIVE",
      emailVerified: new Date(),
    },
  });

  await prisma.patientProfile.upsert({
    where: { userId: patient.id },
    update: { phone: "+966500000001", city: "Riyadh" },
    create: {
      userId: patient.id,
      phone: "+966500000001",
      city: "Riyadh",
      emergencyContactName: "Family Contact",
      emergencyContactPhone: "+966500000002",
      insuranceProvider: "Demo Insurance",
    },
  });

  await prisma.medicalProfile.upsert({
    where: { userId: patient.id },
    update: {},
    create: {
      userId: patient.id,
      allergies: ["Penicillin"],
      conditions: ["Mild asthma"],
      currentMedications: ["Inhaler as needed"],
    },
  });

  await prisma.portalSettings.upsert({
    where: { userId: patient.id },
    update: {},
    create: { userId: patient.id, locale: "EN" },
  });

  const publishedDoctor = await prisma.doctor.findFirst({
    where: { status: "PUBLISHED" },
  });

  // Linked doctor account for portal QA (Module 4)
  const doctorEmail = "doctor@hakeem.local";
  const doctorHash = await hash("Doctor!Pass1234", 12);
  if (publishedDoctor) {
    await prisma.user.upsert({
      where: { email: doctorEmail },
      update: {
        passwordHash: doctorHash,
        role: "DOCTOR",
        status: "ACTIVE",
        emailVerified: new Date(),
        name: "Demo Doctor",
        doctorProfileId: publishedDoctor.id,
        doctorApproval: "APPROVED",
      },
      create: {
        email: doctorEmail,
        name: "Demo Doctor",
        passwordHash: doctorHash,
        role: "DOCTOR",
        status: "ACTIVE",
        emailVerified: new Date(),
        doctorProfileId: publishedDoctor.id,
        doctorApproval: "APPROVED",
      },
    });

    const doctorUser = await prisma.user.findUnique({ where: { email: doctorEmail } });
    if (doctorUser) {
      await prisma.portalSettings.upsert({
        where: { userId: doctorUser.id },
        update: {},
        create: { userId: doctorUser.id, locale: "EN" },
      });

      const todayStart = new Date();
      todayStart.setHours(9, 0, 0, 0);
      const todayEnd = new Date(todayStart.getTime() + 30 * 60 * 1000);
      const existingToday = await prisma.appointment.findFirst({
        where: {
          patientUserId: patient.id,
          doctorId: publishedDoctor.id,
          status: { in: ["CHECKED_IN", "CONFIRMED", "IN_PROGRESS"] },
          startAt: { gte: new Date(new Date().setHours(0, 0, 0, 0)) },
        },
      });
      if (!existingToday) {
        await prisma.appointment.create({
          data: {
            patientUserId: patient.id,
            doctorId: publishedDoctor.id,
            mode: "VIDEO",
            status: "CHECKED_IN",
            startAt: todayStart,
            endAt: todayEnd,
            checkedInAt: new Date(),
            reason: "Follow-up consultation (demo)",
          },
        });
      }

      await prisma.notification.create({
        data: {
          recipientUserId: doctorUser.id,
          category: "QUEUE",
          title: "Patient checked in",
          body: "Demo Patient is waiting in your queue.",
          href: "/doctor/queue",
        },
      }).catch(() => undefined);

      await prisma.labResult.create({
        data: {
          patientUserId: patient.id,
          title: "Lipid Panel (preliminary)",
          releaseStatus: "PENDING_REVIEW",
          phase: "PRELIMINARY",
          criticalFlag: false,
          resultedAt: new Date(),
          summary: "Awaiting physician review (demo)",
        },
      }).catch(() => undefined);
    }
  }

  if (publishedDoctor) {
    const startAt = new Date(Date.now() + 3 * 24 * 60 * 60 * 1000);
    startAt.setHours(10, 0, 0, 0);
    const endAt = new Date(startAt.getTime() + 30 * 60 * 1000);
    const existing = await prisma.appointment.findFirst({
      where: { patientUserId: patient.id, status: "CONFIRMED" },
    });
    if (!existing) {
      await prisma.appointment.create({
        data: {
          patientUserId: patient.id,
          doctorId: publishedDoctor.id,
          mode: "VIDEO",
          status: "CONFIRMED",
          startAt,
          endAt,
          reason: "General consultation",
        },
      });
    }

    await prisma.prescription.create({
      data: {
        patientUserId: patient.id,
        medicationName: "Vitamin D3",
        instructions: "1 tablet daily",
        status: "ACTIVE",
        prescribedAt: new Date(),
        endsAt: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000),
        doctorId: publishedDoctor.id,
      },
    }).catch(() => undefined);

    await prisma.prescription.create({
      data: {
        patientUserId: patient.id,
        medicationName: "Amoxicillin (draft)",
        instructions: "Draft prescription pending physician review",
        status: "DRAFT",
        prescribedAt: new Date(),
        doctorId: publishedDoctor.id,
        lines: {
          create: [
            {
              medicationName: "Amoxicillin",
              dose: "500mg",
              frequency: "TID",
              sortOrder: 0,
            },
          ],
        },
      },
    }).catch(() => undefined);

    await prisma.labResult.create({
      data: {
        patientUserId: patient.id,
        title: "Complete Blood Count",
        releaseStatus: "RELEASED",
        phase: "FINAL",
        resultedAt: new Date(),
        summary: "Within normal limits (demo)",
      },
    }).catch(() => undefined);

    await prisma.medicalRecord.create({
      data: {
        patientUserId: patient.id,
        title: "Initial consultation summary",
        recordType: "encounter",
        summary: "Demo medical record for portal QA.",
        recordedAt: new Date(),
        doctorId: publishedDoctor.id,
      },
    }).catch(() => undefined);
  }

  await prisma.notification.create({
    data: {
      recipientUserId: patient.id,
      category: "SYSTEM",
      title: "Welcome to Hakeem Patient Portal",
      body: "Your dashboard is ready. Book an appointment anytime.",
      href: "/patient/appointments/book",
    },
  }).catch(() => undefined);

  await prisma.paymentObligation.upsert({
    where: { idempotencyKey: `seed-pending-${patient.id}` },
    update: {},
    create: {
      patientUserId: patient.id,
      description: "Consultation fee (demo)",
      amountCents: 15000,
      currency: "SAR",
      status: "PENDING",
      idempotencyKey: `seed-pending-${patient.id}`,
    },
  });

  console.log(
    "Seed complete (admin@hakeem.local / patient@hakeem.local / doctor@hakeem.local Doctor!Pass1234)",
  );
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
