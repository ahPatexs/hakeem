import { setRequestLocale, getTranslations } from "next-intl/server";
import { notFound } from "next/navigation";
import { Link } from "@/i18n/routing";
import { getAppointment } from "@/actions/patient/appointments";
import { VideoConsultation } from "@/components/patient/appointments/video-consultation";
import { ErrorState } from "@/components/patient/shared/error-state";
import { getMyVisitNotes } from "@/actions/patient/records";
import { VisitNotesCard } from "@/components/patient/records/visit-notes-card";
import { isPaymentSatisfiedForJoin } from "@/domain/billing/eligibility";
import { Button } from "@/components/ui/button";

export default async function ConsultationPage({
  params,
}: {
  params: Promise<{ locale: string; id: string }>;
}) {
  const { locale, id } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("patient.consultations");

  const result = await getAppointment(id);
  if (!result.ok) {
    if (result.code === "FORBIDDEN") notFound();
    return <ErrorState title={t("loadError")} />;
  }

  if (result.data.mode !== "VIDEO") {
    notFound();
  }

  const fee = result.data.paymentObligations?.[0];
  if (
    !isPaymentSatisfiedForJoin({
      amountCents: fee?.amountCents ?? 0,
      status: fee?.status ?? null,
    })
  ) {
    return (
      <div className="glass-card space-y-4 rounded-3xl border border-outline-variant/20 p-6 shadow-sm md:p-8">
        <h1 className="font-headline text-2xl text-primary">{t("title")}</h1>
        <p className="text-sm text-on-surface-variant">{t("unpaid")}</p>
        {fee ? (
          <Button asChild className="rounded-full">
            <Link href={`/patient/payments/${fee.id}`}>{t("payToJoin")}</Link>
          </Button>
        ) : null}
      </div>
    );
  }

  const visitNotes = await getMyVisitNotes(id);

  return (
    <div className="space-y-5">
      <VideoConsultation appointment={result.data} />
      {visitNotes.ok && visitNotes.data ? <VisitNotesCard notes={visitNotes.data} /> : null}
    </div>
  );
}
