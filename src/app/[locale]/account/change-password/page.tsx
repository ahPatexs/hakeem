import { setRequestLocale, getTranslations } from "next-intl/server";
import { auth } from "@/auth";
import { redirect } from "@/i18n/routing";
import { ChangePasswordForm } from "@/components/auth/change-password-form";

export default async function ChangePasswordPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const session = await auth();
  if (!session?.user?.id) redirect({ href: "/unauthorized", locale });
  const t = await getTranslations("auth");
  return (
    <div className="mx-auto max-w-lg space-y-6 px-margin-mobile py-28 md:px-margin-desktop">
      <h1 className="font-headline text-2xl text-primary">{t("changePassword")}</h1>
      <ChangePasswordForm />
    </div>
  );
}
