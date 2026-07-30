import { setRequestLocale, getTranslations } from "next-intl/server";
import { AuthShell } from "@/components/auth/auth-shell";
import { ResetPasswordForm } from "@/components/auth/password-forms";
import { AuthAlert } from "@/components/auth/auth-alert";
import { Link } from "@/i18n/routing";

export default async function ResetPasswordPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ token?: string }>;
}) {
  const { locale } = await params;
  const { token } = await searchParams;
  setRequestLocale(locale);
  const t = await getTranslations("auth");

  return (
    <AuthShell title={t("resetTitle")} subtitle={t("resetSubtitle")}>
      {token ? (
        <ResetPasswordForm token={token} />
      ) : (
        <AuthAlert variant="error">
          {t("errors.TOKEN_INVALID")}{" "}
          <Link href="/forgot-password" className="underline">
            {t("forgotPassword")}
          </Link>
        </AuthAlert>
      )}
    </AuthShell>
  );
}
