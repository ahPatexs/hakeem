"use server";

import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { withPatient, withPatientMutation } from "@/actions/patient/_helpers";
import { auditPhiAccess } from "@/lib/patient/phi-audit";

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
      prisma.user.findUnique({ where: { id: userId }, select: { name: true, email: true } }),
    ]);
    await auditPhiAccess("phi.view.record", userId, { scope: "profile" });
    return {
      profile,
      name: user?.name ?? "",
      email: user?.email ?? "",
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
  });
}
