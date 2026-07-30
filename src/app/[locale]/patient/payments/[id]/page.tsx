import { setRequestLocale, getTranslations } from "next-intl/server";
import { notFound } from "next/navigation";
import { getPayment } from "@/actions/patient/payments";
import { PaymentDetail } from "@/components/patient/payments/payments-list";
import { ErrorState } from "@/components/patient/shared/error-state";

export default async function PaymentDetailPage({
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

  return <PaymentDetail obligation={result.data} />;
}
