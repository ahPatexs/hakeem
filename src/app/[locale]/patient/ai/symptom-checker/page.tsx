import { setRequestLocale, getTranslations } from "next-intl/server";
import { SessionHistory } from "@/components/ai/symptom/session-history";
import { SessionWizard } from "@/components/ai/symptom/session-wizard";

export default async function SymptomCheckerPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("ai.symptom");

  return (
    <div className="space-y-8">
      <p className="sr-only">{t("disclaimer")}</p>
      <SessionWizard />
      <SessionHistory />
    </div>
  );
}
