import { setRequestLocale, getTranslations } from "next-intl/server";
import { notFound } from "next/navigation";
import { getPayment, recordReceiptDownload } from "@/actions/patient/payments";
import { ErrorState } from "@/components/patient/shared/error-state";
import { Link } from "@/i18n/routing";
import { formatBillingDateTime } from "@/domain/billing/constants";

export default async function PaymentReceiptPage({
  params,
}: {
  params: Promise<{ locale: string; id: string }>;
}) {
  const { locale, id } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("patient.payments");
  const result = await getPayment(id);
  if (!result.ok) {
    if (result.code === "FORBIDDEN") notFound();
    return <ErrorState title={t("loadError")} />;
  }
  const o = result.data;
  const captured =
    o.status !== "PENDING" && o.status !== "FAILED" && o.status !== "CANCELLED" && o.status !== "PROCESSING";
  if (!captured) notFound();
  await recordReceiptDownload(id);

  const issuedAt = o.invoicedAt ?? o.createdAt;
  const payer = o.patient.name || o.patient.email;

  return (
    <article className="mx-auto max-w-lg space-y-4 bg-surface-container-lowest p-8 print:p-0">
      <h1 className="font-headline text-2xl text-primary">{t("receiptTitle")}</h1>
      <p className="text-sm text-on-surface-variant">{t("receiptHint")}</p>
      <dl className="grid gap-2 text-sm">
        <div className="flex justify-between">
          <dt>{t("invoiceNumber")}</dt>
          <dd>{o.invoiceNumber}</dd>
        </div>
        <div className="flex justify-between">
          <dt>{t("payer")}</dt>
          <dd>{payer}</dd>
        </div>
        <div className="flex justify-between">
          <dt>{t("issuedAt")}</dt>
          <dd>{formatBillingDateTime(issuedAt, locale)}</dd>
        </div>
        <div className="flex justify-between">
          <dt>{t("amount")}</dt>
          <dd>
            {(o.amountCents / 100).toFixed(2)} {o.currency}
          </dd>
        </div>
        {o.appointment ? (
          <div className="flex justify-between">
            <dt>{t("visit")}</dt>
            <dd>{o.appointment.id}</dd>
          </div>
        ) : null}
        <div className="flex justify-between">
          <dt>{t("status")}</dt>
          <dd>{o.status.replaceAll("_", " ")}</dd>
        </div>
      </dl>
      {o.refunds.map((r) => (
        <p key={r.id} className="text-sm">
          {t("creditNote")}: {r.creditNoteNumber} — {(r.amountCents / 100).toFixed(2)} {r.currency}
        </p>
      ))}
      <Link href={`/patient/payments/${id}`} className="text-sm text-med-green hover:underline print:hidden">
        {t("backToPayment")}
      </Link>
    </article>
  );
}
