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
    path: "/privacy-policy",
    title: locale === "ar" ? "سياسة الخصوصية" : "Privacy Policy",
    description: "Hakeem Privacy Policy",
  });
}

export default async function PrivacyPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  return (
    <div className="mx-auto max-w-3xl px-margin-mobile pb-20 pt-28 md:px-margin-desktop">
      <h1 className="mb-4 font-headline text-4xl text-primary">
        {locale === "ar" ? "سياسة الخصوصية" : "Privacy Policy"}
      </h1>
      <p className="text-sm text-on-surface-variant">Effective date: January 1, 2026</p>
      <div className="mt-8 space-y-4 text-on-surface-variant">
        <p>
          Hakeem processes contact and newsletter data as described in this policy. Electronic
          medical records are encrypted and never exposed on the public website.
        </p>
      </div>
    </div>
  );
}
