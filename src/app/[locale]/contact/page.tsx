import { setRequestLocale } from "next-intl/server";
import { ContactForm } from "@/components/forms/contact-form";
import { JsonLd } from "@/components/seo/json-ld";
import { buildMetadata, siteUrl } from "@/lib/seo";
import type { Locale } from "@/content/types";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  return buildMetadata({
    locale: locale as Locale,
    path: "/contact",
    title: locale === "ar" ? "تواصل معنا" : "Contact Us",
    description:
      locale === "ar"
        ? "أرسل استفسارك وسنرد خلال يوم عمل."
        : "Send an inquiry — we usually reply within one business day.",
  });
}

export default async function ContactPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  return (
    <div className="mx-auto max-w-3xl px-margin-mobile pb-20 pt-28 md:px-margin-desktop">
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "ContactPage",
          name: "Contact Hakeem",
          url: siteUrl(`/${locale}/contact`),
        }}
      />
      <h1 className="mb-2 font-headline text-4xl text-primary">
        {locale === "ar" ? "تواصل معنا" : "Get in Touch"}
      </h1>
      <p className="mb-8 text-on-surface-variant">
        {locale === "ar"
          ? "نرد عادة خلال يوم عمل واحد."
          : "We usually reply within one business day."}
      </p>
      <div className="glass-card rounded-2xl p-6 md:p-8">
        <ContactForm />
      </div>
    </div>
  );
}
