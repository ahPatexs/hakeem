import { setRequestLocale, getTranslations } from "next-intl/server";
import { requireRole } from "@/auth/guards";
import { auth } from "@/auth";
import { MedicalTimeline } from "@/components/emr/timeline/medical-timeline";

export default async function PatientTimelinePage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  await requireRole("PATIENT");
  const session = await auth();
  const t = await getTranslations("emr");
  const patientUserId = session?.user?.id;
  if (!patientUserId) {
    return <p className="text-warm-coral">UNAUTHORIZED</p>;
  }

  return (
    <div className="space-y-4">
      <h1 className="font-headline text-2xl text-primary">{t("timeline.title")}</h1>
      <MedicalTimeline patientUserId={patientUserId} locale={locale} />
    </div>
  );
}
