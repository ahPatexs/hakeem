"use server";

import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { withPatient, withPatientMutation } from "@/actions/patient/_helpers";
import { assertCanPay, PaymentDomainError } from "@/domain/patient/payments";
import { assertPatientRefundEligible } from "@/domain/billing/eligibility";
import { refundableBalance } from "@/domain/admin/billing";
import {
  createPaymentIntent as platformCreatePaymentIntent,
  confirmStubPayment,
} from "@/lib/platform/payments";
import { AuthDomainError } from "@/auth/errors";
import { adminAudit, ADMIN_AUDIT_TYPES } from "@/lib/admin/audit";

const PAGE_SIZE = 20;
const TWENTY_FOUR_MONTHS_MS = 24 * 30 * 24 * 60 * 60 * 1000;

const listSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  status: z
    .enum([
      "PENDING",
      "PROCESSING",
      "PAID",
      "FAILED",
      "CANCELLED",
      "REFUNDED",
      "PARTIALLY_REFUNDED",
      "DISPUTED",
    ])
    .optional(),
  from: z.string().optional(),
  to: z.string().optional(),
});

export async function listPayments(input?: unknown) {
  const parsed = listSchema.safeParse(input ?? {});
  if (!parsed.success) return { ok: false as const, code: "VALIDATION_ERROR" };

  return withPatient(async (userId) => {
    const since = new Date(Date.now() - TWENTY_FOUR_MONTHS_MS);
    const where: {
      patientUserId: string;
      createdAt: { gte: Date; lte?: Date };
      status?: (typeof parsed.data)["status"];
    } = {
      patientUserId: userId,
      createdAt: { gte: parsed.data.from ? new Date(parsed.data.from) : since },
    };
    if (parsed.data.to) {
      const lte = new Date(parsed.data.to);
      lte.setHours(23, 59, 59, 999);
      where.createdAt.lte = lte;
    }
    if (parsed.data.status) where.status = parsed.data.status;

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
      include: {
        attempts: { orderBy: { createdAt: "desc" }, take: 8 },
        refunds: { orderBy: { createdAt: "desc" } },
        refundRequests: { orderBy: { createdAt: "desc" }, take: 5 },
        appointment: { select: { id: true, status: true, startAt: true } },
        patient: { select: { name: true, email: true } },
      },
    });
    if (!obligation) throw new AuthDomainError("FORBIDDEN");
    return obligation;
  });
}

const intentSchema = z.object({ obligationId: z.string().min(1) });

function mapPayError(code: string, message?: string): never {
  if (code === "RATE_LIMITED") throw new AuthDomainError("RATE_LIMITED", message);
  if (code === "NOT_FOUND") throw new AuthDomainError("FORBIDDEN");
  throw new AuthDomainError("VALIDATION_ERROR", message ?? code);
}

export async function createPaymentIntent(input: unknown) {
  const parsed = intentSchema.safeParse(input);
  if (!parsed.success) return { ok: false as const, code: "VALIDATION_ERROR" };

  return withPatient(async (userId) => {
    const obligation = await prisma.paymentObligation.findFirst({
      where: { id: parsed.data.obligationId, patientUserId: userId },
    });
    if (!obligation) throw new AuthDomainError("FORBIDDEN");
    try {
      if (obligation.status !== "PROCESSING") {
        assertCanPay(obligation, userId);
      }
    } catch (error) {
      if (error instanceof PaymentDomainError) {
        throw new AuthDomainError("VALIDATION_ERROR", error.message);
      }
      throw error;
    }

    const result = await platformCreatePaymentIntent({
      obligationId: obligation.id,
      patientUserId: userId,
    });
    if (!result.ok) mapPayError(result.code, result.message);

    return {
      intent: {
        providerIntentId: result.data.providerIntentId,
        clientSecret: result.data.clientSecret,
        redirectUrl: result.data.redirectUrl,
        status: "processing" as const,
      },
      idempotencyKey: result.data.idempotencyKey,
    };
  });
}

const confirmSchema = z.object({ obligationId: z.string().min(1) });

/** Demo/stub checkout confirmation — never a live card capture. */
export async function confirmDemoPayment(input: unknown) {
  const parsed = confirmSchema.safeParse(input);
  if (!parsed.success) return { ok: false as const, code: "VALIDATION_ERROR" };

  return withPatient(async (userId) => {
    const result = await confirmStubPayment({
      obligationId: parsed.data.obligationId,
      patientUserId: userId,
    });
    if (!result.ok) mapPayError(result.code, result.message);
    return result.data;
  });
}

const refundRequestSchema = z.object({
  obligationId: z.string().min(1),
  note: z.string().max(500).optional(),
});

export async function requestRefund(input: unknown) {
  const parsed = refundRequestSchema.safeParse(input);
  if (!parsed.success) return { ok: false as const, code: "VALIDATION_ERROR" };

  return withPatientMutation(async (userId) => {
    const obligation = await prisma.paymentObligation.findFirst({
      where: { id: parsed.data.obligationId, patientUserId: userId },
      include: { appointment: { select: { status: true, startAt: true } } },
    });
    if (!obligation) throw new AuthDomainError("FORBIDDEN");

    const remaining = refundableBalance(obligation.amountCents, obligation.refundedAmountCents);
    try {
      assertPatientRefundEligible({
        status: obligation.status,
        remainingCents: remaining,
        appointmentStatus: obligation.appointment?.status ?? null,
        appointmentStartAt: obligation.appointment?.startAt ?? null,
      });
    } catch (error) {
      if (error instanceof PaymentDomainError) {
        throw new AuthDomainError("VALIDATION_ERROR", error.message);
      }
      throw error;
    }

    const open = await prisma.refundRequest.findFirst({
      where: { obligationId: obligation.id, status: "PENDING_REVIEW" },
    });
    if (open) throw new AuthDomainError("VALIDATION_ERROR", "A refund request is already under review");

    await prisma.refundRequest.create({
      data: {
        obligationId: obligation.id,
        patientUserId: userId,
        requestedAmountCents: remaining,
        patientNote: parsed.data.note ?? null,
      },
    });
    await adminAudit({
      type: ADMIN_AUDIT_TYPES.billingRefundRequest,
      outcome: "SUCCESS",
      actorUserId: userId,
      targetUserId: userId,
      meta: { obligationId: obligation.id, amountCents: remaining },
    });
  });
}

export async function recordReceiptDownload(obligationId: string) {
  return withPatient(async (userId) => {
    const obligation = await prisma.paymentObligation.findFirst({
      where: { id: obligationId, patientUserId: userId },
    });
    if (!obligation) throw new AuthDomainError("FORBIDDEN");
    if (obligation.status === "PENDING" || obligation.status === "FAILED" || obligation.status === "CANCELLED") {
      throw new AuthDomainError("VALIDATION_ERROR", "Receipt is not available");
    }
    await adminAudit({
      type: ADMIN_AUDIT_TYPES.billingInvoiceDownload,
      outcome: "SUCCESS",
      actorUserId: userId,
      targetUserId: userId,
      meta: { obligationId },
    });
    return { invoiceNumber: obligation.invoiceNumber };
  });
}
