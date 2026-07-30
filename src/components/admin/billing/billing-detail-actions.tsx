"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { ConfirmReasonDialog } from "@/components/admin/shared/confirm-reason-dialog";
import { refundPayment, disputePayment } from "@/actions/admin/billing";

export function BillingDetailActions({
  obligationId,
  refundableCents,
}: {
  obligationId: string;
  refundableCents: number;
}) {
  const t = useTranslations("admin.billing.actions");
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [dialog, setDialog] = useState<"refund" | "dispute" | null>(null);

  return (
    <div className="flex gap-2">
      {refundableCents > 0 ? (
        <Button onClick={() => setDialog("refund")}>{t("refund")}</Button>
      ) : null}
      <Button variant="outline" onClick={() => setDialog("dispute")}>
        {t("dispute")}
      </Button>

      <ConfirmReasonDialog
        open={dialog === "refund"}
        onOpenChange={(o) => !o && setDialog(null)}
        title={t("refundTitle")}
        confirmLabel={t("refund")}
        pending={pending}
        onConfirm={(reason) =>
          startTransition(async () => {
            await refundPayment({ obligationId, amountCents: refundableCents, reason });
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
