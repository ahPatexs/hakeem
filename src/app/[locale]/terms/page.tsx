import { setRequestLocale } from "next-intl/server";
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
    path: "/terms",
    title: locale === "ar" ? "الشروط والأحكام" : "Terms & Conditions",
    description: "Hakeem Terms & Conditions",
  });
}

export default async function TermsPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  return (
    <div className="mx-auto max-w-3xl px-margin-mobile pb-20 pt-28 md:px-margin-desktop">
      <h1 className="mb-4 font-headline text-4xl text-primary">
        {locale === "ar" ? "الشروط والأحكام" : "Terms & Conditions"}
      </h1>
      <p className="text-sm text-on-surface-variant">Effective date: January 1, 2026</p>
      <div className="mt-8 space-y-4 text-on-surface-variant">
        <p>
          Hakeem does not provide emergency medical services. Use of the public website does not
          create a doctor–patient relationship until you complete registration and booking in the
          platform app.
        </p>
      </div>
    </div>
  );
}
