"use client";

import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { useRouter, Link } from "@/i18n/routing";
import { Button } from "@/components/ui/button";
import { Pagination } from "@/components/patient/shared/pagination";
import { EmptyState } from "@/components/patient/shared/empty-state";
import { StatusBadge } from "@/components/patient/shared/status-badge";
import { createPaymentIntent, markPaymentPaid } from "@/actions/patient/payments";
import type { PaymentObligation, PaymentAttempt } from "@prisma/client";

export function PaymentsList({
  items,
  total,
  page,
  pageSize,
}: {
  items: PaymentObligation[];
  total: number;
  page: number;
  pageSize: number;
}) {
  const t = useTranslations("patient.payments");

  if (items.length === 0) {
    return <EmptyState title={t("emptyTitle")} description={t("emptyDescription")} />;
  }

  return (
    <div>
      <ul className="divide-y divide-outline-variant/15 rounded-2xl border border-outline-variant/20 bg-surface-container-low">
        {items.map((o) => (
          <li key={o.id} className="flex flex-wrap items-center justify-between gap-3 p-4">
            <div>
              <Link href={`/patient/payments/${o.id}`} className="font-medium text-primary hover:underline">
                {o.description}
              </Link>
              <p className="text-sm text-on-surface-variant">
                {(o.amountCents / 100).toFixed(2)} {o.currency}
              </p>
            </div>
            <StatusBadge status={o.status} variant="payment" />
          </li>
        ))}
      </ul>
      <Pagination page={page} pageSize={pageSize} total={total} />
    </div>
  );
}

export function PaymentDetail({
  obligation,
}: {
  obligation: PaymentObligation & { attempts: PaymentAttempt[] };
}) {
  const t = useTranslations("patient.payments");
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function handlePay() {
    setError(null);
    startTransition(async () => {
      const intent = await createPaymentIntent({ obligationId: obligation.id });
      if (!intent.ok) {
        setError(t("payError"));
        return;
      }
      const paid = await markPaymentPaid({
        obligationId: obligation.id,
        providerIntentId: intent.data.intent.providerIntentId,
      });
      if (!paid.ok) {
        setError(t("payError"));
        return;
      }
      router.refresh();
    });
  }

  return (
    <article className="glass-card space-y-4 rounded-2xl border border-outline-variant/20 p-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <h1 className="font-headline text-2xl text-primary">{obligation.description}</h1>
        <StatusBadge status={obligation.status} variant="payment" />
      </div>
      <p className="text-lg font-semibold text-primary">
        {(obligation.amountCents / 100).toFixed(2)} {obligation.currency}
      </p>
      {obligation.status === "PENDING" || obligation.status === "FAILED" ? (
        <>
          <p className="text-xs text-on-surface-variant">{t("stubPayNote")}</p>
          {error ? <p className="text-sm text-red-600">{error}</p> : null}
          <Button variant="soft" disabled={pending} onClick={handlePay}>
            {pending ? t("paying") : t("payNow")}
          </Button>
        </>
      ) : null}
    </article>
  );
}
