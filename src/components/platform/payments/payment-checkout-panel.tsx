"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/patient/shared/confirm-dialog";
import { PaymentStatusBadge } from "@/components/platform/payments/payment-status-badge";
import { createPaymentIntent, confirmDemoPayment } from "@/actions/patient/payments";
import { useRouter } from "@/i18n/routing";

export function PaymentCheckoutPanel({
  obligationId,
  amountCents,
  currency,
  description,
  status,
}: {
  obligationId: string;
  amountCents: number;
  currency: string;
  description: string;
  status: string;
}) {
  const t = useTranslations("patient.payments");
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [payOpen, setPayOpen] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const payable = status === "PENDING" || status === "FAILED";
  const processing = status === "PROCESSING";

  async function pay() {
    setError(null);
    const intent = await createPaymentIntent({ obligationId });
    if (!intent.ok) {
      setError(intent.code === "RATE_LIMITED" ? t("rateLimited") : t("payError"));
      return;
    }
    const confirmed = await confirmDemoPayment({ obligationId });
    if (!confirmed.ok) {
      setError(t("payError"));
      return;
    }
    router.refresh();
  }

  async function confirmProcessing() {
    setError(null);
    const confirmed = await confirmDemoPayment({ obligationId });
    if (!confirmed.ok) {
      setError(t("payError"));
      return;
    }
    router.refresh();
  }

  return (
    <section className="glass-card space-y-4 rounded-2xl border border-outline-variant/20 p-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="font-headline text-lg text-primary">{t("checkoutTitle")}</h2>
          <p className="text-sm text-on-surface-variant">{description}</p>
        </div>
        <PaymentStatusBadge status={status} />
      </div>
      <p className="text-2xl font-semibold text-primary">
        {(amountCents / 100).toFixed(2)} {currency}
      </p>
      {processing ? <p className="text-sm text-on-surface-variant">{t("processingNote")}</p> : null}
      {payable ? (
        <Button type="button" onClick={() => setPayOpen(true)} className="rounded-full">
          {t("payNow")}
        </Button>
      ) : null}
      {processing ? (
        <Button type="button" onClick={() => setConfirmOpen(true)} className="rounded-full">
          {t("confirmPay")}
        </Button>
      ) : null}
      {error ? <p className="text-sm text-warm-coral">{error}</p> : null}

      <ConfirmDialog
        open={payOpen}
        onOpenChange={setPayOpen}
        title={t("payConfirmTitle")}
        description={t("payConfirmBody")}
        confirmLabel={t("payNow")}
        cancelLabel={t("confirmCancel")}
        onConfirm={pay}
      />
      <ConfirmDialog
        open={confirmOpen}
        onOpenChange={setConfirmOpen}
        title={t("payConfirmTitle")}
        description={t("payConfirmBody")}
        confirmLabel={t("confirmPay")}
        cancelLabel={t("confirmCancel")}
        onConfirm={confirmProcessing}
      />
    </section>
  );
}
