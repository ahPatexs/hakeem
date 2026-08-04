import { setRequestLocale, getTranslations } from "next-intl/server";
import { AiDisclaimer } from "@/components/ai/chat/disclaimer";
import { EducationList } from "@/components/ai/recommendations/education-list";
import { RecommendationsPanel } from "@/components/ai/recommendations/recommendations-panel";
import { ErrorState } from "@/components/patient/shared/error-state";
import {
  aiListEducation,
  aiListRecommendations,
} from "@/actions/ai/recommendations";

export default async function PatientAiHealthPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("ai.recommendations");
  const portLocale = locale === "ar" ? "ar" : "en";

  const [recs, education] = await Promise.all([
    aiListRecommendations({ locale: portLocale }),
    aiListEducation({ locale: portLocale }),
  ]);

  if (!recs.ok) {
    return <ErrorState title={t("loadError")} />;
  }

  const educationItems = education.ok ? education.data.items : [];

  return (
    <div className="space-y-8">
      <div className="space-y-2">
        <h1 className="font-headline text-2xl text-primary">{t("pageTitle")}</h1>
        <p className="text-sm text-on-surface-variant">{t("pageSubtitle")}</p>
        <AiDisclaimer />
      </div>
      <RecommendationsPanel initialItems={recs.data.items} />
      <EducationList items={educationItems} />
    </div>
  );
}
