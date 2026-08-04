import { setRequestLocale, getTranslations } from "next-intl/server";
import { Link } from "@/i18n/routing";
import { DraftPanel } from "@/components/ai/doctor/draft-panel";

export default async function DoctorAiDocumentationPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ patient?: string; appointment?: string }>;
}) {
  const { locale } = await params;
  const { patient, appointment } = await searchParams;
  setRequestLocale(locale);
  const t = await getTranslations("doctor.ai");

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <h1 className="font-headline text-2xl text-primary md:text-3xl">{t("modeDocumentation")}</h1>
        <p className="mt-2 rounded-2xl bg-amber-50 px-4 py-3 text-sm text-amber-900">{t("disclaimer")}</p>
      </div>
      <div className="glass-card rounded-2xl border border-outline-variant/20 bg-surface-container-low p-5">
        {patient && appointment ? (
          <DraftPanel patientUserId={patient} appointmentId={appointment} />
        ) : (
          <div className="space-y-3 text-sm text-on-surface-variant">
            <p>{t("needPatientAndAppointment")}</p>
            <p>{t("documentationHint")}</p>
            <Link
              href="/doctor/patients"
              className="inline-block font-medium text-primary underline-offset-2 hover:underline"
            >
              {t("openPatients")}
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
