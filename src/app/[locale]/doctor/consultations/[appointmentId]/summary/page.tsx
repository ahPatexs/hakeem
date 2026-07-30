import { redirect } from "@/i18n/routing";

export default async function ConsultationSummaryRedirect({
  params,
}: {
  params: Promise<{ locale: string; appointmentId: string }>;
}) {
  const { locale, appointmentId } = await params;
  redirect({ href: `/doctor/consultations/${appointmentId}?tab=summary`, locale });
}
