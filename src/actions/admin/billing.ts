"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import {
  requestMeta,
  withAdminPermission,
  type AdminActionResult,
  type AdminMutationResult,
} from "@/actions/admin/_helpers";
import { PAGE_SIZE, REASON_MIN } from "@/domain/admin/constants";
import { adminAudit, ADMIN_AUDIT_TYPES } from "@/lib/admin/audit";
import { validateReason } from "@/domain/admin/user-lifecycle";
import { periodStart } from "@/lib/admin/dashboard";
import { STUCK_PROCESSING_MS } from "@/domain/billing/constants";
import type { PaymentStatus } from "@prisma/client";

const STATUSES = [
  "PENDING",
  "PROCESSING",
  "PAID",
  "FAILED",
  "CANCELLED",
  "REFUNDED",
  "PARTIALLY_REFUNDED",
  "DISPUTED",
] as const;

export async function listPayments(input: unknown): Promise<
  AdminActionResult<{
    items: Array<{
      id: string;
      description: string;
      amountCents: number;
      refundedAmountCents: number;
      status: string;
      invoiceNumber: string | null;
      createdAt: Date;
      patientEmail: string;
    }>;
    total: number;
    page: number;
    pageSize: number;
  }>
> {
  return withAdminPermission("admin:billing:read", async () => {
    const parsed = z
      .object({
        page: z.coerce.number().int().min(1).default(1),
        status: z.enum(STATUSES).optional(),
        stuck: z.coerce.boolean().optional(),
        from: z.string().optional(),
        to: z.string().optional(),
      })
      .safeParse(input ?? {});
    if (!parsed.success) throw new Error("VALIDATION_ERROR");

    const where: {
      status?: PaymentStatus;
      processingStartedAt?: { lte: Date };
      createdAt?: { gte?: Date; lte?: Date };
    } = {};
    if (parsed.data.status) where.status = parsed.data.status;
    if (parsed.data.stuck) {
      where.status = "PROCESSING";
      where.processingStartedAt = { lte: new Date(Date.now() - STUCK_PROCESSING_MS) };
    }
    if (parsed.data.from || parsed.data.to) {
      where.createdAt = {};
      if (parsed.data.from) where.createdAt.gte = new Date(parsed.data.from);
      if (parsed.data.to) {
        const lte = new Date(parsed.data.to);
        lte.setHours(23, 59, 59, 999);
        where.createdAt.lte = lte;
      }
    }

    const [items, total] = await Promise.all([
      prisma.paymentObligation.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip: (parsed.data.page - 1) * PAGE_SIZE,
        take: PAGE_SIZE,
        include: { patient: { select: { email: true } } },
      }),
      prisma.paymentObligation.count({ where }),
    ]);
    return {
      items: items.map((p) => ({
        id: p.id,
        description: p.description,
        amountCents: p.amountCents,
        refundedAmountCents: p.refundedAmountCents,
        status: p.status,
        invoiceNumber: p.invoiceNumber,
        createdAt: p.createdAt,
        patientEmail: p.patient.email,
      })),
      total,
      page: parsed.data.page,
      pageSize: PAGE_SIZE,
    };
  });
}

export async function getPayment(obligationId: string): Promise<
  AdminActionResult<{
    id: string;
    description: string;
    amountCents: number;
    refundedAmountCents: number;
    status: string;
    invoiceNumber: string | null;
    refundReason: string | null;
    disputeNote: string | null;
    patientEmail: string;
    processingStartedAt: Date | null;
    refunds: Array<{ id: string; amountCents: number; creditNoteNumber: string; reason: string }>;
    requests: Array<{ id: string; status: string; requestedAmountCents: number; createdAt: Date }>;
  } | null>
> {
  return withAdminPermission("admin:billing:read", async () => {
    const row = await prisma.paymentObligation.findUnique({
      where: { id: obligationId },
      include: {
        patient: { select: { email: true } },
        refunds: { orderBy: { createdAt: "desc" } },
        refundRequests: { orderBy: { createdAt: "desc" } },
      },
    });
    if (!row) return null;
    return {
      id: row.id,
      description: row.description,
      amountCents: row.amountCents,
      refundedAmountCents: row.refundedAmountCents,
      status: row.status,
      invoiceNumber: row.invoiceNumber,
      refundReason: row.refundReason,
      disputeNote: row.disputeNote,
      patientEmail: row.patient.email,
      processingStartedAt: row.processingStartedAt,
      refunds: row.refunds.map((r) => ({
        id: r.id,
        amountCents: r.amountCents,
        creditNoteNumber: r.creditNoteNumber,
        reason: r.reason,
      })),
      requests: row.refundRequests.map((r) => ({
        id: r.id,
        status: r.status,
        requestedAmountCents: r.requestedAmountCents,
        createdAt: r.createdAt,
      })),
    };
  });
}

export async function listRefundRequests(): Promise<
  AdminActionResult<{
    items: Array<{
      id: string;
      obligationId: string;
      requestedAmountCents: number;
      status: string;
      createdAt: Date;
      patientEmail: string;
    }>;
  }>
> {
  return withAdminPermission("admin:billing:read", async () => {
    const items = await prisma.refundRequest.findMany({
      where: { status: "PENDING_REVIEW" },
      orderBy: { createdAt: "asc" },
      take: 100,
      include: { obligation: { include: { patient: { select: { email: true } } } } },
    });
    return {
      items: items.map((r) => ({
        id: r.id,
        obligationId: r.obligationId,
        requestedAmountCents: r.requestedAmountCents,
        status: r.status,
        createdAt: r.createdAt,
        patientEmail: r.obligation.patient.email,
      })),
    };
  });
}

export async function decideRefundRequest(input: unknown): Promise<AdminMutationResult> {
  try {
    const admin = await (await import("@/actions/admin/_helpers")).requireAdminPermission("admin:billing:refund");
    const parsed = z
      .object({
        requestId: z.string().min(1),
        approve: z.boolean(),
        reason: z.string().min(REASON_MIN).max(500),
        amountCents: z.number().int().positive().optional(),
      })
      .safeParse(input);
    if (!parsed.success) return { ok: false, code: "VALIDATION_ERROR" };
    const reason = validateReason(parsed.data.reason);
    const row = await prisma.refundRequest.findUnique({
      where: { id: parsed.data.requestId },
      include: { obligation: true },
    });
    if (!row || row.status !== "PENDING_REVIEW") return { ok: false, code: "NOT_FOUND" };

    if (!parsed.data.approve) {
      await prisma.refundRequest.update({
        where: { id: row.id },
        data: {
          status: "REJECTED",
          decisionReason: reason,
          decidedByUserId: admin.id,
          decidedAt: new Date(),
        },
      });
      await adminAudit({
        type: ADMIN_AUDIT_TYPES.billingRefundDecision,
        outcome: "SUCCESS",
        actorUserId: admin.id,
        targetUserId: row.patientUserId,
        meta: { requestId: row.id, approved: false, reason },
      });
      revalidatePath("/admin/billing");
      return { ok: true, message: "Refund request rejected." };
    }

    const amount = parsed.data.amountCents ?? row.requestedAmountCents;
    const { refundObligation } = await import("@/lib/platform/billing");
    const meta = await requestMeta();
    const result = await refundObligation({
      obligationId: row.obligationId,
      amountCents: amount,
      reason,
      actorUserId: admin.id,
      refundRequestId: row.id,
      requestMeta: { ipHash: meta.ipHash, userAgent: meta.userAgent ?? undefined },
    });
    if (!result.ok) return { ok: false, code: result.code };

    await prisma.refundRequest.update({
      where: { id: row.id },
      data: {
        status: "APPROVED",
        decisionReason: reason,
        decidedByUserId: admin.id,
        decidedAt: new Date(),
      },
    });
    await adminAudit({
      type: ADMIN_AUDIT_TYPES.billingRefundDecision,
      outcome: "SUCCESS",
      actorUserId: admin.id,
      targetUserId: row.patientUserId,
      meta: { requestId: row.id, approved: true, amountCents: amount },
    });
    revalidatePath("/admin/billing");
    return { ok: true, message: "Refund approved." };
  } catch (error) {
    const { isAuthDomainError } = await import("@/auth/errors");
    const { isAdminDomainError } = await import("@/domain/admin/errors");
    if (isAuthDomainError(error)) return { ok: false, code: error.code };
    if (isAdminDomainError(error)) return { ok: false, code: error.code };
    return { ok: false, code: "UNKNOWN" };
  }
}

export async function refundPayment(input: unknown): Promise<AdminMutationResult> {
  try {
    const admin = await (await import("@/actions/admin/_helpers")).requireAdminPermission("admin:billing:refund");
    const parsed = z
      .object({
        obligationId: z.string().min(1),
        amountCents: z.number().int().positive(),
        reason: z.string().min(REASON_MIN).max(500),
      })
      .safeParse(input);
    if (!parsed.success) return { ok: false, code: "VALIDATION_ERROR" };
    const reason = validateReason(parsed.data.reason);
    const { refundObligation } = await import("@/lib/platform/billing");
    const meta = await requestMeta();
    const result = await refundObligation({
      obligationId: parsed.data.obligationId,
      amountCents: parsed.data.amountCents,
      reason,
      actorUserId: admin.id,
      requestMeta: {
        ipHash: meta.ipHash,
        userAgent: meta.userAgent ?? undefined,
      },
    });
    if (!result.ok) return { ok: false, code: result.code };
    revalidatePath("/admin/billing");
    return { ok: true, message: "Refund processed." };
  } catch (error) {
    const { isAuthDomainError } = await import("@/auth/errors");
    const { isAdminDomainError } = await import("@/domain/admin/errors");
    if (isAuthDomainError(error)) return { ok: false, code: error.code };
    if (isAdminDomainError(error)) return { ok: false, code: error.code };
    return { ok: false, code: "UNKNOWN" };
  }
}

export async function reconcileStuck(input: unknown): Promise<AdminMutationResult> {
  try {
    const admin = await (await import("@/actions/admin/_helpers")).requireAdminPermission("admin:billing:refund");
    const parsed = z.object({ obligationId: z.string().min(1) }).safeParse(input);
    if (!parsed.success) return { ok: false, code: "VALIDATION_ERROR" };
    const { reconcileObligation } = await import("@/lib/platform/payments");
    const result = await reconcileObligation({
      obligationId: parsed.data.obligationId,
      actorUserId: admin.id,
    });
    if (!result.ok) return { ok: false, code: result.code };
    revalidatePath("/admin/billing");
    return { ok: true, message: "Reconcile complete." };
  } catch (error) {
    const { isAuthDomainError } = await import("@/auth/errors");
    if (isAuthDomainError(error)) return { ok: false, code: error.code };
    return { ok: false, code: "UNKNOWN" };
  }
}

export async function disputePayment(input: unknown): Promise<AdminMutationResult> {
  try {
    const admin = await (await import("@/actions/admin/_helpers")).requireAdminPermission("admin:billing:refund");
    const parsed = z
      .object({ obligationId: z.string().min(1), note: z.string().min(REASON_MIN).max(500) })
      .safeParse(input);
    if (!parsed.success) return { ok: false, code: "VALIDATION_ERROR" };
    const note = validateReason(parsed.data.note);
    const row = await prisma.paymentObligation.findUnique({ where: { id: parsed.data.obligationId } });
    if (!row) return { ok: false, code: "NOT_FOUND" };
    await prisma.paymentObligation.update({
      where: { id: row.id },
      data: {
        status: "DISPUTED",
        disputeNote: note,
        disputedAt: new Date(),
        disputedByUserId: admin.id,
      },
    });
    await adminAudit({
      type: ADMIN_AUDIT_TYPES.billingDispute,
      outcome: "SUCCESS",
      actorUserId: admin.id,
      targetUserId: row.patientUserId,
      meta: { obligationId: row.id, note },
      ...(await requestMeta()),
    });
    revalidatePath("/admin/billing");
    return { ok: true, message: "Dispute recorded." };
  } catch (error) {
    const { isAuthDomainError } = await import("@/auth/errors");
    const { isAdminDomainError } = await import("@/domain/admin/errors");
    if (isAuthDomainError(error)) return { ok: false, code: error.code };
    if (isAdminDomainError(error)) return { ok: false, code: error.code };
    return { ok: false, code: "UNKNOWN" };
  }
}

function revenuePeriodStart(period: "today" | "7d" | "30d" | "custom", from?: string, to?: string): { gte: Date; lte?: Date } {
  if (period === "custom" && from) {
    const gte = new Date(from);
    gte.setHours(0, 0, 0, 0);
    const range: { gte: Date; lte?: Date } = { gte };
    if (to) {
      const lte = new Date(to);
      lte.setHours(23, 59, 59, 999);
      range.lte = lte;
    }
    return range;
  }
  if (period === "today") {
    const gte = new Date();
    gte.setHours(0, 0, 0, 0);
    return { gte };
  }
  const days = period === "7d" ? 7 : 30;
  return { gte: periodStart(days) };
}

export async function revenueSummary(input?: unknown): Promise<
  AdminActionResult<{
    grossCents: number;
    refundCents: number;
    netCents: number;
    failedCount: number;
    stuckCount: number;
  }>
> {
  return withAdminPermission("admin:billing:read", async () => {
    const parsed = z
      .object({
        period: z.enum(["today", "7d", "30d", "custom"]).default("30d"),
        from: z.string().optional(),
        to: z.string().optional(),
      })
      .safeParse(input ?? {});
    if (!parsed.success) throw new Error("VALIDATION_ERROR");
    const createdAt = revenuePeriodStart(parsed.data.period, parsed.data.from, parsed.data.to);
    const [paid, failedCount, stuckCount] = await Promise.all([
      prisma.paymentObligation.aggregate({
        where: { createdAt, status: { in: ["PAID", "PARTIALLY_REFUNDED", "REFUNDED", "DISPUTED"] } },
        _sum: { amountCents: true, refundedAmountCents: true },
      }),
      prisma.paymentObligation.count({ where: { createdAt, status: "FAILED" } }),
      prisma.paymentObligation.count({
        where: {
          status: "PROCESSING",
          processingStartedAt: { lte: new Date(Date.now() - STUCK_PROCESSING_MS) },
        },
      }),
    ]);
    const grossCents = paid._sum.amountCents ?? 0;
    const refundCents = paid._sum.refundedAmountCents ?? 0;
    return { grossCents, refundCents, netCents: grossCents - refundCents, failedCount, stuckCount };
  });
}
