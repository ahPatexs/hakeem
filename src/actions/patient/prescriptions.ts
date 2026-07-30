"use server";

import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { withPatient } from "@/actions/patient/_helpers";
import { auditPhiAccess } from "@/lib/patient/phi-audit";
import { AuthDomainError } from "@/auth/errors";

const PAGE_SIZE = 20;
const listSchema = z.object({ page: z.coerce.number().int().min(1).default(1) });

export async function listPrescriptions(input?: unknown) {
  const parsed = listSchema.safeParse(input ?? {});
  if (!parsed.success) return { ok: false as const, code: "VALIDATION_ERROR" };

  return withPatient(async (userId) => {
    const where = { patientUserId: userId };
    const [items, total] = await Promise.all([
      prisma.prescription.findMany({
        where,
        include: {
          doctor: { select: { nameEn: true, nameAr: true } },
          document: { select: { id: true, title: true } },
        },
        orderBy: { prescribedAt: "desc" },
        skip: (parsed.data.page - 1) * PAGE_SIZE,
        take: PAGE_SIZE,
      }),
      prisma.prescription.count({ where }),
    ]);
    await auditPhiAccess("phi.view.prescription", userId);
    return { items, total, page: parsed.data.page, pageSize: PAGE_SIZE };
  });
}

export async function getPrescription(id: string) {
  return withPatient(async (userId) => {
    const rx = await prisma.prescription.findFirst({
      where: { id, patientUserId: userId },
      include: {
        doctor: { select: { nameEn: true, nameAr: true, slug: true } },
        document: true,
      },
    });
    if (!rx) throw new AuthDomainError("FORBIDDEN");
    await auditPhiAccess("phi.view.prescription", userId, { prescriptionId: id });
    return rx;
  });
}
