import { setRequestLocale, getTranslations } from "next-intl/server";
import { AuthShell } from "@/components/auth/auth-shell";
import { VerifyEmailPanel } from "@/components/auth/verify-email-panel";

export default async function VerifyEmailPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ token?: string; email?: string }>;
}) {
  const { locale } = await params;
  const sp = await searchParams;
  setRequestLocale(locale);
  const t = await getTranslations("auth");

  return (
    <AuthShell title={t("verifyTitle")} subtitle={t("verifySubtitle")}>
      <VerifyEmailPanel token={sp.token} email={sp.email} />
    </AuthShell>
  );
}
