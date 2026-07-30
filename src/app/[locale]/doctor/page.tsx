import { setRequestLocale, getTranslations } from "next-intl/server";
import { auth } from "@/auth";
import { Link } from "@/i18n/routing";
import { Button } from "@/components/ui/button";

export default async function DoctorHome({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("auth");
  const session = await auth();
  const user = session!.user;

  return (
    <div className="mx-auto max-w-3xl space-y-6 px-margin-mobile py-28 md:px-margin-desktop">
      <h1 className="font-headline text-3xl text-primary">{t("doctorHomeTitle")}</h1>
      <p className="text-on-surface-variant">
        {t("welcomeUser", { name: user.name ?? user.email })}
      </p>
      <Button asChild variant="outline">
        <Link href="/account/sessions">{t("manageSessions")}</Link>
      </Button>
    </div>
  );
}
