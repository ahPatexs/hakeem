import { setRequestLocale, getTranslations } from "next-intl/server";
import { HowItWorksPreview } from "@/components/sections/how-it-works-steps";
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
    path: "/how-it-works",
    title: locale === "ar" ? "كيف يعمل حكيم" : "How It Works",
    description:
      locale === "ar"
        ? "من التسجيل إلى الاستشارة والسجل الطبي في خطوات بسيطة."
        : "From registration to consultation and medical records in simple steps.",
  });
}

export default async function HowItWorksPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("home");
  const steps = await getContentProvider().getWorkflowSteps(locale as Locale);
  return (
    <div className="pt-16">
      <HowItWorksPreview title={t("workflowTitle")} steps={steps} />
    </div>
  );
}
