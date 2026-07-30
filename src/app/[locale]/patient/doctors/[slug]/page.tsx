import { setRequestLocale, getTranslations } from "next-intl/server";
import { notFound } from "next/navigation";
import { getDoctorBySlug } from "@/actions/patient/doctors";
import { DoctorProfileView } from "@/components/patient/doctors/doctor-profile";
import { ErrorState } from "@/components/patient/shared/error-state";

export default async function DoctorDetailPage({
  params,
}: {
  params: Promise<{ locale: string; slug: string }>;
}) {
  const { locale, slug } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("patient.doctors");

  const result = await getDoctorBySlug(slug);
  if (!result.ok) {
    return <ErrorState title={t("loadError")} />;
  }
  if (!result.data) {
    notFound();
  }

  return (
    <DoctorProfileView doctor={result.data.doctor} availability={result.data.availability} />
  );
}
