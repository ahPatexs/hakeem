import { setRequestLocale, getTranslations } from "next-intl/server";
import { Link } from "@/i18n/routing";
import { aiAdminGetGuardrailEvents } from "@/actions/ai/admin";
import { AiAdminSubnav } from "@/components/ai/admin/ai-admin-subnav";
import { GuardrailLog } from "@/components/ai/admin/guardrail-log";
import type { AiGuardrailTrigger } from "@prisma/client";

function defaultPeriod(days = 30) {
  const to = new Date();
  const from = new Date(to.getTime() - days * 24 * 60 * 60 * 1000);
  return { from, to };
}

export default async function AdminAiMonitoringPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ period?: string; trigger?: string; page?: string }>;
}) {
  const { locale } = await params;
  const sp = await searchParams;
  setRequestLocale(locale);
  const t = await getTranslations("ai.admin");

  const days = sp.period === "7d" ? 7 : sp.period === "90d" ? 90 : 30;
  const { from, to } = defaultPeriod(days);
  const page = Math.max(1, Number(sp.page ?? "1") || 1);

  const result = await aiAdminGetGuardrailEvents({
    from,
    to,
    trigger: sp.trigger as AiGuardrailTrigger | undefined,
    page,
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-headline text-3xl text-primary">{t("monitoringPageTitle")}</h1>
        <p className="text-on-surface-variant">{t("monitoringPageSubtitle")}</p>
      </div>
      <AiAdminSubnav />

      <div className="flex flex-wrap gap-2 text-sm">
        {(["7d", "30d", "90d"] as const).map((p) => (
          <Link
            key={p}
            href={`/admin/ai/monitoring?period=${p}${sp.trigger ? `&trigger=${sp.trigger}` : ""}`}
            className={(sp.period ?? "30d") === p ? "font-bold text-primary" : "text-med-green"}
          >
            {t(`period.${p}`)}
          </Link>
        ))}
      </div>

      {!result.ok ? (
        <p className="text-warm-coral">{result.code}</p>
      ) : (
        <GuardrailLog items={result.data.items} total={result.data.total} />
      )}
    </div>
  );
}
