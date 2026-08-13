import { setRequestLocale } from "next-intl/server";
import { FaqAccordion } from "@/components/sections/faq-accordion";
import { JsonLd } from "@/components/seo/json-ld";
import { getContentProvider } from "@/content/factory";
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
    path: "/faq",
    title: locale === "ar" ? "الأسئلة الشائعة" : "FAQ",
    description:
      locale === "ar"
        ? "إجابات حول الاستشارات والحجز والذكاء الاصطناعي والخصوصية."
        : "Answers about consultations, booking, AI features, and privacy.",
  });
}

export default async function FaqPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const faqs = await getContentProvider().getFaqs(locale as Locale);

  return (
    <div className="mx-auto max-w-3xl px-margin-mobile pb-20 pt-28 md:px-margin-desktop">
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "FAQPage",
          mainEntity: faqs.map((f) => ({
            "@type": "Question",
            name: f.question,
            acceptedAnswer: { "@type": "Answer", text: f.answer },
          })),
        }}
      />
      <h1 className="mb-8 font-headline text-4xl text-primary">
        {locale === "ar" ? "الأسئلة الشائعة" : "Frequently Asked Questions"}
      </h1>
      <FaqAccordion items={faqs} />
    </div>
  );
}
