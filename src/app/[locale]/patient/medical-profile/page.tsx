import { setRequestLocale, getTranslations } from "next-intl/server";
import { getMedicalProfile } from "@/actions/patient/medical-profile";
import { MedicalProfileForm } from "@/components/patient/profile/medical-profile-form";
import { ErrorState } from "@/components/patient/shared/error-state";

export default async function MedicalProfilePage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("patient.medicalProfile");

  const result = await getMedicalProfile();
  if (!result.ok) {
    return <ErrorState title={t("loadError")} />;
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <h1 className="font-headline text-2xl text-primary">{t("pageTitle")}</h1>
      <MedicalProfileForm profile={result.data} />
    </div>
  );
}
