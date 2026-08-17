import { setRequestLocale, getTranslations } from "next-intl/server";
import { auth } from "@/auth";
import { emrGetSummary } from "@/actions/emr/summary";
import { emrListDocuments } from "@/actions/emr/documents";
import { emrListMedicalRecords } from "@/actions/emr/records";
import { CareHubHeader } from "@/components/patient/care/care-hub-header";
import { CareHubSearch } from "@/components/patient/care/care-hub-search";
import { CareHubTabs } from "@/components/patient/care/care-hub-tabs";
import { HealthSnapshot } from "@/components/patient/care/health-snapshot";
import { RecordsList } from "@/components/patient/records/records-list";
import { ErrorState } from "@/components/patient/shared/error-state";
import { DocumentUploadForm } from "@/components/emr/documents/document-upload-form";
import { DocumentActionsList } from "@/components/emr/documents/document-actions-list";
import { EMR_SEARCH_PAGE_SIZE } from "@/lib/emr/search";

function tabHref(tab: "notes" | "files", q?: string) {
  const params = new URLSearchParams();
  if (tab !== "notes") params.set("tab", tab);
  if (q) params.set("q", q);
  const qs = params.toString();
  return qs ? `/patient/records?${qs}` : "/patient/records";
}

export default async function RecordsPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ page?: string; q?: string; tab?: string }>;
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
  const q = sp.q?.trim() || undefined;
  const tab = sp.tab === "files" ? "files" : "notes";

  const [recordsResult, summaryResult, documentsResult] = await Promise.all([
    emrListMedicalRecords({ patientUserId, page, q, tab }),
    emrGetSummary({ patientUserId }),
    tab === "files" ? emrListDocuments({ patientUserId, includeDeleted: true }) : Promise.resolve(null),
  ]);

  if (!recordsResult.ok) {
    return <ErrorState title={t("loadError")} />;
  }

  const { visitNotesCount, filesCount } = recordsResult.data;
  const lastUpdated = recordsResult.data.items[0]?.recordedAt;

  return (
    <div className="space-y-6">
      <CareHubHeader
        eyebrow={t("eyebrow")}
        title={t("title")}
        subtitle={t("subtitle")}
        stats={[
          { label: t("statVisitNotes"), value: visitNotesCount },
          { label: t("statFiles"), value: filesCount },
          {
            label: t("statLastUpdate"),
            value: lastUpdated ? new Date(lastUpdated).toLocaleDateString(locale === "ar" ? "ar-SA" : "en-GB") : "—",
          },
        ]}
      />

      {summaryResult.ok ? (
        <HealthSnapshot
          summary={summaryResult.data}
          labels={{
            title: t("snapshotTitle"),
            allergies: temr("summary.allergies"),
            medications: temr("summary.medications"),
            emptyAllergies: temr("summary.empty"),
            emptyMedications: t("noActiveMeds"),
            criticalHint: t("criticalHint"),
          }}
        />
      ) : null}

      <CareHubSearch defaultValue={q ?? ""} placeholder={t("searchPlaceholder")} preserve={{ tab: tab === "files" ? "files" : undefined }} />

      <CareHubTabs
        ariaLabel={t("title")}
        activeKey={tab}
        tabs={[
          { key: "notes", label: t("tabVisitNotes"), href: tabHref("notes", q), count: visitNotesCount },
          { key: "files", label: t("tabFiles"), href: tabHref("files", q), count: filesCount },
        ]}
      />

      {tab === "notes" ? (
        <RecordsList
          items={recordsResult.data.items}
          total={recordsResult.data.total}
          page={recordsResult.data.page}
          pageSize={EMR_SEARCH_PAGE_SIZE}
          locale={locale}
          tab="notes"
        />
      ) : (
        <div className="space-y-6">
          <DocumentUploadForm patientUserId={patientUserId} allowedKinds={["PATIENT_UPLOAD", "OTHER"]} />
          {documentsResult?.ok ? (
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
          ) : null}
          <RecordsList
            items={recordsResult.data.items}
            total={recordsResult.data.total}
            page={recordsResult.data.page}
            pageSize={EMR_SEARCH_PAGE_SIZE}
            locale={locale}
            tab="files"
          />
        </div>
      )}
    </div>
  );
}
