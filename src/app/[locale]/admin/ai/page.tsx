import { setRequestLocale, getTranslations } from "next-intl/server";
import { getAiOpsSnapshot, listFlaggedConversations } from "@/actions/admin/ai-ops";
import { AiOpsToggles } from "@/components/admin/ai/ai-ops-toggles";
import { FlaggedReviewActions } from "@/components/admin/ai/flagged-review-actions";
import { DisableUserAiForm } from "@/components/admin/ai/disable-user-ai-form";
import { EmptyState } from "@/components/platform";
import { KpiCard } from "@/components/admin/shared/kpi-card";

export default async function AdminAiPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("admin.ai");
  const [snapshot, flags] = await Promise.all([getAiOpsSnapshot(), listFlaggedConversations()]);
  if (!snapshot.ok) return <p className="text-warm-coral">{snapshot.code}</p>;

  return (
    <div className="space-y-8">
      <div>
        <h1 className="font-headline text-3xl text-primary">{t("title")}</h1>
        <p className="text-on-surface-variant">{t("subtitle")}</p>
      </div>
      <div className="grid gap-4 sm:grid-cols-3">
        <KpiCard label={t("patientMessages")} value={snapshot.data.patientMessages} />
        <KpiCard label={t("doctorMessages")} value={snapshot.data.doctorMessages} />
        <KpiCard label={t("flagged")} value={snapshot.data.flaggedCount} />
      </div>
      <AiOpsToggles settings={snapshot.data.settings} />
      <DisableUserAiForm />
      <section>
        <h2 className="mb-3 font-headline text-lg text-primary">{t("flaggedTitle")}</h2>
        {flags.ok && flags.data.length ? (
          <ul className="space-y-2 text-sm">
            {flags.data.map((f) => (
              <li key={f.id} className="flex flex-wrap items-start justify-between gap-3 rounded-xl border border-outline-variant/20 p-3">
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
