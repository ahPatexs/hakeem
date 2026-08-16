"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { withDoctor } from "./_helpers";
import { updateDoctorProfileSchema, updateDoctorSettingsSchema } from "@/lib/doctor/schemas";
import { AuthDomainError } from "@/auth/errors";
import { storeDoctorPhoto } from "@/lib/platform/image";
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
          ratingAvg: true,
          ratingCount: true,
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

function isPhotoFile(value: FormDataEntryValue | null): value is File {
  return Boolean(
    value &&
      typeof value === "object" &&
      "arrayBuffer" in value &&
      "size" in value &&
      typeof (value as File).size === "number" &&
      (value as File).size > 0,
  );
}

export async function uploadDoctorPhoto(formData: FormData) {
  return withDoctor(async (ctx) => {
    const file = formData.get("photo");
    if (!isPhotoFile(file)) {
      throw new AuthDomainError("VALIDATION_ERROR", "Photo file is required");
    }
    const body = Buffer.from(await file.arrayBuffer());
    const stored = await storeDoctorPhoto({
      doctorId: ctx.doctorId,
      fileName: file.name || "photo.jpg",
      contentType: file.type,
      body,
    });
    await prisma.doctor.update({
      where: { id: ctx.doctorId },
      data: { photoUrl: stored.photoUrl },
    });
    revalidatePath("/[locale]/doctor", "layout");
    revalidatePath("/[locale]/doctors", "page");
    revalidatePath("/[locale]/patient", "layout");
    return { photoUrl: stored.photoUrl };
  });
}

export async function updateDoctorSettings(raw: z.input<typeof updateDoctorSettingsSchema>) {
  const parsed = updateDoctorSettingsSchema.safeParse(raw);
  if (!parsed.success) return { ok: false as const, code: "VALIDATION_ERROR" };
  const input = parsed.data;
  return withDoctor(async (ctx) => {
    await prisma.portalSettings.upsert({
      where: { userId: ctx.userId },
      update: {
        locale: input.locale,
        theme: input.theme,
        notifyAppointmentEmail: input.notifyAppointmentEmail,
        notifyClinicalEmail: input.notifyClinicalEmail,
        notifyPrescriptionEmail: input.notifyPrescriptionEmail,
        notifySystemEmail: input.notifySystemEmail,
      },
      create: {
        userId: ctx.userId,
        locale: input.locale,
        theme: input.theme,
        notifyAppointmentEmail: input.notifyAppointmentEmail,
        notifyClinicalEmail: input.notifyClinicalEmail,
        notifyPrescriptionEmail: input.notifyPrescriptionEmail,
        notifySystemEmail: input.notifySystemEmail,
      },
    });
    revalidatePath("/[locale]/doctor", "layout");
    return { saved: true };
  });
}
