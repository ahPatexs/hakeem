import { setRequestLocale, getTranslations } from "next-intl/server";
import { Link } from "@/i18n/routing";
import { AiPanel } from "@/components/doctor/workspace/ai-panel";
import { WriteForPatient } from "@/components/doctor/prescriptions/write-for-patient";
import { PickVisit } from "@/components/doctor/ai/pick-visit";
import { searchPatients, getChart } from "@/actions/doctor/patients";
import { PersonAvatar } from "@/components/portal/person-avatar";
import { portalCardClass } from "@/components/portal/chrome";
import { cn } from "@/lib/utils";

const MODES = new Set(["MEDICAL", "DOCUMENTATION", "PRESCRIPTION"]);

export default async function DoctorAiPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ mode?: string; patient?: string; appointment?: string; q?: string }>;
}) {
  const { locale } = await params;
  const { mode, patient, appointment, q = "" } = await searchParams;
  setRequestLocale(locale);
  const t = await getTranslations("doctor.ai");
  const defaultMode =
    mode && MODES.has(mode) ? (mode as "MEDICAL" | "DOCUMENTATION" | "PRESCRIPTION") : "MEDICAL";

  const [panel, chartResult] = await Promise.all([
    searchPatients({ query: q, page: 1 }),
    patient ? getChart({ patientUserId: patient }) : Promise.resolve(null),
  ]);

  const people = panel.ok ? (q ? panel.data.items : panel.data.items.slice(0, 6)) : [];
  const chart = chartResult && chartResult.ok ? chartResult.data : null;
  const patientName = chart?.user.name ?? chart?.user.email ?? "";
  const patientId = chart ? patient : undefined;

  const picker = (
    <WriteForPatient
      people={people}
      query={q}
      hiddenFields={defaultMode === "MEDICAL" ? undefined : { mode: defaultMode }}
      title={t("pickPatient")}
      hint={t("pickPatientHint")}
      searchPlaceholder={t("searchPlaceholder")}
      searchLabel={t("searchPatients")}
      writeLabel={t("askAction")}
      emptyTitle={t("noPanelTitle")}
      emptyHint={t("noPanelHint")}
      patientsHref="/doctor/patients"
      patientsLabel={t("seePatients")}
      hrefFor={(id) => `/doctor/ai?mode=${defaultMode}&patient=${id}`}
    />
  );

  const visitPicker = patientId ? (
    <PickVisit
      visits={(chart?.pastVisits ?? []).map((visit) => ({
        id: visit.id,
        startAt: visit.startAt,
        status: visit.status,
        reason: visit.reason,
        mode: visit.mode,
      }))}
      patientId={patientId}
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
  ) : (
    picker
  );

  return (
    <div className="space-y-6">
      <section className="welcome-banner space-y-3 p-5 sm:p-7">
        <p className="text-sm font-medium text-white/80">{t("subtitle")}</p>
        <h1 className="font-headline text-2xl text-white md:text-3xl">{t("title")}</h1>
        <p className="text-sm text-white/85">{t("disclaimer")}</p>
      </section>

      {chart ? (
        <div className={cn(portalCardClass, "flex items-center justify-between gap-3 p-4")}>
          <div className="flex min-w-0 items-center gap-3">
            <PersonAvatar name={patientName} photoUrl={chart.user.image} />
            <p className="truncate font-semibold text-primary">{t("askingAbout", { name: patientName })}</p>
          </div>
          <Link href="/doctor/ai" className="shrink-0 text-sm font-semibold text-med-green hover:underline">
            {t("changePatient")}
          </Link>
        </div>
      ) : null}

      <div className={cn(portalCardClass, "min-h-[28rem] p-5")}>
        <AiPanel
          defaultMode={defaultMode}
          patientUserId={patientId}
          appointmentId={patientId ? appointment : undefined}
          hideTitle
          missingPatientSlot={picker}
          missingVisitSlot={visitPicker}
        />
      </div>
    </div>
  );
}
