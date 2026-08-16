import { setRequestLocale, getTranslations } from "next-intl/server";
import { Link } from "@/i18n/routing";
import { DraftPanel } from "@/components/ai/doctor/draft-panel";
import { WriteForPatient } from "@/components/doctor/prescriptions/write-for-patient";
import { PickVisit } from "@/components/doctor/ai/pick-visit";
import { searchPatients, getChart } from "@/actions/doctor/patients";

export default async function DoctorAiDocumentationPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ patient?: string; appointment?: string; q?: string }>;
}) {
  const { locale } = await params;
  const { patient, appointment, q = "" } = await searchParams;
  setRequestLocale(locale);
  const t = await getTranslations("doctor.ai");
  const tc = await getTranslations("doctor.common");

  if (!patient) {
    const panel = await searchPatients({ query: q, page: 1 });
    const people = panel.ok ? panel.data.items : [];
    return (
      <div className="space-y-6">
        <div>
          <Link href="/doctor/ai" className="text-sm font-medium text-med-green hover:underline">
            ← {tc("back")}
          </Link>
          <h1 className="mt-2 font-headline text-2xl text-primary md:text-3xl">{t("modeDocumentation")}</h1>
          <p className="mt-1 text-sm text-on-surface-variant">{t("documentationHint")}</p>
        </div>
        <WriteForPatient
          people={people}
          query={q}
          title={t("pickPatient")}
          hint={t("pickPatientHint")}
          searchPlaceholder={t("searchPlaceholder")}
          searchLabel={t("searchPatients")}
          writeLabel={t("askAction")}
          emptyTitle={t("noPanelTitle")}
          emptyHint={t("noPanelHint")}
          patientsHref="/doctor/patients"
          patientsLabel={t("seePatients")}
          hrefFor={(id) => `/doctor/ai/documentation?patient=${id}`}
        />
      </div>
    );
  }

  if (!appointment) {
    const chartResult = await getChart({ patientUserId: patient });
    const visits = chartResult.ok ? chartResult.data.pastVisits : [];
    return (
      <div className="space-y-6">
        <div>
          <Link href="/doctor/ai" className="text-sm font-medium text-med-green hover:underline">
            ← {tc("back")}
          </Link>
          <h1 className="mt-2 font-headline text-2xl text-primary md:text-3xl">{t("modeDocumentation")}</h1>
        </div>
        <PickVisit
          visits={visits.map((visit) => ({
            id: visit.id,
            startAt: visit.startAt,
            status: visit.status,
            reason: visit.reason,
            mode: visit.mode,
          }))}
          patientId={patient}
          aiMode="DOCUMENTATION"
          title={t("pickVisit")}
          hint={t("pickVisitHint")}
          emptyTitle={t("noVisits")}
          scheduleHref="/doctor/schedule"
          scheduleLabel={t("openSchedule")}
          liveLabel={t("visitLive")}
          upcomingLabel={t("visitUpcoming")}
          doneLabel={t("visitDone")}
          locale={locale}
        />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <Link href="/doctor/ai" className="text-sm font-medium text-med-green hover:underline">
          ← {tc("back")}
        </Link>
        <h1 className="mt-2 font-headline text-2xl text-primary md:text-3xl">{t("modeDocumentation")}</h1>
        <p className="mt-2 rounded-2xl bg-amber-50 px-4 py-3 text-sm text-amber-900">{t("disclaimer")}</p>
      </div>
      <div className="rounded-3xl border border-outline-variant/20 bg-surface-container-lowest p-5 shadow-sm">
        <DraftPanel patientUserId={patient} appointmentId={appointment} />
      </div>
    </div>
  );
}
