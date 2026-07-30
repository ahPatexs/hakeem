import { setRequestLocale, getTranslations } from "next-intl/server";
import { AuthShell } from "@/components/auth/auth-shell";
import { SessionExpiredActions } from "@/components/auth/session-expired-actions";

export default async function SessionExpiredPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("auth");

  return (
    <AuthShell title={t("sessionExpiredTitle")} subtitle={t("sessionExpiredSubtitle")}>
      <SessionExpiredActions signInLabel={t("signIn")} />
    </AuthShell>
  );
}
