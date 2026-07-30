import { setRequestLocale, getTranslations } from "next-intl/server";
import { getPatientProfile } from "@/actions/patient/profile";
import { PersonalForm } from "@/components/patient/profile/personal-form";
import { EmergencyForm, InsuranceForm } from "@/components/patient/profile/emergency-form";
import { ErrorState } from "@/components/patient/shared/error-state";

export default async function ProfilePage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("patient.profile");

  const result = await getPatientProfile();
  if (!result.ok) {
    return <ErrorState title={t("loadError")} />;
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <h1 className="font-headline text-2xl text-primary">{t("title")}</h1>
      <PersonalForm profile={result.data} />
      <EmergencyForm profile={result.data} />
      <InsuranceForm profile={result.data} />
    </div>
  );
}
