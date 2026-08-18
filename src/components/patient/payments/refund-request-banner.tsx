"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/patient/shared/confirm-dialog";
import { requestRefund } from "@/actions/patient/payments";
import { useRouter } from "@/i18n/routing";
import type { PaymentObligation, RefundRequest } from "@prisma/client";

export function RefundRequestBanner({
  obligation,
}: {
  obligation: PaymentObligation & {
    refundRequests: RefundRequest[];
    appointment: { id: string; status: string; startAt: Date } | null;
  };
}) {
  const t = useTranslations("patient.payments");
  const router = useRouter();
  const [message, setMessage] = useState<string | null>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const remaining = Math.max(0, obligation.amountCents - obligation.refundedAmountCents);
  const openRequest = obligation.refundRequests.find((r) => r.status === "PENDING_REVIEW");
  const latestRejected = obligation.refundRequests.find((r) => r.status === "REJECTED");
  const cancelledBeforeStart =
    obligation.appointment?.status === "CANCELLED" &&
    obligation.appointment.startAt.getTime() > Date.now();
  const refundEligible =
    remaining > 0 &&
    (obligation.status === "PAID" || obligation.status === "PARTIALLY_REFUNDED") &&
    cancelledBeforeStart &&
    !openRequest;

  const rejectionNote =
    latestRejected?.decisionReason && !openRequest
      ? t("refundRejected", { reason: latestRejected.decisionReason })
      : null;

  if (openRequest) {
    return <p className="rounded-2xl border border-outline-variant/20 px-4 py-3 text-sm">{t("refundUnderReview")}</p>;
  }

  if (!refundEligible) {
    if (obligation.status === "PAID" || obligation.status === "PARTIALLY_REFUNDED") {
      return (
        <div className="space-y-2">
          {rejectionNote ? <p className="rounded-2xl border border-outline-variant/20 px-4 py-3 text-sm">{rejectionNote}</p> : null}
          <p className="text-sm text-on-surface-variant">{t("refundIneligible")}</p>
        </div>
      );
    }
    return rejectionNote ? <p className="rounded-2xl border border-outline-variant/20 px-4 py-3 text-sm">{rejectionNote}</p> : null;
  }

  return (
    <div className="space-y-2">
      {rejectionNote ? <p className="rounded-2xl border border-outline-variant/20 px-4 py-3 text-sm">{rejectionNote}</p> : null}
      <Button type="button" variant="outline" onClick={() => setConfirmOpen(true)}>
        {t("requestRefund")}
      </Button>
      {message ? <p className="text-sm text-on-surface-variant">{message}</p> : null}
      <ConfirmDialog
        open={confirmOpen}
        onOpenChange={setConfirmOpen}
        title={t("refundConfirmTitle")}
        description={t("refundConfirmBody")}
        confirmLabel={t("requestRefund")}
        cancelLabel={t("confirmCancel")}
        onConfirm={async () => {
          const result = await requestRefund({ obligationId: obligation.id });
          setMessage(result.ok ? t("refundRequested") : t("refundUnavailable"));
          router.refresh();
        }}
      />
    </div>
  );
}
