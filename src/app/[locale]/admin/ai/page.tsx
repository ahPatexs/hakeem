import { setRequestLocale, getTranslations } from "next-intl/server";
import { getAiOpsSnapshot, listFlaggedConversations } from "@/actions/admin/ai-ops";
import { aiAdminGetOpsDashboard } from "@/actions/ai/admin";
import { AiOpsToggles } from "@/components/admin/ai/ai-ops-toggles";
import { FlaggedReviewActions } from "@/components/admin/ai/flagged-review-actions";
import { DisableUserAiForm } from "@/components/admin/ai/disable-user-ai-form";
import { AiAdminSubnav } from "@/components/ai/admin/ai-admin-subnav";
import { OpsDashboardView } from "@/components/ai/admin/ops-dashboard";
import { EmptyState } from "@/components/platform";
import { KpiCard } from "@/components/admin/shared/kpi-card";

function resolvePeriod(sp: { from?: string; to?: string; period?: string }): {
  from: Date;
  to: Date;
  days: 7 | 30 | 90;
} {
  const to = sp.to ? new Date(sp.to) : new Date();
  if (sp.from) {
    const from = new Date(sp.from);
    const daysMs = to.getTime() - from.getTime();
    const approx = Math.round(daysMs / (24 * 60 * 60 * 1000));
    const days: 7 | 30 | 90 = approx <= 10 ? 7 : approx <= 45 ? 30 : 90;
    return { from, to, days };
  }
  const days: 7 | 30 | 90 =
    sp.period === "7d" ? 7 : sp.period === "90d" ? 90 : 30;
  const from = new Date(to.getTime() - days * 24 * 60 * 60 * 1000);
  return { from, to, days };
}

export default async function AdminAiPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ from?: string; to?: string; period?: string }>;
}) {
  const { locale } = await params;
  const sp = await searchParams;
  setRequestLocale(locale);
  const t = await getTranslations("admin.ai");
  const period = resolvePeriod(sp);

  const [snapshot, flags, ops] = await Promise.all([
    getAiOpsSnapshot(),
    listFlaggedConversations(),
    aiAdminGetOpsDashboard({ from: period.from, to: period.to }),
  ]);
  if (!snapshot.ok) return <p className="text-warm-coral">{snapshot.code}</p>;

  return (
    <div className="space-y-8">
      <div>
        <h1 className="font-headline text-3xl text-primary">{t("title")}</h1>
        <p className="text-on-surface-variant">{t("subtitle")}</p>
      </div>

      <AiAdminSubnav />

      <div className="grid gap-4 sm:grid-cols-3">
        <KpiCard label={t("patientMessages")} value={snapshot.data.patientMessages} />
        <KpiCard label={t("doctorMessages")} value={snapshot.data.doctorMessages} />
        <KpiCard label={t("flagged")} value={snapshot.data.flaggedCount} />
      </div>

      {ops.ok ? (
        <OpsDashboardView data={ops.data} periodDays={period.days} />
      ) : (
        <p className="text-sm text-warm-coral">{ops.code}</p>
      )}

      <AiOpsToggles settings={snapshot.data.settings} />
      <DisableUserAiForm />
      <section>
        <h2 className="mb-3 font-headline text-lg text-primary">{t("flaggedTitle")}</h2>
        {flags.ok && flags.data.length ? (
          <ul className="space-y-2 text-sm">
            {flags.data.map((f) => (
              <li
                key={f.id}
                className="flex flex-wrap items-start justify-between gap-3 rounded-xl border border-outline-variant/20 p-3"
              >
                <div>
                  <p className="font-medium text-primary">{f.source}</p>
                  <p className="text-on-surface-variant">{f.reason}</p>
                </div>
                <FlaggedReviewActions flagId={f.id} />
              </li>
            ))}
          </ul>
        ) : (
          <EmptyState title={t("noFlags")} />
        )}
      </section>
    </div>
  );
}
