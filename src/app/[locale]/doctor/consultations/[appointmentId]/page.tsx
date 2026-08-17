import { setRequestLocale, getTranslations } from "next-intl/server";
import { Link } from "@/i18n/routing";
import { getWorkspace } from "@/actions/doctor/workspace";
import { emrListAllergies, emrListConditions } from "@/actions/emr/history";
import { emrListLabResults } from "@/actions/emr/diagnostics";
import { emrGetSummary } from "@/actions/emr/summary";
import { ErrorState, StatusBadge, AllergyBanner } from "@/components/doctor/shared";
import { WorkspaceTabs } from "@/components/doctor/workspace/workspace-tabs";
import { CompleteVisitButton } from "@/components/doctor/workspace/complete-visit-button";
import { ConsultationStage } from "@/components/doctor/workspace/consultation-stage";
import { VersionHistoryList } from "@/components/emr";
import { formatPortalDateTime } from "@/lib/datetime";
import { portalCardClass } from "@/components/portal/chrome";
import { cn } from "@/lib/utils";

export default async function ConsultationWorkspacePage({
  params,
}: {
  params: Promise<{ locale: string; appointmentId: string }>;
}) {
  const { locale, appointmentId } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("doctor.workspace");
  const ts = await getTranslations("doctor.status");
  const tc = await getTranslations("doctor.chart");
  const temr = await getTranslations("emr");

  const result = await getWorkspace({ appointmentId });
  if (!result.ok) {
    return <ErrorState title={t("title")} message={t("loadError")} />;
  }

  const bundle = result.data;
  const appt = bundle.appointment;
  const patient = appt.patient;
  const patientUserId = appt.patientUserId;

  const [allergiesResult, conditionsResult, labsResult, summaryResult] = await Promise.all([
    emrListAllergies({ patientUserId }),
    emrListConditions({ patientUserId }),
    emrListLabResults({ patientUserId }),
    emrGetSummary({ patientUserId }),
  ]);

  // EMR SoT for clinical context panels (T144)
  const allergies = allergiesResult.ok
    ? allergiesResult.data.items.map((a) => a.substance)
    : null;
  const conditions = conditionsResult.ok
    ? conditionsResult.data.items.map((c) => c.display)
    : [];
  const medications = summaryResult.ok
    ? summaryResult.data.activeMeds.map((m) => m.medicationName)
    : [];
  const recentLabs = labsResult.ok ? labsResult.data.items.slice(0, 5) : [];

  const readOnly = appt.status === "COMPLETED" || appt.status === "CANCELLED" || appt.status === "NO_SHOW";
  const canComplete = appt.status === "IN_PROGRESS";
  const isVideo = appt.mode === "VIDEO";
  const patientName = patient.name ?? patient.email;
  const fmt = (d: Date | string) => formatPortalDateTime(d, locale);

  const soap = bundle.latestSoap
    ? {
        noteId: bundle.latestSoap.id,
        version: bundle.latestSoap.version,
        status: bundle.latestSoap.status as "DRAFT" | "FINAL",
        subjective: bundle.latestSoap.subjective,
        objective: bundle.latestSoap.objective,
        assessment: bundle.latestSoap.assessment,
        plan: bundle.latestSoap.plan,
        aiAssisted: bundle.latestSoap.aiAssisted,
      }
    : {};

  const summary = bundle.latestSummary
    ? {
        summaryId: bundle.latestSummary.id,
        version: bundle.latestSummary.version,
        status: bundle.latestSummary.status as "DRAFT" | "FINAL",
        body: bundle.latestSummary.body,
      }
    : {};

  const prescriptions = bundle.prescriptions.map((rx) => ({
    id: rx.id,
    medicationName: rx.medicationName,
    status: rx.status,
    prescribedAt: rx.prescribedAt.toISOString(),
  }));

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-on-surface-variant">{t("title")}</p>
          <h1 className="font-headline text-2xl text-primary md:text-3xl">{patientName}</h1>
          <div className="mt-2 flex flex-wrap items-center gap-2 text-sm text-on-surface-variant">
            <StatusBadge status={appt.status} label={ts(appt.status as never)} variant="appointment" />
            <span>{fmt(appt.startAt)}</span>
            <span>·</span>
            <span>{isVideo ? t("modeVideo") : t("modeInPerson")}</span>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Link
            href={`/doctor/patients/${patientUserId}`}
            className="rounded-full border border-outline-variant/40 px-4 py-2 text-sm font-medium text-primary hover:bg-surface-container-high"
          >
            {t("viewChart")}
          </Link>
          {canComplete ? <CompleteVisitButton appointmentId={appointmentId} /> : null}
        </div>
      </div>

      <AllergyBanner
        allergies={allergies}
        unavailableLabel={tc("allergiesUnavailable")}
        listLabel={tc("allergies")}
        noneLabel={tc("noAllergies")}
      />

      <div className={cn("grid gap-5", isVideo ? "xl:grid-cols-[minmax(0,1.35fr)_minmax(22rem,0.9fr)]" : "")}>
        {isVideo ? (
          <ConsultationStage
            appointmentId={appointmentId}
            patientName={patientName}
            doctorName={t("you")}
          />
        ) : null}

        <div className="space-y-4">
          <section className={cn(portalCardClass, "p-5")}>
            <h2 className="font-headline text-lg text-primary">{t("context")}</h2>
            <p className="mt-1 text-xs text-on-surface-variant">{t("contextHint")}</p>
            <dl className="mt-3 space-y-3 text-sm">
              <div>
                <dt className="text-xs uppercase text-on-surface-variant">{t("reason")}</dt>
                <dd className="text-primary">{appt.reason ?? "—"}</dd>
              </div>
              <div>
                <dt className="text-xs uppercase text-on-surface-variant">{tc("conditions")}</dt>
                <dd className="text-primary">{conditions.join(", ") || "—"}</dd>
              </div>
              <div>
                <dt className="text-xs uppercase text-on-surface-variant">{tc("medications")}</dt>
                <dd className="text-primary">{medications.join(", ") || "—"}</dd>
              </div>
              {bundle.symptomSummary ? (
                <div data-ai="previsit-symptom">
                  <dt className="text-xs uppercase text-on-surface-variant">{t("symptomCheck")}</dt>
                  <dd className="text-primary">
                    {bundle.symptomSummary.outcome
                      ? t(`symptomOutcome.${bundle.symptomSummary.outcome}` as never)
                      : "—"}
                    {bundle.symptomSummary.redFlagged ? (
                      <span className="ms-2 text-xs font-semibold text-error">{t("symptomRedFlag")}</span>
                    ) : null}
                  </dd>
                  {bundle.symptomSummary.rationale ? (
                    <dd className="mt-1 text-xs text-on-surface-variant line-clamp-3">
                      {bundle.symptomSummary.rationale}
                    </dd>
                  ) : null}
                </div>
              ) : null}
            </dl>
          </section>

          <section className={cn(portalCardClass, "p-5")}>
            <h2 className="font-headline text-lg text-primary">{t("recentLabs")}</h2>
            <ul className="mt-3 space-y-2 text-sm">
              {recentLabs.length === 0 ? (
                <li className="text-on-surface-variant">—</li>
              ) : (
                recentLabs.map((lab) => (
                  <li key={lab.id} className="flex justify-between gap-2">
                    <span className="truncate text-primary">{lab.title}</span>
                    {lab.criticalFlag ? (
                      <span className="text-xs font-semibold text-red-600">{t("critical")}</span>
                    ) : null}
                  </li>
                ))
              )}
            </ul>
            <Link
              href={`/doctor/patients/${patientUserId}/labs`}
              className="mt-3 inline-block text-sm font-medium text-med-green hover:underline"
            >
              {t("viewAllLabs")}
            </Link>
          </section>

          <WorkspaceTabs
            appointmentId={appointmentId}
            patientUserId={patientUserId}
            soap={soap}
            summary={summary}
            prescriptions={prescriptions}
            readOnly={readOnly}
          />
          <VersionHistoryList
            title={temr("versionHistory.title")}
            emptyLabel={temr("empty")}
            locale={locale}
            items={bundle.soapVersions.map((n) => ({
              id: n.id,
              version: n.version,
              status: n.status,
              labeledAt: n.signedAt ?? n.createdAt,
              reason: n.amendmentReason,
            }))}
          />
        </div>
      </div>
    </div>
  );
}
