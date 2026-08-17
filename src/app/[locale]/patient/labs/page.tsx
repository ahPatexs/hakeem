import { setRequestLocale, getTranslations } from "next-intl/server";
import { auth } from "@/auth";
import { emrListLabResults } from "@/actions/emr/diagnostics";
import { CareHubHeader } from "@/components/patient/care/care-hub-header";
import { CareHubSearch } from "@/components/patient/care/care-hub-search";
import { CareHubTabs } from "@/components/patient/care/care-hub-tabs";
import { LabsList } from "@/components/patient/labs/labs-list";
import { ErrorState } from "@/components/patient/shared/error-state";
import { EMR_SEARCH_PAGE_SIZE } from "@/lib/emr/search";

function filterHref(filter: "all" | "critical", q?: string) {
  const params = new URLSearchParams();
  if (filter === "critical") params.set("filter", "critical");
  if (q) params.set("q", q);
  const qs = params.toString();
  return qs ? `/patient/labs?${qs}` : "/patient/labs";
}

export default async function LabsPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ page?: string; q?: string; filter?: string }>;
}) {
  const { locale } = await params;
  const sp = await searchParams;
  setRequestLocale(locale);
  const t = await getTranslations("patient.labs");
  const session = await auth();
  const patientUserId = session?.user?.id;
  if (!patientUserId) {
    return <ErrorState title={t("loadError")} />;
  }

  const page = Number(sp.page ?? "1") || 1;
  const q = sp.q?.trim() || undefined;
  const filter = sp.filter === "critical" ? "critical" : "all";

  const [allResult, listResult] = await Promise.all([
    emrListLabResults({ patientUserId, page: 1 }),
    emrListLabResults({
      patientUserId,
      page,
      q,
      ...(filter === "critical" ? { type: "critical" } : {}),
    }),
  ]);

  if (!listResult.ok) {
    return <ErrorState title={t("loadError")} />;
  }

  const totalShared = allResult.ok ? allResult.data.total : listResult.data.total;
  const criticalCount = allResult.ok ? (allResult.data.criticalCount ?? 0) : 0;

  return (
    <div className="space-y-6">
      <CareHubHeader
        eyebrow={t("eyebrow")}
        title={t("title")}
        subtitle={t("subtitle")}
        stats={[
          { label: t("statShared"), value: totalShared },
          {
            label: t("statCritical"),
            value: criticalCount,
            hint: criticalCount > 0 ? t("criticalHint") : undefined,
          },
        ]}
      />

      <CareHubSearch
        defaultValue={q ?? ""}
        placeholder={t("searchPlaceholder")}
        preserve={{ filter: filter === "critical" ? "critical" : undefined }}
      />

      <CareHubTabs
        ariaLabel={t("title")}
        activeKey={filter}
        tabs={[
          { key: "all", label: t("filterAll"), href: filterHref("all", q), count: totalShared },
          { key: "critical", label: t("filterCritical"), href: filterHref("critical", q), count: criticalCount },
        ]}
      />

      <LabsList
        items={listResult.data.items}
        total={listResult.data.total}
        page={listResult.data.page}
        pageSize={EMR_SEARCH_PAGE_SIZE}
        locale={locale}
      />
    </div>
  );
}
