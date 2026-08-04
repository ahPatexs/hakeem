import { setRequestLocale, getTranslations } from "next-intl/server";
import { auth } from "@/auth";
import { getMedicalProfile } from "@/actions/patient/medical-profile";
import {
  emrListAllergies,
  emrListConditions,
  emrGetLifestyle,
  emrListImmunizations,
  emrListFamilyHistory,
  emrGetEmergencyInfo,
} from "@/actions/emr/history";
import { emrListConsentState } from "@/actions/emr/consents";
import { MedicalProfileForm } from "@/components/patient/profile/medical-profile-form";
import { HistorySections } from "@/components/emr/history/history-sections";
import { HistoryEditor } from "@/components/emr/history/history-editor";
import { ConsentPanel } from "@/components/emr/documents/consent-panel";
import { ErrorState } from "@/components/patient/shared/error-state";

export default async function MedicalProfilePage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("patient.medicalProfile");
  const temr = await getTranslations("emr");
  const session = await auth();
  const patientUserId = session?.user?.id;

  const result = await getMedicalProfile();
  if (!result.ok || !patientUserId) {
    return <ErrorState title={t("loadError")} />;
  }

  const [
    allergiesResult,
    conditionsResult,
    lifestyleResult,
    immunizationsResult,
    familyResult,
    emergencyResult,
    consentResult,
  ] = await Promise.all([
    emrListAllergies({ patientUserId }),
    emrListConditions({ patientUserId }),
    emrGetLifestyle({ patientUserId }),
    emrListImmunizations({ patientUserId }),
    emrListFamilyHistory({ patientUserId }),
    emrGetEmergencyInfo({ patientUserId }),
    emrListConsentState({ patientUserId }),
  ]);

  const allergies =
    allergiesResult.ok
      ? allergiesResult.data.items.map((a) => ({
          id: a.id,
          substance: a.substance,
          reaction: a.reaction,
          severity: a.severity,
          source: a.source,
          criticalFlag: a.criticalFlag,
        }))
      : [];

  const conditions =
    conditionsResult.ok
      ? conditionsResult.data.items.map((c) => ({
          id: c.id,
          display: c.display,
          icd10Code: c.icd10Code,
          status: c.status,
          source: c.source,
        }))
      : [];

  const lifestyle = lifestyleResult.ok
    ? lifestyleResult.data
      ? {
          smoking: lifestyleResult.data.smoking,
          alcohol: lifestyleResult.data.alcohol,
          activity: lifestyleResult.data.activity,
          notes: lifestyleResult.data.notes,
        }
      : null
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

  const emergency = emergencyResult.ok
    ? emergencyResult.data
      ? {
          contactName: emergencyResult.data.contactName,
          contactPhone: emergencyResult.data.contactPhone,
          criticalAlertsText: emergencyResult.data.criticalAlertsText,
        }
      : null
    : null;

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <h1 className="font-headline text-2xl text-primary">{t("pageTitle")}</h1>

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

      <HistoryEditor
        patientUserId={patientUserId}
        allergies={allergies}
        conditions={conditions}
        lifestyle={lifestyle}
        emergency={emergency}
        immunizations={immunizations}
        familyHistory={familyHistory}
        source="PATIENT_REPORTED"
      />

      <MedicalProfileForm profile={result.data} />

      {consentResult.ok ? (
        <ConsentPanel
          patientUserId={patientUserId}
          locale={locale}
          items={consentResult.data.items.map((item) => ({
            typeCode: item.typeCode,
            nameEn: item.nameEn,
            nameAr: item.nameAr,
            state: item.state,
            currentTextVersionId: item.currentTextVersionId,
          }))}
        />
      ) : null}
    </div>
  );
}
