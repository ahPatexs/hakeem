import { setRequestLocale, getTranslations } from "next-intl/server";
import { auth } from "@/auth";
import { emrListPrescriptions } from "@/actions/emr/prescriptions";
import { CareHubHeader } from "@/components/patient/care/care-hub-header";
import { CareHubSearch } from "@/components/patient/care/care-hub-search";
import { CareHubTabs } from "@/components/patient/care/care-hub-tabs";
import { PrescriptionsList } from "@/components/patient/prescriptions/prescriptions-list";
import { ErrorState } from "@/components/patient/shared/error-state";
import { EMR_SEARCH_PAGE_SIZE } from "@/lib/emr/search";

function bucketHref(bucket: "active" | "history", q?: string) {
  const params = new URLSearchParams();
  if (bucket !== "active") params.set("bucket", bucket);
  if (q) params.set("q", q);
  const qs = params.toString();
  return qs ? `/patient/prescriptions?${qs}` : "/patient/prescriptions";
}

export default async function PrescriptionsPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ page?: string; q?: string; bucket?: string }>;
}) {
  const { locale } = await params;
  const sp = await searchParams;
  setRequestLocale(locale);
  const t = await getTranslations("patient.prescriptions");

  const session = await auth();
  const patientUserId = session?.user?.id;
  if (!patientUserId) {
    return <ErrorState title={t("loadError")} />;
  }

  const page = Number(sp.page ?? "1") || 1;
  const q = sp.q?.trim() || undefined;
  const bucket = sp.bucket === "history" ? "history" : "active";

  const result = await emrListPrescriptions({ patientUserId, bucket, page, q });
  if (!result.ok) {
    return <ErrorState title={t("loadError")} />;
  }

  const { activeCount = 0, historyCount = 0 } = result.data;

  return (
    <div className="space-y-6">
      <CareHubHeader
        eyebrow={t("eyebrow")}
        title={t("title")}
        subtitle={t("subtitle")}
        stats={[
          { label: t("statActive"), value: activeCount },
          { label: t("statPast"), value: historyCount },
        ]}
      />

      <CareHubSearch
        defaultValue={q ?? ""}
        placeholder={t("searchPlaceholder")}
        preserve={{ bucket: bucket === "history" ? "history" : undefined }}
      />

      <CareHubTabs
        ariaLabel={t("title")}
        activeKey={bucket}
        tabs={[
          { key: "active", label: t("tabActive"), href: bucketHref("active", q), count: activeCount },
          { key: "history", label: t("tabPast"), href: bucketHref("history", q), count: historyCount },
        ]}
      />

      <PrescriptionsList
        items={result.data.items}
        total={result.data.total}
        page={result.data.page}
        pageSize={EMR_SEARCH_PAGE_SIZE}
        locale={locale}
        bucket={bucket}
      />
    </div>
  );
}
