"use client";

import { useLocale, useTranslations } from "next-intl";
import { Link } from "@/i18n/routing";
import { Button } from "@/components/ui/button";
import { formatBillingDateTime } from "@/domain/billing/constants";
import type { PaymentObligation, PaymentRefund } from "@prisma/client";

export function InvoicePanel({
  obligation,
}: {
  obligation: PaymentObligation & {
    refunds: PaymentRefund[];
    appointment: { id: string } | null;
    patient?: { name: string | null; email: string } | null;
  };
}) {
  const t = useTranslations("patient.payments");
  const locale = useLocale();
  const captured =
    obligation.status !== "PENDING" &&
    obligation.status !== "FAILED" &&
    obligation.status !== "CANCELLED" &&
    obligation.status !== "PROCESSING";
  const issuedAt = obligation.invoicedAt ?? obligation.createdAt;
  const payer = obligation.patient?.name || obligation.patient?.email;

  return (
    <article className="glass-card space-y-3 rounded-2xl border border-outline-variant/20 p-6">
      <h2 className="font-headline text-lg text-primary">{t("invoiceTitle")}</h2>
      <dl className="grid gap-2 text-sm">
        <div className="flex justify-between gap-4">
          <dt className="text-on-surface-variant">{t("invoiceNumber")}</dt>
          <dd>{obligation.invoiceNumber ?? t("invoicePending")}</dd>
        </div>
        {payer ? (
          <div className="flex justify-between gap-4">
            <dt className="text-on-surface-variant">{t("payer")}</dt>
            <dd>{payer}</dd>
          </div>
        ) : null}
        <div className="flex justify-between gap-4">
          <dt className="text-on-surface-variant">{t("issuedAt")}</dt>
          <dd>{formatBillingDateTime(issuedAt, locale)}</dd>
        </div>
        <div className="flex justify-between gap-4">
          <dt className="text-on-surface-variant">{t("amount")}</dt>
          <dd>
            {(obligation.amountCents / 100).toFixed(2)} {obligation.currency}
          </dd>
        </div>
        {obligation.appointment ? (
          <div className="flex justify-between gap-4">
            <dt className="text-on-surface-variant">{t("visit")}</dt>
            <dd>
              <Link className="text-med-green hover:underline" href={`/patient/appointments/${obligation.appointment.id}`}>
                {obligation.appointment.id}
              </Link>
            </dd>
          </div>
        ) : null}
      </dl>
      {captured ? (
        <Button asChild variant="outline" className="rounded-full">
          <Link href={`/patient/payments/${obligation.id}/receipt`}>{t("downloadReceipt")}</Link>
        </Button>
      ) : null}
      {obligation.refunds.length > 0 ? (
        <ul className="space-y-2 text-sm">
          {obligation.refunds.map((r) => (
            <li key={r.id} className="rounded-xl border border-outline-variant/15 px-4 py-3">
              {t("creditNote")}: {r.creditNoteNumber} — {(r.amountCents / 100).toFixed(2)} {r.currency}
            </li>
          ))}
        </ul>
      ) : null}
    </article>
  );
}
