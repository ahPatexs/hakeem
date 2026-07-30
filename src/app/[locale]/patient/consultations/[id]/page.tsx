import { setRequestLocale, getTranslations } from "next-intl/server";
import { notFound } from "next/navigation";
import { getAppointment } from "@/actions/patient/appointments";
import { VideoConsultation } from "@/components/patient/appointments/video-consultation";
import { ErrorState } from "@/components/patient/shared/error-state";

export default async function ConsultationPage({
  params,
}: {
  params: Promise<{ locale: string; id: string }>;
}) {
  const { locale, id } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("patient.consultations");

  const result = await getAppointment(id);
  if (!result.ok) {
    if (result.code === "FORBIDDEN") notFound();
    return <ErrorState title={t("loadError")} />;
  }

  if (result.data.mode !== "VIDEO") {
    notFound();
  }

  return <VideoConsultation appointment={result.data} />;
}
