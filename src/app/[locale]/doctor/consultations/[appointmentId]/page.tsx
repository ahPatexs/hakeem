import { setRequestLocale, getTranslations } from "next-intl/server";
import { Link } from "@/i18n/routing";
import { getWorkspace } from "@/actions/doctor/workspace";
import { ErrorState, StatusBadge, AllergyBanner } from "@/components/doctor/shared";
import { WorkspaceTabs } from "@/components/doctor/workspace/workspace-tabs";
import { CompleteVisitButton } from "@/components/doctor/workspace/complete-visit-button";
import { VideoJoinButton } from "@/components/doctor/workspace/video-join-button";

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

  const result = await getWorkspace({ appointmentId });
  if (!result.ok) {
    return <ErrorState title={t("title")} message={t("loadError")} />;
  }

  const bundle = result.data;
  const appt = bundle.appointment;
  const patient = appt.patient;
  const allergies = bundle.medicalProfile?.allergies ?? null;
  const readOnly = appt.status === "COMPLETED" || appt.status === "CANCELLED" || appt.status === "NO_SHOW";
  const canComplete = appt.status === "IN_PROGRESS";
  const isVideo = appt.mode === "VIDEO";
  const isAr = locale === "ar";
  const fmt = (d: Date | string) =>
    new Date(d).toLocaleString(isAr ? "ar-SA" : "en-US", { dateStyle: "medium", timeStyle: "short" });

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
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-on-surface-variant">{t("title")}</p>
          <h1 className="font-headline text-2xl text-primary md:text-3xl">
            {patient.name ?? patient.email}
          </h1>
          <div className="mt-2 flex flex-wrap items-center gap-2 text-sm text-on-surface-variant">
            <StatusBadge status={appt.status} label={ts(appt.status as never)} variant="appointment" />
            <span>{fmt(appt.startAt)}</span>
            <span>·</span>
            <span>{appt.mode === "VIDEO" ? t("modeVideo") : t("modeInPerson")}</span>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Link
            href={`/doctor/patients/${appt.patientUserId}`}
            className="rounded-full border border-outline-variant/40 px-4 py-2 text-sm font-medium text-primary hover:bg-surface-container-high"
          >
            {t("viewChart")}
          </Link>
          {isVideo ? <VideoJoinButton appointmentId={appointmentId} /> : null}
          {canComplete ? <CompleteVisitButton appointmentId={appointmentId} /> : null}
        </div>
      </div>

      <AllergyBanner
        allergies={allergies}
        unavailableLabel={tc("allergiesUnavailable")}
        listLabel={tc("allergies")}
        noneLabel={tc("noAllergies")}
      />

      <div className="grid gap-6 lg:grid-cols-3">
        <aside className="space-y-4 lg:col-span-1">
          <section className="glass-card rounded-2xl border border-outline-variant/20 bg-surface-container-low p-5">
            <h2 className="font-headline text-lg text-primary">{t("context")}</h2>
            <dl className="mt-3 space-y-2 text-sm">
              <div>
                <dt className="text-xs uppercase text-on-surface-variant">{t("reason")}</dt>
                <dd className="text-primary">{appt.reason ?? "—"}</dd>
              </div>
              <div>
                <dt className="text-xs uppercase text-on-surface-variant">{tc("conditions")}</dt>
                <dd className="text-primary">
                  {(bundle.medicalProfile?.conditions ?? []).join(", ") || "—"}
                </dd>
              </div>
              <div>
                <dt className="text-xs uppercase text-on-surface-variant">{tc("medications")}</dt>
                <dd className="text-primary">
                  {(bundle.medicalProfile?.currentMedications ?? []).join(", ") || "—"}
                </dd>
              </div>
            </dl>
          </section>

          <section className="glass-card rounded-2xl border border-outline-variant/20 bg-surface-container-low p-5">
            <h2 className="font-headline text-lg text-primary">{t("recentLabs")}</h2>
            <ul className="mt-3 space-y-2 text-sm">
              {bundle.recentLabs.length === 0 ? (
                <li className="text-on-surface-variant">—</li>
              ) : (
                bundle.recentLabs.map((lab) => (
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
              href={`/doctor/patients/${appt.patientUserId}/labs`}
              className="mt-3 inline-block text-sm font-medium text-med-green hover:underline"
            >
              {t("viewAllLabs")}
            </Link>
          </section>
        </aside>

        <div className="lg:col-span-2">
          <WorkspaceTabs
            appointmentId={appointmentId}
            patientUserId={appt.patientUserId}
            soap={soap}
            summary={summary}
            prescriptions={prescriptions}
            readOnly={readOnly}
          />
        </div>
      </div>
    </div>
  );
}
