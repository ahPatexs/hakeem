"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { withDoctor } from "./_helpers";
import { updateDoctorProfileSchema, updateDoctorSettingsSchema } from "@/lib/doctor/schemas";
import type { z } from "zod";

export async function getDoctorProfile() {
  return withDoctor(async (ctx) => {
    const [user, cmsDoctor, extras, settings] = await Promise.all([
      prisma.user.findUnique({
        where: { id: ctx.userId },
        select: { id: true, name: true, email: true, createdAt: true },
      }),
      prisma.doctor.findUnique({
        where: { id: ctx.doctorId },
        select: {
          nameEn: true,
          nameAr: true,
          titleEn: true,
          titleAr: true,
          photoUrl: true,
          yearsExperience: true,
          specialty: { select: { nameEn: true, nameAr: true } },
        },
      }),
      prisma.doctorProfileExtras.findUnique({ where: { userId: ctx.userId } }),
      prisma.portalSettings.findUnique({ where: { userId: ctx.userId } }),
    ]);
    return { user, cmsDoctor, extras, settings };
  });
}

export async function updateDoctorProfile(raw: z.input<typeof updateDoctorProfileSchema>) {
  const input = updateDoctorProfileSchema.parse(raw);
  return withDoctor(async (ctx) => {
    await prisma.doctorProfileExtras.upsert({
      where: { userId: ctx.userId },
      update: { bio: input.bio ?? null, languages: input.languages, timezone: input.timezone ?? null },
      create: {
        userId: ctx.userId,
        bio: input.bio ?? null,
        languages: input.languages,
        timezone: input.timezone ?? null,
      },
    });
    revalidatePath("/[locale]/doctor", "layout");
    return { saved: true };
  });
}

export async function updateDoctorSettings(raw: z.input<typeof updateDoctorSettingsSchema>) {
  const input = updateDoctorSettingsSchema.parse(raw);
  return withDoctor(async (ctx) => {
    const data = {
      ...(input.locale ? { locale: input.locale } : {}),
      ...(input.theme ? { theme: input.theme } : {}),
      ...(input.notifyAppointmentEmail !== undefined ? { notifyAppointmentEmail: input.notifyAppointmentEmail } : {}),
      ...(input.notifyClinicalEmail !== undefined ? { notifyClinicalEmail: input.notifyClinicalEmail } : {}),
      ...(input.notifyPrescriptionEmail !== undefined ? { notifyPrescriptionEmail: input.notifyPrescriptionEmail } : {}),
      ...(input.notifyPaymentEmail !== undefined ? { notifyPaymentEmail: input.notifyPaymentEmail } : {}),
      ...(input.notifySystemEmail !== undefined ? { notifySystemEmail: input.notifySystemEmail } : {}),
    };
    await prisma.portalSettings.upsert({
      where: { userId: ctx.userId },
      update: data,
      create: { userId: ctx.userId, ...data },
    });
    revalidatePath("/[locale]/doctor", "layout");
    return { saved: true };
  });
}
