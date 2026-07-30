import { redirect } from "@/i18n/routing";
import { setRequestLocale } from "next-intl/server";

export default async function AnalyticsAiPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  redirect({ href: "/admin/ai", locale });
}
