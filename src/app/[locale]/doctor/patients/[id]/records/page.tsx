import { setRequestLocale, getTranslations } from "next-intl/server";
import { Link } from "@/i18n/routing";
import { emrListDocuments } from "@/actions/emr/documents";
import { emrListLabResults } from "@/actions/emr/diagnostics";
import {
  emrListAllergies,
  emrListConditions,
  emrGetLifestyle,
  emrListImmunizations,
  emrListFamilyHistory,
  emrGetEmergencyInfo,
} from "@/actions/emr/history";
import { DocumentList } from "@/components/emr/documents/document-list";
import { LabResultsList } from "@/components/emr/labs/lab-results-list";
import { MedicalTimeline } from "@/components/emr/timeline/medical-timeline";
import { HistorySections } from "@/components/emr/history/history-sections";
import { ErrorState } from "@/components/doctor/shared";

export default async function DoctorPatientRecordsPage({
  params,
}: {
  params: Promise<{ locale: string; id: string }>;
}) {
  const { locale, id } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("doctor.chart");
  const temr = await getTranslations("emr");

  const [
    docsResult,
    labsResult,
    allergiesResult,
    conditionsResult,
    lifestyleResult,
    immunizationsResult,
    familyResult,
    emergencyResult,
  ] = await Promise.all([
    emrListDocuments({ patientUserId: id }),
    emrListLabResults({ patientUserId: id }),
    emrListAllergies({ patientUserId: id }),
    emrListConditions({ patientUserId: id }),
    emrGetLifestyle({ patientUserId: id }),
    emrListImmunizations({ patientUserId: id }),
    emrListFamilyHistory({ patientUserId: id }),
    emrGetEmergencyInfo({ patientUserId: id }),
  ]);

  if (!docsResult.ok && !labsResult.ok && !allergiesResult.ok) {
    return <ErrorState title={t("recordsTitle")} message={t("accessDenied")} />;
  }

  const allergies = allergiesResult.ok
    ? allergiesResult.data.items.map((a) => ({
        id: a.id,
        substance: a.substance,
        reaction: a.reaction,
        severity: a.severity,
        source: a.source,
        criticalFlag: a.criticalFlag,
      }))
    : [];
  const conditions = conditionsResult.ok
    ? conditionsResult.data.items.map((c) => ({
        id: c.id,
        display: c.display,
        icd10Code: c.icd10Code,
        status: c.status,
        source: c.source,
      }))
    : [];
  const lifestyle =
    lifestyleResult.ok && lifestyleResult.data
      ? {
          smoking: lifestyleResult.data.smoking,
          alcohol: lifestyleResult.data.alcohol,
          activity: lifestyleResult.data.activity,
          notes: lifestyleResult.data.notes,
        }
      : null;
  const immunizations = immunizationsResult.ok
    ? immunizationsResult.data.items.map((im) => ({
        id: im.id,
        vaccineName: im.vaccineName,
        administeredOn: im.administeredOn,
        source: im.source,
      }))
    : [];
  const familyHistory = familyResult.ok
    ? familyResult.data.items.map((f) => ({
        id: f.id,
        relation: f.relation,
        conditionDisplay: f.conditionDisplay,
        notes: f.notes,
      }))
    : [];
  const emergency =
    emergencyResult.ok && emergencyResult.data
      ? {
          contactName: emergencyResult.data.contactName,
          contactPhone: emergencyResult.data.contactPhone,
          criticalAlertsText: emergencyResult.data.criticalAlertsText,
        }
      : null;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="font-headline text-2xl text-primary md:text-3xl">{t("recordsTitle")}</h1>
        <Link
          href={`/doctor/patients/${id}`}
          className="rounded-full border border-outline-variant/40 px-4 py-2 text-sm font-medium text-primary hover:bg-surface-container-high"
        >
          {t("backToChart")}
        </Link>
      </div>

      <MedicalTimeline patientUserId={id} locale={locale} />

      <HistorySections
        allergies={allergies}
        conditions={conditions}
        lifestyle={lifestyle}
        immunizations={immunizations}
        familyHistory={familyHistory}
        emergency={emergency}
        labels={{
          title: temr("history.title"),
          allergies: temr("history.allergies"),
          conditions: temr("history.conditions"),
          lifestyle: temr("history.lifestyle"),
          immunizations: temr("history.immunizations"),
          family: temr("history.family"),
          emergency: temr("history.emergency"),
          emergencyContactName: temr("history.emergencyContactName"),
          emergencyContactPhone: temr("history.emergencyContactPhone"),
          emergencyCriticalAlerts: temr("history.emergencyCriticalAlerts"),
          empty: temr("history.empty"),
          sourcePatient: temr("history.sourcePatient"),
          sourceClinician: temr("history.sourceClinician"),
        }}
      />

      {docsResult.ok ? (
        <DocumentList
          items={docsResult.data.items.map((d) => ({
            id: d.id,
            title: d.title,
            kind: d.kind,
            createdAt: d.createdAt,
            classification: d.classification,
          }))}
          title={temr("documents.title")}
          emptyLabel={temr("empty")}
          locale={locale}
        />
      ) : null}

      {labsResult.ok ? (
        <LabResultsList
          items={labsResult.data.items.map((lab) => ({
            id: lab.id,
            title: lab.title,
            releaseStatus: lab.releaseStatus,
            phase: lab.phase,
            criticalFlag: lab.criticalFlag,
            resultedAt: lab.resultedAt,
            summary: lab.summary,
          }))}
          title={temr("labs.title")}
          emptyLabel={temr("empty")}
          locale={locale}
        />
      ) : null}
    </div>
  );
}
