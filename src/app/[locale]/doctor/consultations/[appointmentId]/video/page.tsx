import { redirect } from "@/i18n/routing";

export default async function ConsultationVideoRedirect({
  params,
}: {
  params: Promise<{ locale: string; appointmentId: string }>;
}) {
  const { locale, appointmentId } = await params;
  redirect({ href: `/doctor/consultations/${appointmentId}?tab=video`, locale });
}
