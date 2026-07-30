import { Suspense } from "react";
import { setRequestLocale, getTranslations } from "next-intl/server";
import { AuthShell } from "@/components/auth/auth-shell";
import { LoginForm } from "@/components/auth/login-form";
import { auth } from "@/auth";
import { homePathForRole } from "@/auth/rbac";
import { redirect } from "@/i18n/routing";

export default async function LoginPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);

  const session = await auth();
  if (session?.user?.id && session.user.role && session.sid) {
    redirect({ href: homePathForRole(session.user.role), locale });
  }

  const t = await getTranslations("auth");

  return (
    <AuthShell title={t("loginTitle")} subtitle={t("loginSubtitle")}>
      <Suspense fallback={<p className="text-center text-sm">{t("loading")}</p>}>
        <LoginForm />
      </Suspense>
    </AuthShell>
  );
}
