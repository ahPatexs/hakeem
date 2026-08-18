import { setRequestLocale, getTranslations } from "next-intl/server";
import { notFound } from "next/navigation";
import { getPayment } from "@/actions/admin/billing";
import { BillingDetailActions } from "@/components/admin/billing/billing-detail-actions";

export default async function AdminBillingDetailPage({
  params,
}: {
  params: Promise<{ locale: string; obligationId: string }>;
}) {
  const { locale, obligationId } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("admin.billing");
  const result = await getPayment(obligationId);
  if (!result.ok || !result.data) notFound();
  const p = result.data;
  const refundable = p.amountCents - p.refundedAmountCents;
  const pendingRequest = p.requests.find((r) => r.status === "PENDING_REVIEW");
  const stuck =
    p.status === "PROCESSING" &&
    p.processingStartedAt &&
    Date.now() - p.processingStartedAt.getTime() > 15 * 60 * 1000;

  return (
    <div className="mx-auto max-w-xl space-y-6">
      <h1 className="font-headline text-2xl text-primary">{t("detailTitle")}</h1>
      {stuck ? <p className="rounded-2xl bg-warm-coral/10 px-4 py-3 text-sm text-warm-coral">{t("stuckBanner")}</p> : null}
      <dl className="grid gap-2 text-sm">
        <div className="flex justify-between">
          <dt>{t("invoice")}</dt>
          <dd>{p.invoiceNumber ?? "—"}</dd>
        </div>
        <div className="flex justify-between">
          <dt>{t("description")}</dt>
          <dd>{p.description}</dd>
        </div>
        <div className="flex justify-between">
          <dt>{t("amount")}</dt>
          <dd>{(p.amountCents / 100).toFixed(2)} SAR</dd>
        </div>
        <div className="flex justify-between">
          <dt>{t("refunded")}</dt>
          <dd>{(p.refundedAmountCents / 100).toFixed(2)} SAR</dd>
        </div>
        <div className="flex justify-between">
          <dt>{t("refundable")}</dt>
          <dd>{(refundable / 100).toFixed(2)} SAR</dd>
        </div>
        <div className="flex justify-between">
          <dt>{t("status")}</dt>
          <dd>{p.status}</dd>
        </div>
      </dl>
      {p.refunds.length > 0 ? (
        <ul className="space-y-1 text-sm">
          {p.refunds.map((r) => (
            <li key={r.id}>
              {r.creditNoteNumber}: {(r.amountCents / 100).toFixed(2)} SAR
            </li>
          ))}
        </ul>
      ) : null}
      <BillingDetailActions
        obligationId={p.id}
        refundableCents={refundable}
        pendingRequestId={pendingRequest?.id}
      />
    </div>
  );
}
