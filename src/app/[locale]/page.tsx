import { setRequestLocale, getTranslations } from "next-intl/server";
import { Hero } from "@/components/sections/hero";
import { FeatureCards, Statistics } from "@/components/sections/feature-cards";
import { HowItWorksPreview } from "@/components/sections/how-it-works-steps";
import { FeaturedDoctors } from "@/components/sections/featured-doctors";
import { CtaSection } from "@/components/sections/cta-section";
import { Testimonials } from "@/components/sections/testimonials";
import { MotionSection } from "@/components/sections/motion-section";
import { JsonLd, organizationJsonLd, websiteJsonLd } from "@/components/seo/json-ld";
import { getContentProvider } from "@/content/factory";
import { buildMetadata, siteUrl } from "@/lib/seo";
import type { Locale } from "@/content/types";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "home" });
  return buildMetadata({
    locale: locale as Locale,
    path: "/",
    title: locale === "ar" ? "حكيم — رعاية صحية ذكية" : "Hakeem — AI-Powered Smart Healthcare",
    description: t("subhead"),
  });
}

export default async function HomePage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale: localeParam } = await params;
  const locale = localeParam as Locale;
  setRequestLocale(locale);

  const t = await getTranslations("home");
  const tCommon = await getTranslations("common");
  const provider = getContentProvider();

  const [features, stats, steps, doctorsPage, testimonials] = await Promise.all([
    provider.getFeatureCards(locale),
    provider.getStats(locale),
    provider.getWorkflowSteps(locale),
    provider.listDoctors({ locale, pageSize: 3 }),
    provider.getTestimonials(locale),
  ]);

  const origin = siteUrl();

  return (
    <>
      <JsonLd data={[organizationJsonLd(origin), websiteJsonLd(origin, locale)]} />
      <Hero locale={locale} />
      <Statistics items={stats} />
      <MotionSection>
        <FeatureCards title={t("servicesTitle")} subtitle={t("servicesSub")} items={features} />
      </MotionSection>
      <MotionSection>
        <HowItWorksPreview title={t("workflowTitle")} steps={steps} />
      </MotionSection>
      <MotionSection>
        <FeaturedDoctors
          title={t("doctorsTitle")}
          subtitle={t("doctorsSub")}
          viewAllLabel={t("viewAllDoctors")}
          bookLabel={tCommon("bookConsultation")}
          doctors={doctorsPage.items}
          locale={locale}
        />
      </MotionSection>
      <MotionSection>
        <Testimonials items={testimonials} title={t("testimonialsTitle")} />
      </MotionSection>
      <MotionSection>
        <CtaSection
          title={t("ctaTitle")}
          subtitle={t("ctaSub")}
          findLabel={t("ctaFind")}
          startLabel={t("ctaStart")}
          bookLabel={tCommon("bookConsultation")}
          locale={locale}
        />
      </MotionSection>
    </>
  );
}
