import { setRequestLocale, getTranslations } from "next-intl/server";
import { FeatureCards } from "@/components/sections/feature-cards";
import { getContentProvider } from "@/content/static-provider";
import { buildMetadata } from "@/lib/seo";
import type { Locale } from "@/content/types";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  return buildMetadata({
    locale: locale as Locale,
    path: "/services",
    title: locale === "ar" ? "خدماتنا" : "Our Services",
    description:
      locale === "ar"
        ? "استشارات أونلاين، فيديو آمن، توثيق ذكي، وسجلات طبية آمنة."
        : "Online consultation, secure video, AI documentation, and secure medical records.",
  });
}

export default async function ServicesPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale: localeParam } = await params;
  const locale = localeParam as Locale;
  setRequestLocale(locale);
  const t = await getTranslations("home");
  const features = await getContentProvider().getFeatureCards(locale);

  return (
    <div className="pt-16">
      <FeatureCards title={t("servicesTitle")} subtitle={t("servicesSub")} items={features} />
    </div>
  );
}
