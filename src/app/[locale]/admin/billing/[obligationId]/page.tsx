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

  return (
    <div className="mx-auto max-w-xl space-y-6">
      <h1 className="font-headline text-2xl text-primary">{t("detailTitle")}</h1>
      <dl className="grid gap-2 text-sm">
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
      <BillingDetailActions obligationId={p.id} refundableCents={refundable} />
    </div>
  );
}
