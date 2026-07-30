"use server";

import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { withPatient } from "@/actions/patient/_helpers";
import { filterVisibleLabs } from "@/domain/patient/labs";
import { auditPhiAccess } from "@/lib/patient/phi-audit";
import { AuthDomainError } from "@/auth/errors";

const PAGE_SIZE = 20;
const listSchema = z.object({ page: z.coerce.number().int().min(1).default(1) });

export async function listLabs(input?: unknown) {
  const parsed = listSchema.safeParse(input ?? {});
  if (!parsed.success) return { ok: false as const, code: "VALIDATION_ERROR" };

  return withPatient(async (userId) => {
    const where = { patientUserId: userId, releaseStatus: "RELEASED" as const };
    const [raw, total] = await Promise.all([
      prisma.labResult.findMany({
        where,
        include: { document: { select: { id: true, title: true } } },
        orderBy: { resultedAt: "desc" },
        skip: (parsed.data.page - 1) * PAGE_SIZE,
        take: PAGE_SIZE,
      }),
      prisma.labResult.count({ where }),
    ]);
    const items = filterVisibleLabs(raw);
    await auditPhiAccess("phi.view.lab", userId);
    return { items, total, page: parsed.data.page, pageSize: PAGE_SIZE };
  });
}

export async function getLab(id: string) {
  return withPatient(async (userId) => {
    const lab = await prisma.labResult.findFirst({
      where: { id, patientUserId: userId },
      include: { document: true },
    });
    if (!lab || lab.releaseStatus !== "RELEASED") {
      throw new AuthDomainError("FORBIDDEN");
    }
    await auditPhiAccess("phi.view.lab", userId, { labId: id });
    return lab;
  });
}
