import { prisma } from "@/lib/prisma";
import { adminAudit, ADMIN_AUDIT_TYPES } from "@/lib/admin/audit";
import {
  assertRefundAmount,
  assertRefundable,
  nextPaymentStatus,
} from "@/domain/platform/billing";
import { allocateCreditNoteNumber } from "@/domain/billing/invoices";
import { validateReason } from "@/domain/admin/user-lifecycle";
import { platformFail, platformOk, type PlatformResult } from "@/domain/platform/outcomes";
import { notify } from "@/lib/platform/notifications";
import { getPaymentsAdapter } from "@/adapters";

export async function refundObligation(input: {
  obligationId: string;
  amountCents: number;
  reason: string;
  actorUserId: string;
  refundRequestId?: string;
  requestMeta?: { ipHash?: string; userAgent?: string };
}): Promise<PlatformResult<{ creditNoteNumber: string }>> {
  let reason: string;
  try {
    reason = validateReason(input.reason);
  } catch {
    return platformFail("VALIDATION_ERROR");
  }

  const row = await prisma.paymentObligation.findUnique({ where: { id: input.obligationId } });
  if (!row) return platformFail("NOT_FOUND");

  try {
    assertRefundable(row.status, row.amountCents, row.refundedAmountCents);
    assertRefundAmount(row.amountCents, row.refundedAmountCents, input.amountCents);
  } catch {
    return platformFail("CONFLICT", "Refund not allowed");
  }

  const creditNoteNumber = await allocateCreditNoteNumber();
  const adapterResult = await getPaymentsAdapter().refund?.({
    obligationId: row.id,
    providerRef: row.providerRef,
    amountCents: input.amountCents,
    reason,
  });

  const newRefunded = row.refundedAmountCents + input.amountCents;
  await prisma.$transaction([
    prisma.paymentObligation.update({
      where: { id: row.id },
      data: {
        refundedAmountCents: newRefunded,
        refundReason: reason,
        refundedAt: new Date(),
        refundedByUserId: input.actorUserId,
        status: nextPaymentStatus(row.amountCents, newRefunded),
      },
    }),
    prisma.paymentRefund.create({
      data: {
        obligationId: row.id,
        amountCents: input.amountCents,
        currency: row.currency,
        creditNoteNumber,
        reason,
        actorUserId: input.actorUserId,
        refundRequestId: input.refundRequestId ?? null,
        providerRefundId: adapterResult?.providerRefundId ?? null,
        providerHandled: adapterResult?.providerHandled ?? false,
      },
    }),
  ]);

  await adminAudit({
    type: ADMIN_AUDIT_TYPES.billingRefundExecuted,
    outcome: "SUCCESS",
    actorUserId: input.actorUserId,
    targetUserId: row.patientUserId,
    meta: { obligationId: row.id, amountCents: input.amountCents, reason, creditNoteNumber },
    ipHash: input.requestMeta?.ipHash,
    userAgent: input.requestMeta?.userAgent,
  });

  const { notifyAdmins } = await import("@/lib/admin/notify-admins");
  await notifyAdmins({
    category: "PAYMENT",
    title: "Refund processed",
    body: `Refund of ${input.amountCents} cents on obligation ${row.id}.`,
    href: `/admin/billing/${row.id}`,
  });

  await notify({
    recipientUserId: row.patientUserId,
    eventType: "payment.received",
    category: "PAYMENT",
    title: "Refund processed",
    body: "A refund for your payment has been processed. Check your payment history for details.",
    href: "/patient/payments",
  });

  return platformOk({ creditNoteNumber });
}
