import { setRequestLocale } from "next-intl/server";
import { Button } from "@/components/ui/button";
import { buildMetadata } from "@/lib/seo";
import { buildAppCtaUrl } from "@/lib/cta";
import type { Locale } from "@/content/types";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  return buildMetadata({
    locale: locale as Locale,
    path: "/ai-assistant",
    title: locale === "ar" ? "المساعد الطبي الذكي" : "AI Medical Assistant",
    description:
      locale === "ar"
        ? "تعرّف على مساعد حكيم للأسئلة الصحية والتوثيق الطبي."
        : "Learn how Hakeem’s AI assistant supports guided health questions and documentation.",
  });
}

export default async function AiAssistantPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const ar = locale === "ar";

  return (
    <div className="mx-auto max-w-7xl px-margin-mobile pb-20 pt-28 md:px-margin-desktop">
      <h1 className="mb-4 font-headline text-4xl text-primary">
        {ar ? "المساعد الطبي الذكي" : "Meet Your AI Medical Assistant"}
      </h1>
      <p className="mb-8 max-w-2xl text-lg text-on-surface-variant">
        {ar
          ? "أسئلة صحية موجّهة وتوثيق ذكي — التجربة الكاملة تتطلب إنشاء حساب أو تسجيل الدخول."
          : "Guided health questions and smart documentation — the full experience requires Register or Login."}
      </p>
      <div className="flex flex-wrap gap-4">
        <a href={buildAppCtaUrl("register", { locale: locale as Locale, page: "ai-assistant" })}>
          <Button size="lg">{ar ? "سجّل للتجربة" : "Register to Try It"}</Button>
        </a>
        <a href={buildAppCtaUrl("login", { locale: locale as Locale, page: "ai-assistant" })}>
          <Button size="lg" variant="outline">
            {ar ? "تسجيل الدخول" : "Login"}
          </Button>
        </a>
      </div>
    </div>
  );
}
