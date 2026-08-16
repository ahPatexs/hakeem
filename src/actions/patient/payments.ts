"use server";

import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { withPatient, withPatientMutation } from "@/actions/patient/_helpers";
import { assertCanPay, PaymentDomainError } from "@/domain/patient/payments";
import { createPaymentIntent as platformCreatePaymentIntent } from "@/lib/platform/payments";
import { createNotification } from "@/lib/patient/notifications";
import { AuthDomainError } from "@/auth/errors";
import { randomUUID } from "node:crypto";

const PAGE_SIZE = 20;
const listSchema = z.object({ page: z.coerce.number().int().min(1).default(1) });

export async function listPayments(input?: unknown) {
  const parsed = listSchema.safeParse(input ?? {});
  if (!parsed.success) return { ok: false as const, code: "VALIDATION_ERROR" };

  return withPatient(async (userId) => {
    const where = { patientUserId: userId };
    const [items, total] = await Promise.all([
      prisma.paymentObligation.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip: (parsed.data.page - 1) * PAGE_SIZE,
        take: PAGE_SIZE,
      }),
      prisma.paymentObligation.count({ where }),
    ]);
    return { items, total, page: parsed.data.page, pageSize: PAGE_SIZE };
  });
}

export async function getPayment(id: string) {
  return withPatient(async (userId) => {
    const obligation = await prisma.paymentObligation.findFirst({
      where: { id, patientUserId: userId },
      include: { attempts: { orderBy: { createdAt: "desc" }, take: 5 } },
    });
    if (!obligation) throw new AuthDomainError("FORBIDDEN");
    return obligation;
  });
}

const intentSchema = z.object({ obligationId: z.string().min(1) });

export async function createPaymentIntent(input: unknown) {
  const parsed = intentSchema.safeParse(input);
  if (!parsed.success) return { ok: false as const, code: "VALIDATION_ERROR" };

  return withPatient(async (userId) => {
    const obligation = await prisma.paymentObligation.findFirst({
      where: { id: parsed.data.obligationId, patientUserId: userId },
    });
    if (!obligation) throw new AuthDomainError("FORBIDDEN");
    try {
      assertCanPay(obligation, userId);
    } catch (error) {
      if (error instanceof PaymentDomainError) {
        throw new AuthDomainError("VALIDATION_ERROR", error.message);
      }
      throw error;
    }

    const idempotencyKey = randomUUID();
    const result = await platformCreatePaymentIntent({
      obligationId: obligation.id,
      patientUserId: userId,
      idempotencyKey,
    });
    if (!result.ok) {
      throw new AuthDomainError("VALIDATION_ERROR", result.message ?? result.code);
    }

    return {
      intent: {
        providerIntentId: result.data.providerIntentId,
        clientSecret: result.data.clientSecret,
        redirectUrl: result.data.redirectUrl,
        status: "pending" as const,
      },
      idempotencyKey: result.data.idempotencyKey,
    };
  });
}

const markPaidSchema = z.object({
  obligationId: z.string().min(1),
  providerIntentId: z.string().min(1),
});

/** Stub checkout is not a live charge and is not required to confirm a booking. */
export async function markPaymentPaid(input: unknown) {
  const parsed = markPaidSchema.safeParse(input);
  if (!parsed.success) return { ok: false as const, code: "VALIDATION_ERROR" };

  return withPatientMutation(async (userId) => {
    const obligation = await prisma.paymentObligation.findFirst({
      where: { id: parsed.data.obligationId, patientUserId: userId },
    });
    if (!obligation) throw new AuthDomainError("FORBIDDEN");
    assertCanPay(obligation, userId);

    await prisma.$transaction([
      prisma.paymentObligation.update({
        where: { id: obligation.id },
        data: { status: "PAID", providerRef: parsed.data.providerIntentId },
      }),
      prisma.paymentAttempt.updateMany({
        where: { obligationId: obligation.id, providerIntentId: parsed.data.providerIntentId },
        data: { status: "PAID" },
      }),
    ]);

    await createNotification({
      recipientUserId: userId,
      category: "PAYMENT",
      title: "Payment received",
      body: `Payment of ${(obligation.amountCents / 100).toFixed(2)} ${obligation.currency} was successful.`,
      href: `/patient/payments/${obligation.id}`,
    });
  });
}
