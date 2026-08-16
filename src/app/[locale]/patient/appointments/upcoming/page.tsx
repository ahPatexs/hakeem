import { setRequestLocale } from "next-intl/server";
import { UpcomingAppointmentsScreen } from "@/components/patient/appointments/upcoming-appointments-screen";

export default async function UpcomingAppointmentsPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ page?: string }>;
}) {
  const { locale } = await params;
  const sp = await searchParams;
  setRequestLocale(locale);
  const page = Number(sp.page ?? "1") || 1;
  return <UpcomingAppointmentsScreen page={page} />;
}
