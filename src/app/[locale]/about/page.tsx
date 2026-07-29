import { setRequestLocale } from "next-intl/server";
import { buildMetadata } from "@/lib/seo";
import type { Locale } from "@/content/types";

function SimplePage({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="mx-auto max-w-7xl px-margin-mobile pb-20 pt-28 md:px-margin-desktop">
      <h1 className="mb-6 font-headline text-4xl text-primary">{title}</h1>
      <div className="prose max-w-3xl text-on-surface-variant">{children}</div>
    </div>
  );
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  return buildMetadata({
    locale: locale as Locale,
    path: "/about",
    title: locale === "ar" ? "من نحن" : "About Hakeem",
    description:
      locale === "ar"
        ? "تعرف على منصة حكيم للرعاية الصحية عن بُعد المدعومة بالذكاء الاصطناعي."
        : "Learn about Hakeem, the AI-powered telemedicine platform.",
  });
}

export default async function AboutPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  return (
    <SimplePage title={locale === "ar" ? "من نحن" : "About Hakeem"}>
      <p>
        Hakeem is an AI-powered telemedicine platform connecting patients with licensed doctors for
        online consultations, video visits, secure electronic medical records, and AI medical
        documentation.
      </p>
    </SimplePage>
  );
}
