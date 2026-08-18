"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ConfirmReasonDialog } from "@/components/admin/shared/confirm-reason-dialog";
import { refundPayment, disputePayment, reconcileStuck, decideRefundRequest } from "@/actions/admin/billing";

export function BillingDetailActions({
  obligationId,
  refundableCents,
  pendingRequestId,
}: {
  obligationId: string;
  refundableCents: number;
  pendingRequestId?: string | null;
}) {
  const t = useTranslations("admin.billing.actions");
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [dialog, setDialog] = useState<"refund" | "dispute" | "approve" | "reject" | null>(null);
  const [partialCents, setPartialCents] = useState(refundableCents);

  return (
    <div className="space-y-3">
      {refundableCents > 0 ? (
        <div className="flex flex-wrap items-end gap-2">
          <label className="text-sm">
            {t("amount")}
            <Input
              type="number"
              min={1}
              max={refundableCents}
              value={partialCents}
              onChange={(e) => setPartialCents(Number(e.target.value))}
              className="mt-1 max-w-[10rem]"
            />
          </label>
          <Button onClick={() => setDialog("refund")}>{t("refund")}</Button>
        </div>
      ) : null}
      {pendingRequestId ? (
        <div className="flex gap-2">
          <Button onClick={() => setDialog("approve")}>{t("approveRequest")}</Button>
          <Button variant="outline" onClick={() => setDialog("reject")}>
            {t("rejectRequest")}
          </Button>
        </div>
      ) : null}
      <div className="flex gap-2">
        <Button variant="outline" onClick={() => setDialog("dispute")}>
          {t("dispute")}
        </Button>
        <Button
          variant="outline"
          disabled={pending}
          onClick={() =>
            startTransition(async () => {
              await reconcileStuck({ obligationId });
              router.refresh();
            })
          }
        >
          {t("reconcile")}
        </Button>
      </div>

      <ConfirmReasonDialog
        open={dialog === "refund"}
        onOpenChange={(o) => !o && setDialog(null)}
        title={t("refundTitle")}
        confirmLabel={t("refund")}
        pending={pending}
        onConfirm={(reason) =>
          startTransition(async () => {
            await refundPayment({ obligationId, amountCents: partialCents, reason });
            setDialog(null);
            router.refresh();
          })
        }
      />
      <ConfirmReasonDialog
        open={dialog === "approve"}
        onOpenChange={(o) => !o && setDialog(null)}
        title={t("approveTitle")}
        confirmLabel={t("approveRequest")}
        pending={pending}
        onConfirm={(reason) =>
          startTransition(async () => {
            if (pendingRequestId) {
              await decideRefundRequest({
                requestId: pendingRequestId,
                approve: true,
                reason,
                amountCents: partialCents,
              });
            }
            setDialog(null);
            router.refresh();
          })
        }
      />
      <ConfirmReasonDialog
        open={dialog === "reject"}
        onOpenChange={(o) => !o && setDialog(null)}
        title={t("rejectTitle")}
        confirmLabel={t("rejectRequest")}
        pending={pending}
        onConfirm={(reason) =>
          startTransition(async () => {
            if (pendingRequestId) {
              await decideRefundRequest({ requestId: pendingRequestId, approve: false, reason });
            }
            setDialog(null);
            router.refresh();
          })
        }
      />
      <ConfirmReasonDialog
        open={dialog === "dispute"}
        onOpenChange={(o) => !o && setDialog(null)}
        title={t("disputeTitle")}
        confirmLabel={t("dispute")}
        pending={pending}
        onConfirm={(note) =>
          startTransition(async () => {
            await disputePayment({ obligationId, note });
            setDialog(null);
            router.refresh();
          })
        }
      />
    </div>
  );
}
