import { redirect } from "@/i18n/routing";

export default async function DoctorAiPrescriptionRedirect({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  redirect({ href: "/doctor/ai?mode=PRESCRIPTION", locale });
}
