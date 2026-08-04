import { setRequestLocale, getTranslations } from "next-intl/server";
import { auth } from "@/auth";
import { emrGetSummary } from "@/actions/emr/summary";
import { emrListDocuments } from "@/actions/emr/documents";
import { emrListMedicalRecords } from "@/actions/emr/records";
import { RecordsList } from "@/components/patient/records/records-list";
import { ErrorState } from "@/components/patient/shared/error-state";
import { PatientSummary, DocumentList, MedicalTimeline } from "@/components/emr";
import { DocumentUploadForm } from "@/components/emr/documents/document-upload-form";
import { DocumentActionsList } from "@/components/emr/documents/document-actions-list";

export default async function RecordsPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ page?: string }>;
}) {
  const { locale } = await params;
  const sp = await searchParams;
  setRequestLocale(locale);
  const t = await getTranslations("patient.records");
  const temr = await getTranslations("emr");
  const session = await auth();
  const patientUserId = session?.user?.id;

  if (!patientUserId) {
    return <ErrorState title={t("loadError")} />;
  }

  const page = Number(sp.page ?? "1") || 1;
  const [recordsResult, summaryResult, documentsResult] = await Promise.all([
    emrListMedicalRecords({ patientUserId, page }),
    emrGetSummary({ patientUserId }),
    emrListDocuments({ patientUserId, includeDeleted: true }),
  ]);

  if (!recordsResult.ok) {
    return <ErrorState title={t("loadError")} />;
  }

  return (
    <div className="space-y-6">
      <h1 className="font-headline text-2xl text-primary">{t("title")}</h1>

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

      <MedicalTimeline patientUserId={patientUserId} locale={locale} />

      <RecordsList
        items={recordsResult.data.items}
        total={recordsResult.data.total}
        page={recordsResult.data.page}
        pageSize={recordsResult.data.pageSize}
      />

      <DocumentUploadForm
        patientUserId={patientUserId}
        allowedKinds={["PATIENT_UPLOAD", "OTHER"]}
      />

      {documentsResult.ok ? (
        <DocumentActionsList
          patientUserId={patientUserId}
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
      ) : (
        <DocumentList
          items={[]}
          title={temr("documents.title")}
          emptyLabel={temr("empty")}
          locale={locale}
        />
      )}
    </div>
  );
}
