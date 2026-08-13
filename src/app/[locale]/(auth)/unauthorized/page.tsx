import { setRequestLocale, getTranslations } from "next-intl/server";
import { AuthShell } from "@/components/auth/auth-shell";
import { Button } from "@/components/ui/button";
import { Link } from "@/i18n/routing";

export default async function UnauthorizedPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("auth");

  return (
    <AuthShell title={t("unauthorizedTitle")} subtitle={t("unauthorizedSubtitle")}>
      <Button asChild variant="auth" className="w-full">
        <Link href="/login">{t("signIn")}</Link>
      </Button>
    </AuthShell>
  );
}
