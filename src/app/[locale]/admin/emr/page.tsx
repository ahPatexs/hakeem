import { setRequestLocale, getTranslations } from "next-intl/server";
import { requireRole } from "@/auth/guards";
import { emrAdminGetChartOversight } from "@/actions/emr/admin";
import { emrListDocuments } from "@/actions/emr/documents";
import { AdminEmrPatientSearch } from "@/components/emr/admin/patient-search";
import { DocumentActionsList } from "@/components/emr/documents/document-actions-list";

export default async function AdminEmrOversightPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ patientUserId?: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  await requireRole("ADMIN");
  const t = await getTranslations("emr");
  const sp = await searchParams;
  const patientUserId = sp.patientUserId?.trim();

  if (!patientUserId) {
    return (
      <div className="space-y-4">
        <h1 className="font-headline text-2xl text-primary">{t("admin.title")}</h1>
        <p className="text-sm text-on-surface-variant">{t("admin.banner")}</p>
        <AdminEmrPatientSearch />
      </div>
    );
  }

  const [result, documentsResult] = await Promise.all([
    emrAdminGetChartOversight({ patientUserId }),
    emrListDocuments({ patientUserId, includeDeleted: true }),
  ]);
  if (!result.ok) {
    return <p className="text-warm-coral">{result.code}</p>;
  }

  const { counts, legalHoldDocumentIds } = result.data;

  return (
    <div className="space-y-4">
      <p className="rounded-xl border border-outline-variant/30 bg-surface-container-low px-3 py-2 text-sm text-on-surface-variant">
        {t("admin.banner")}
      </p>
      <h1 className="font-headline text-2xl text-primary">{t("admin.title")}</h1>
      <AdminEmrPatientSearch />
      <dl className="grid gap-3 sm:grid-cols-2 md:grid-cols-3">
        {Object.entries(counts).map(([key, value]) => (
          <div
            key={key}
            className="rounded-xl border border-outline-variant/20 px-4 py-3 text-sm"
          >
            <dt className="text-on-surface-variant">{key}</dt>
            <dd className="font-medium text-primary">{value}</dd>
          </div>
        ))}
      </dl>
      {legalHoldDocumentIds.length > 0 ? (
        <p className="text-sm text-on-surface-variant">
          {t("admin.legalHoldCount", { count: legalHoldDocumentIds.length })}
        </p>
      ) : null}

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
          title={t("documents.title")}
          emptyLabel={t("empty")}
          locale={locale}
          canLegalHold
        />
      ) : null}
    </div>
  );
}
