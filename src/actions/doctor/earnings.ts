"use server";

import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { withDoctor } from "@/actions/doctor/_helpers";
import { EARNINGS_COUNTED_STATUSES, summarizeEarnings } from "@/domain/billing/earnings";

const periodSchema = z.object({
  period: z.enum(["month", "7d", "30d"]).optional(),
  from: z.string().optional(),
  to: z.string().optional(),
});

export async function getEarningsSummary(input?: unknown) {
  const parsed = periodSchema.safeParse(input ?? {});
  if (!parsed.success) return { ok: false as const, code: "VALIDATION_ERROR" };

  return withDoctor(async (ctx) => {
    const createdAt: { gte?: Date; lte?: Date } = {};
    if (parsed.data.from) createdAt.gte = new Date(parsed.data.from);
    else if (parsed.data.period === "7d") {
      createdAt.gte = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    } else if (parsed.data.period === "30d") {
      createdAt.gte = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    } else {
      const start = new Date();
      start.setDate(1);
      start.setHours(0, 0, 0, 0);
      createdAt.gte = start;
    }
    if (parsed.data.to) {
      const lte = new Date(parsed.data.to);
      lte.setHours(23, 59, 59, 999);
      createdAt.lte = lte;
    }

    const rows = await prisma.paymentObligation.findMany({
      where: {
        status: { in: [...EARNINGS_COUNTED_STATUSES] },
        appointment: { doctorId: ctx.doctorId },
        ...(Object.keys(createdAt).length ? { createdAt } : {}),
      },
      select: {
        id: true,
        appointmentId: true,
        amountCents: true,
        refundedAmountCents: true,
        status: true,
        description: true,
        createdAt: true,
        appointment: { select: { patient: { select: { name: true, email: true } } } },
      },
      orderBy: { createdAt: "desc" },
      take: 500,
    });

    return {
      summary: summarizeEarnings(rows),
      items: rows.map((r) => ({
        ...r,
        netCents: r.amountCents - r.refundedAmountCents,
        patientLabel: r.appointment?.patient?.name ?? r.appointment?.patient?.email ?? "",
      })),
    };
  });
}

export async function listPaidConsultations(input?: unknown) {
  return getEarningsSummary(input);
}

export async function listDoctorTransactions(input?: unknown) {
  return getEarningsSummary(input);
}
