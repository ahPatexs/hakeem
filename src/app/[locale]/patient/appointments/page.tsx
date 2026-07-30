import { redirect } from "@/i18n/routing";

export default async function AppointmentsIndexPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  redirect({ href: "/patient/appointments/upcoming", locale });
}
