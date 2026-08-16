import { setRequestLocale, getTranslations } from "next-intl/server";
import { Link } from "@/i18n/routing";
import { RxSuggestPanel } from "@/components/ai/doctor/rx-suggest-panel";
import { PrescriptionForm } from "@/components/doctor/prescriptions/prescription-form";
import { WriteForPatient } from "@/components/doctor/prescriptions/write-for-patient";
import { searchPatients } from "@/actions/doctor/patients";

export default async function NewPrescriptionPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ patient?: string; appointment?: string; q?: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const { patient, appointment, q = "" } = await searchParams;
  const t = await getTranslations("doctor.rx");
  const tc = await getTranslations("doctor.common");

  if (!patient) {
    const panel = await searchPatients({ query: q, page: 1 });
    const people = panel.ok ? panel.data.items : [];
    return (
      <div className="space-y-6">
        <div>
          <Link href="/doctor/prescriptions" className="text-sm font-medium text-med-green hover:underline">
            ← {tc("back")}
          </Link>
          <h1 className="mt-2 font-headline text-2xl text-primary md:text-3xl">{t("createTitle")}</h1>
          <p className="mt-1 text-sm text-on-surface-variant">{t("missingPatient")}</p>
        </div>
        <WriteForPatient
          people={people}
          query={q}
          title={t("writeFor")}
          hint={t("writeForHint")}
          searchPlaceholder={t("searchPlaceholder")}
          searchLabel={t("searchPatients")}
          writeLabel={t("writeAction")}
          emptyTitle={t("noPanelTitle")}
          emptyHint={t("noPanelHint")}
          patientsHref="/doctor/patients"
          patientsLabel={t("seePatients")}
        />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <Link href="/doctor/prescriptions" className="text-sm font-medium text-med-green hover:underline">
          ← {tc("back")}
        </Link>
        <h1 className="mt-2 font-headline text-2xl text-primary md:text-3xl">{t("createTitle")}</h1>
      </div>
      <RxSuggestPanel patientUserId={patient} />
      <PrescriptionForm patientUserId={patient} appointmentId={appointment} />
    </div>
  );
}
