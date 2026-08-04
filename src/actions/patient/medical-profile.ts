"use server";

import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { withPatient, withPatientMutation } from "@/actions/patient/_helpers";
import { auditPhiAccess } from "@/lib/patient/phi-audit";

/** Non-history fields only — allergies/conditions live in EMR typed tables (T136). */
const medicalProfileSchema = z.object({
  bloodType: z.string().max(8).optional().nullable(),
  currentMedications: z.array(z.string().max(120)).optional(),
  notes: z.string().max(2000).optional().nullable(),
});

export async function getMedicalProfile() {
  return withPatient(async (userId) => {
    const profile = await prisma.medicalProfile.findUnique({ where: { userId } });
    await auditPhiAccess("phi.view.record", userId, { scope: "medical-profile" });
    return profile;
  });
}

export async function updateMedicalProfile(input: unknown) {
  const parsed = medicalProfileSchema.safeParse(input);
  if (!parsed.success) return { ok: false as const, code: "VALIDATION_ERROR" };

  return withPatientMutation(async (userId) => {
    await prisma.medicalProfile.upsert({
      where: { userId },
      create: {
        userId,
        bloodType: parsed.data.bloodType ?? null,
        allergies: [],
        conditions: [],
        currentMedications: parsed.data.currentMedications ?? [],
        notes: parsed.data.notes ?? null,
      },
      update: {
        bloodType: parsed.data.bloodType ?? null,
        currentMedications: parsed.data.currentMedications ?? [],
        notes: parsed.data.notes ?? null,
        // Do not overwrite allergies/conditions — EMR HistoryEditor is SoT (T136)
      },
    });
    await auditPhiAccess("phi.view.record", userId, { scope: "medical-profile.update" });
  });
}
