import { redirect } from "@/i18n/routing";
import { setRequestLocale } from "next-intl/server";

export default async function AnalyticsAppointmentsPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  redirect({ href: "/admin/analytics?period=30d", locale });
}
