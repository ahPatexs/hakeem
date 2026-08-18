"use client";

import { useLocale, useTranslations } from "next-intl";
import { Link } from "@/i18n/routing";
import { Pagination } from "@/components/patient/shared/pagination";
import { EmptyState } from "@/components/patient/shared/empty-state";
import { PaymentStatusBadge } from "@/components/platform/payments/payment-status-badge";
import { PaymentCheckoutPanel } from "@/components/platform/payments/payment-checkout-panel";
import { InvoicePanel } from "@/components/patient/payments/invoice-panel";
import { RefundRequestBanner } from "@/components/patient/payments/refund-request-banner";
import { formatBillingDate } from "@/domain/billing/constants";
import type { PaymentAttempt, PaymentObligation, PaymentRefund, RefundRequest } from "@prisma/client";

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
  const locale = useLocale();

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
                {o.invoiceNumber ? ` · ${o.invoiceNumber}` : ""}
                {` · ${t("chargeDate")}: ${formatBillingDate(o.createdAt, locale)}`}
              </p>
            </div>
            <PaymentStatusBadge status={o.status} />
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
  obligation: PaymentObligation & {
    attempts: PaymentAttempt[];
    refunds: PaymentRefund[];
    refundRequests: RefundRequest[];
    appointment: { id: string; status: string; startAt: Date } | null;
    patient: { name: string | null; email: string };
  };
}) {
  const t = useTranslations("patient.payments");

  return (
    <div className="space-y-6">
      <PaymentCheckoutPanel
        obligationId={obligation.id}
        amountCents={obligation.amountCents}
        currency={obligation.currency}
        description={obligation.description}
        status={obligation.status}
      />

      {obligation.status === "PAID" ? (
        <p className="rounded-2xl bg-med-green/10 px-4 py-3 text-sm text-med-green">{t("successNote")}</p>
      ) : null}
      {obligation.status === "FAILED" ? (
        <p className="rounded-2xl bg-warm-coral/10 px-4 py-3 text-sm text-warm-coral">{t("failedNote")}</p>
      ) : null}

      <InvoicePanel obligation={obligation} />
      <RefundRequestBanner obligation={obligation} />
    </div>
  );
}
