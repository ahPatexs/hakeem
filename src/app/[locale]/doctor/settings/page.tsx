import { setRequestLocale, getTranslations } from "next-intl/server";
import { Link } from "@/i18n/routing";
import { getDoctorProfile } from "@/actions/doctor/profile";
import { DoctorSettingsForm } from "@/components/doctor/profile/settings-form";
import { ErrorState } from "@/components/doctor/shared";

export default async function DoctorSettingsPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("doctor.settings");
  const tc = await getTranslations("doctor.common");

  const result = await getDoctorProfile();
  if (!result.ok) {
    return <ErrorState title={t("title")} message={t("loadError")} />;
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <Link href="/doctor/profile" className="text-sm font-medium text-med-green hover:underline">
          ← {tc("back")}
        </Link>
        <h1 className="mt-2 font-headline text-2xl text-primary md:text-3xl">{t("title")}</h1>
      </div>
      <DoctorSettingsForm settings={result.data.settings} />
    </div>
  );
}
