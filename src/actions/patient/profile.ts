"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { withPatient, withPatientMutation } from "@/actions/patient/_helpers";
import { auditPhiAccess } from "@/lib/patient/phi-audit";
import { AuthDomainError } from "@/auth/errors";
import { storePatientPhoto } from "@/lib/platform/image";

const profileSchema = z.object({
  name: z.string().trim().min(2).max(120).optional(),
  phone: z.string().max(32).optional().nullable(),
  dateOfBirth: z.string().datetime().optional().nullable(),
  sexAtBirth: z.string().max(32).optional().nullable(),
  addressLine1: z.string().max(200).optional().nullable(),
  city: z.string().max(100).optional().nullable(),
  region: z.string().max(100).optional().nullable(),
  emergencyContactName: z.string().max(120).optional().nullable(),
  emergencyContactPhone: z.string().max(32).optional().nullable(),
  insuranceProvider: z.string().max(120).optional().nullable(),
  insurancePolicyNumber: z.string().max(64).optional().nullable(),
});

export async function getPatientProfile() {
  return withPatient(async (userId) => {
    const [profile, user] = await Promise.all([
      prisma.patientProfile.findUnique({ where: { userId } }),
      prisma.user.findUnique({ where: { id: userId }, select: { name: true, email: true, image: true } }),
    ]);
    await auditPhiAccess("phi.view.record", userId, { scope: "profile" });
    return {
      profile,
      name: user?.name ?? "",
      email: user?.email ?? "",
      image: user?.image ?? null,
    };
  });
}

export async function updatePatientProfile(input: unknown) {
  const parsed = profileSchema.safeParse(input);
  if (!parsed.success) return { ok: false as const, code: "VALIDATION_ERROR" };

  return withPatientMutation(async (userId) => {
    const { name, ...profileFields } = parsed.data;
    const data = {
      ...profileFields,
      dateOfBirth: profileFields.dateOfBirth ? new Date(profileFields.dateOfBirth) : null,
    };
    await prisma.$transaction([
      prisma.patientProfile.upsert({
        where: { userId },
        create: { userId, ...data },
        update: data,
      }),
      ...(name
        ? [
            prisma.user.update({
              where: { id: userId },
              data: { name },
            }),
          ]
        : []),
    ]);
    await auditPhiAccess("phi.view.record", userId, { scope: "profile.update" });
    revalidatePath("/[locale]/patient", "layout");
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

export async function uploadPatientPhoto(formData: FormData) {
  return withPatient(async (userId) => {
    const file = formData.get("photo");
    if (!isPhotoFile(file)) {
      throw new AuthDomainError("VALIDATION_ERROR", "Photo file is required");
    }
    const body = Buffer.from(await file.arrayBuffer());
    const stored = await storePatientPhoto({
      userId,
      fileName: file.name || "photo.jpg",
      contentType: file.type,
      body,
    });
    await prisma.user.update({
      where: { id: userId },
      data: { image: stored.photoUrl },
    });
    await auditPhiAccess("phi.view.record", userId, { scope: "profile.photo" });
    revalidatePath("/[locale]/patient", "layout");
    return { photoUrl: stored.photoUrl };
  });
}
