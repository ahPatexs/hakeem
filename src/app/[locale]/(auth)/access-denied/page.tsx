import { setRequestLocale, getTranslations } from "next-intl/server";
import { AuthShell } from "@/components/auth/auth-shell";
import { Button } from "@/components/ui/button";
import { Link } from "@/i18n/routing";

export default async function AccessDeniedPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("auth");

  return (
    <AuthShell title={t("accessDeniedTitle")} subtitle={t("accessDeniedSubtitle")}>
      <Button asChild className="w-full" variant="outline">
        <Link href="/">{t("backHome")}</Link>
      </Button>
    </AuthShell>
  );
}
