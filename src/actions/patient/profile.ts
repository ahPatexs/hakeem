"use server";

import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { withPatient, withPatientMutation } from "@/actions/patient/_helpers";
import { auditPhiAccess } from "@/lib/patient/phi-audit";

const profileSchema = z.object({
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
    const profile = await prisma.patientProfile.findUnique({ where: { userId } });
    await auditPhiAccess("phi.view.record", userId, { scope: "profile" });
    return profile;
  });
}

export async function updatePatientProfile(input: unknown) {
  const parsed = profileSchema.safeParse(input);
  if (!parsed.success) return { ok: false as const, code: "VALIDATION_ERROR" };

  return withPatientMutation(async (userId) => {
    const data = {
      ...parsed.data,
      dateOfBirth: parsed.data.dateOfBirth ? new Date(parsed.data.dateOfBirth) : null,
    };
    await prisma.patientProfile.upsert({
      where: { userId },
      create: { userId, ...data },
      update: data,
    });
    await auditPhiAccess("phi.view.record", userId, { scope: "profile.update" });
  });
}
