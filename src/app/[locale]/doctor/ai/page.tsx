import { setRequestLocale, getTranslations } from "next-intl/server";
import { AiPanel } from "@/components/doctor/workspace/ai-panel";

const MODES = new Set(["MEDICAL", "DOCUMENTATION", "PRESCRIPTION"]);

export default async function DoctorAiPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ mode?: string }>;
}) {
  const { locale } = await params;
  const { mode } = await searchParams;
  setRequestLocale(locale);
  const t = await getTranslations("doctor.ai");
  const defaultMode = mode && MODES.has(mode) ? (mode as "MEDICAL" | "DOCUMENTATION" | "PRESCRIPTION") : "MEDICAL";

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <h1 className="font-headline text-2xl text-primary md:text-3xl">{t("title")}</h1>
        <p className="mt-2 rounded-2xl bg-amber-50 px-4 py-3 text-sm text-amber-900">{t("disclaimer")}</p>
      </div>
      <div className="glass-card min-h-[32rem] rounded-2xl border border-outline-variant/20 bg-surface-container-low p-5">
        <AiPanel defaultMode={defaultMode} />
      </div>
    </div>
  );
}
