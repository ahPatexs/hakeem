import { setRequestLocale, getTranslations } from "next-intl/server";
import { aiAdminListBudgets } from "@/actions/ai/admin";
import { AiAdminSubnav } from "@/components/ai/admin/ai-admin-subnav";
import { BudgetForm } from "@/components/ai/admin/budget-form";

export default async function AdminAiBudgetsPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("ai.admin");
  const result = await aiAdminListBudgets();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-headline text-3xl text-primary">{t("budgetsPageTitle")}</h1>
        <p className="text-on-surface-variant">{t("budgetsPageSubtitle")}</p>
      </div>
      <AiAdminSubnav />
      {!result.ok ? (
        <p className="text-warm-coral">{result.code}</p>
      ) : (
        <BudgetForm budgets={result.data} />
      )}
    </div>
  );
}
