import { setRequestLocale, getTranslations } from "next-intl/server";
import { Link } from "@/i18n/routing";
import { PrescriptionForm } from "@/components/doctor/prescriptions/prescription-form";
import { ErrorState } from "@/components/doctor/shared";

export default async function NewPrescriptionPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ patient?: string; appointment?: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const { patient, appointment } = await searchParams;
  const t = await getTranslations("doctor.rx");
  const tc = await getTranslations("doctor.common");

  if (!patient) {
    return (
      <div className="space-y-6">
        <h1 className="font-headline text-2xl text-primary md:text-3xl">{t("createTitle")}</h1>
        <ErrorState title={t("createTitle")} message={t("missingPatient")} />
        <Link href="/doctor/patients" className="text-sm font-medium text-med-green hover:underline">
          {tc("back")} → {t("patient")}
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <Link
          href="/doctor/prescriptions"
          className="text-sm font-medium text-med-green hover:underline"
        >
          ← {tc("back")}
        </Link>
        <h1 className="mt-2 font-headline text-2xl text-primary md:text-3xl">{t("createTitle")}</h1>
      </div>
      <PrescriptionForm patientUserId={patient} appointmentId={appointment} />
    </div>
  );
}
