import { setRequestLocale, getTranslations } from "next-intl/server";
import { AuthShell } from "@/components/auth/auth-shell";
import { RegisterForm } from "@/components/auth/register-form";

export default async function RegisterPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("auth");

  return (
    <AuthShell title={t("registerTitle")} subtitle={t("registerSubtitle")}>
      <RegisterForm />
    </AuthShell>
  );
}
