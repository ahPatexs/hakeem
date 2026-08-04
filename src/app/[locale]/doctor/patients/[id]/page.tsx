import { setRequestLocale, getTranslations } from "next-intl/server";
import { Link } from "@/i18n/routing";
import { getChart } from "@/actions/doctor/patients";
import { emrGetSummary } from "@/actions/emr/summary";
import { emrListPlans } from "@/actions/emr/plans";
import { emrListDiagnoses } from "@/actions/emr/diagnoses";
import { emrListDoctorNotes } from "@/actions/emr/notes";
import { emrListAllergies, emrListConditions, emrGetLifestyle, emrGetEmergencyInfo, emrListImmunizations, emrListFamilyHistory } from "@/actions/emr/history";
import { emrListDocuments } from "@/actions/emr/documents";
import { emrListLabResults } from "@/actions/emr/diagnostics";
import { emrListPrescriptions } from "@/actions/emr/prescriptions";
import { ErrorState, StatusBadge, AllergyBanner } from "@/components/doctor/shared";
import {
  PatientSummary,
  CarePlanList,
  CarePlanForm,
  MedicalTimeline,
  DiagnosisList,
  DiagnosisForm,
  DoctorNoteList,
  DoctorNoteForm,
  VersionHistoryList,
  LabResultsList,
  PrescriptionList,
} from "@/components/emr";
import { HistoryEditor } from "@/components/emr/history/history-editor";
import { ImagingList } from "@/components/emr/imaging/imaging-list";
import { DocumentUploadForm } from "@/components/emr/documents/document-upload-form";
import { DocumentActionsList } from "@/components/emr/documents/document-actions-list";
import { CdsInsights } from "@/components/ai/doctor/cds-insights";

export default async function DoctorPatientChartPage({
  params,
}: {
  params: Promise<{ locale: string; id: string }>;
}) {
  const { locale, id } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("doctor.chart");
  const ts = await getTranslations("doctor.status");
  const temr = await getTranslations("emr");

  const [
    result,
    summaryResult,
    plansResult,
    diagnosesResult,
    notesResult,
    allergiesResult,
    conditionsResult,
    lifestyleResult,
    emergencyResult,
    immunizationsResult,
    familyResult,
    imagingDocs,
    documentsResult,
    labsResult,
    prescriptionsResult,
  ] = await Promise.all([
    getChart({ patientUserId: id }),
    emrGetSummary({ patientUserId: id }),
    emrListPlans({ patientUserId: id }),
    emrListDiagnoses({ patientUserId: id }),
    emrListDoctorNotes({ patientUserId: id }),
    emrListAllergies({ patientUserId: id }),
    emrListConditions({ patientUserId: id }),
    emrGetLifestyle({ patientUserId: id }),
    emrGetEmergencyInfo({ patientUserId: id }),
    emrListImmunizations({ patientUserId: id }),
    emrListFamilyHistory({ patientUserId: id }),
    emrListDocuments({ patientUserId: id, type: "IMAGING_REPORT" }),
    emrListDocuments({ patientUserId: id, includeDeleted: true }),
    emrListLabResults({ patientUserId: id }),
    emrListPrescriptions({ patientUserId: id, bucket: "all" }),
  ]);
  if (!result.ok) {
    return <ErrorState title={t("title")} message={t("accessDenied")} />;
  }

  const chart = result.data;
  const isAr = locale === "ar";
  const fmtDate = (d: Date | string) =>
    new Date(d).toLocaleDateString(isAr ? "ar-SA" : "en-US", { dateStyle: "medium" });
  const fmtDateTime = (d: Date | string) =>
    new Date(d).toLocaleString(isAr ? "ar-SA" : "en-US", { dateStyle: "medium", timeStyle: "short" });

  // EMR typed allergies are SoT for the banner (T144) — not MedicalProfile string arrays
  const allergies = allergiesResult.ok
    ? allergiesResult.data.items.map((a) => a.substance)
    : null;
  const conditionLabels = conditionsResult.ok
    ? conditionsResult.data.items.map((c) => c.display)
    : [];
  const medicationLabels = summaryResult.ok
    ? summaryResult.data.activeMeds.map((m) => m.medicationName)
    : chart.medicalProfile?.currentMedications ?? [];

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-headline text-2xl text-primary md:text-3xl">
            {chart.user.name ?? chart.user.email}
          </h1>
          <p className="mt-1 text-on-surface-variant">{t("title")}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link
            href={`/doctor/patients/${chart.user.id}/records`}
            className="rounded-full border border-outline-variant/40 px-5 py-2 text-sm font-medium text-primary hover:bg-surface-container-high"
          >
            {t("viewRecords")}
          </Link>
          <Link
            href={`/doctor/prescriptions/new?patient=${chart.user.id}`}
            className="rounded-full bg-primary px-5 py-2 text-sm font-medium text-on-primary hover:opacity-90"
          >
            {t("newRx")}
          </Link>
        </div>
      </div>

      <AllergyBanner
        allergies={allergies}
        unavailableLabel={t("allergiesUnavailable")}
        listLabel={t("allergies")}
        noneLabel={t("noAllergies")}
      />

      <CdsInsights patientUserId={chart.user.id} />

      {summaryResult.ok ? (
        <PatientSummary
          summary={summaryResult.data}
          labels={{
            title: temr("summary.title"),
            allergies: temr("summary.allergies"),
            medications: temr("summary.medications"),
            empty: temr("summary.empty"),
            criticalAlertsTitle: temr("criticalAlerts.title"),
            criticalAlertsEmpty: temr("criticalAlerts.empty"),
          }}
        />
      ) : null}

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Overview */}
        <section className="glass-card space-y-4 rounded-2xl border border-outline-variant/20 bg-surface-container-low p-5">
          <h2 className="font-headline text-lg text-primary">{t("overview")}</h2>
          <dl className="space-y-3 text-sm">
            <div>
              <dt className="text-xs font-medium uppercase text-on-surface-variant">{t("phone")}</dt>
              <dd className="mt-0.5 text-primary">{chart.profile?.phone ?? "—"}</dd>
            </div>
            <div>
              <dt className="text-xs font-medium uppercase text-on-surface-variant">{t("dateOfBirth")}</dt>
              <dd className="mt-0.5 text-primary">
                {chart.profile?.dateOfBirth ? fmtDate(chart.profile.dateOfBirth) : "—"}
              </dd>
            </div>
            <div>
              <dt className="text-xs font-medium uppercase text-on-surface-variant">{t("bloodType")}</dt>
              <dd className="mt-0.5 text-primary">{chart.medicalProfile?.bloodType ?? "—"}</dd>
            </div>
            <div>
              <dt className="text-xs font-medium uppercase text-on-surface-variant">{t("conditions")}</dt>
              <dd className="mt-0.5 text-primary">
                {conditionLabels.length ? conditionLabels.join(", ") : "—"}
              </dd>
            </div>
            <div>
              <dt className="text-xs font-medium uppercase text-on-surface-variant">{t("medications")}</dt>
              <dd className="mt-0.5 text-primary">
                {medicationLabels.length ? medicationLabels.join(", ") : "—"}
              </dd>
            </div>
          </dl>
        </section>

        {/* Timeline */}
        <div className="lg:col-span-2">
          <MedicalTimeline patientUserId={chart.user.id} locale={locale} />
        </div>

        {/* Care plans */}
        <CarePlanList
          items={
            plansResult.ok
              ? plansResult.data.items.map((p) => ({
                  id: p.id,
                  title: p.title,
                  kind: p.kind,
                  status: p.status,
                  version: p.version,
                  updatedAt: p.updatedAt,
                }))
              : []
          }
          title={temr("plans.title")}
          emptyLabel={temr("empty")}
          locale={locale}
        />

        {/* Labs — EMR diagnostics facade (T144) */}
        <div className="lg:col-span-2">
          <LabResultsList
            items={
              labsResult.ok
                ? labsResult.data.items.map((lab) => ({
                    id: lab.id,
                    title: lab.title,
                    releaseStatus: lab.releaseStatus,
                    phase: lab.phase,
                    criticalFlag: lab.criticalFlag,
                    resultedAt: lab.resultedAt,
                    summary: lab.summary,
                  }))
                : []
            }
            title={t("labs")}
            emptyLabel={t("emptyLabs")}
            locale={locale}
            criticalLabel={t("critical")}
          />
        </div>

        {/* Prescriptions — EMR facade (T144) */}
        <PrescriptionList
          items={
            prescriptionsResult.ok
              ? prescriptionsResult.data.items.map((rx) => ({
                  id: rx.id,
                  medicationName: rx.medicationName,
                  instructions: rx.instructions,
                  status: rx.status,
                  prescribedAt: rx.prescribedAt,
                }))
              : []
          }
          title={t("prescriptions")}
          emptyLabel={t("emptyPrescriptions")}
          locale={locale}
        />

        {/* Visit notes */}
        <section className="glass-card rounded-2xl border border-outline-variant/20 bg-surface-container-low p-5 lg:col-span-3">
          <h2 className="font-headline text-lg text-primary">{t("notes")}</h2>
          {chart.soapNotes.length === 0 ? (
            <p className="mt-3 text-sm text-on-surface-variant">{t("emptyNotes")}</p>
          ) : (
            <ul className="mt-3 divide-y divide-outline-variant/15">
              {chart.soapNotes.map((note) => (
                <li key={note.id} className="flex items-center justify-between gap-3 py-3 first:pt-0 last:pb-0">
                  <div className="min-w-0">
                    <Link
                      href={`/doctor/consultations/${note.appointmentId}`}
                      className="font-medium text-primary hover:underline"
                    >
                      {note.assessment ? note.assessment.slice(0, 80) : "SOAP"}
                    </Link>
                    <p className="text-xs text-on-surface-variant">{fmtDateTime(note.createdAt)}</p>
                  </div>
                  <StatusBadge status={note.status} label={ts(note.status as never)} />
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="space-y-4">
          <CarePlanForm patientUserId={id} />
          {plansResult.ok ? (
            <VersionHistoryList
              title={temr("versionHistory.title")}
              emptyLabel={temr("empty")}
              locale={locale}
              items={plansResult.data.items.map((p) => ({
                id: p.id,
                version: p.version,
                status: p.status,
                labeledAt: p.updatedAt,
                reason: p.title,
              }))}
            />
          ) : null}
          {diagnosesResult.ok ? (
            <DiagnosisList
              items={diagnosesResult.data.items.map((d) => ({
                id: d.id,
                display: d.display,
                icd10Code: d.icd10Code,
                status: d.status,
                recordedAt: d.recordedAt,
              }))}
              title={temr("diagnoses.title")}
              emptyLabel={temr("empty")}
              locale={locale}
            />
          ) : null}
          <DiagnosisForm patientUserId={id} />
        </div>
        <div className="space-y-4">
          <DoctorNoteForm patientUserId={id} />
          {notesResult.ok ? (
            <DoctorNoteList
              items={notesResult.data.items.map((n) => ({
                id: n.id,
                status: n.status,
                version: n.version,
                bodyPreview: n.body.slice(0, 160),
                updatedAt: n.updatedAt,
              }))}
              title={temr("notes.title")}
              emptyLabel={temr("empty")}
              locale={locale}
            />
          ) : null}
        </div>
      </div>

      {allergiesResult.ok && conditionsResult.ok ? (
        <HistoryEditor
          patientUserId={id}
          allergies={allergiesResult.data.items.map((a) => ({
            id: a.id,
            substance: a.substance,
            reaction: a.reaction,
            severity: a.severity,
            source: a.source,
            criticalFlag: a.criticalFlag,
          }))}
          conditions={conditionsResult.data.items.map((c) => ({
            id: c.id,
            display: c.display,
            icd10Code: c.icd10Code,
            status: c.status,
            source: c.source,
          }))}
          lifestyle={
            lifestyleResult.ok && lifestyleResult.data
              ? {
                  smoking: lifestyleResult.data.smoking,
                  alcohol: lifestyleResult.data.alcohol,
                  activity: lifestyleResult.data.activity,
                  notes: lifestyleResult.data.notes,
                }
              : null
          }
          emergency={
            emergencyResult.ok && emergencyResult.data
              ? {
                  contactName: emergencyResult.data.contactName,
                  contactPhone: emergencyResult.data.contactPhone,
                  criticalAlertsText: emergencyResult.data.criticalAlertsText,
                }
              : null
          }
          immunizations={
            immunizationsResult.ok
              ? immunizationsResult.data.items.map((im) => ({
                  id: im.id,
                  vaccineName: im.vaccineName,
                  administeredOn: im.administeredOn,
                  source: im.source,
                }))
              : []
          }
          familyHistory={
            familyResult.ok
              ? familyResult.data.items.map((f) => ({
                  id: f.id,
                  relation: f.relation,
                  conditionDisplay: f.conditionDisplay,
                  notes: f.notes,
                }))
              : []
          }
          source="CLINICIAN_ATTESTED"
          allowCriticalFlag
        />
      ) : null}

      <DocumentUploadForm
        patientUserId={id}
        allowedKinds={["REFERRAL", "CERTIFICATE", "RECORD_ATTACHMENT", "OTHER"]}
      />

      {documentsResult.ok ? (
        <DocumentActionsList
          patientUserId={id}
          items={documentsResult.data.items.map((d) => ({
            id: d.id,
            title: d.title,
            kind: d.kind,
            classification: d.classification,
            createdAt: d.createdAt,
            deletedAt: d.deletedAt,
            legalHold: d.legalHold,
          }))}
          title={temr("documents.title")}
          emptyLabel={temr("empty")}
          locale={locale}
          canMutate
        />
      ) : null}

      {imagingDocs.ok ? (
        <ImagingList
          items={imagingDocs.data.items.map((d) => ({
            id: d.id,
            title: d.title,
            releaseStatus: "RELEASED",
            resultedAt: d.createdAt,
            summary: d.classification,
          }))}
          title={temr("imaging.title")}
          emptyLabel={temr("empty")}
          locale={locale}
        />
      ) : null}
    </div>
  );
}
