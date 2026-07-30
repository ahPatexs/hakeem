import { setRequestLocale, getTranslations } from "next-intl/server";
import { Link } from "@/i18n/routing";
import { Button } from "@/components/ui/button";

export default async function BookAppointmentPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("patient.appointments");

  return (
    <div className="mx-auto max-w-lg space-y-6 text-center">
      <h1 className="font-headline text-2xl text-primary">{t("bookTitle")}</h1>
      <p className="text-on-surface-variant">{t("bookHint")}</p>
      <Button asChild variant="soft">
        <Link href="/patient/doctors">{t("findDoctor")}</Link>
      </Button>
    </div>
  );
}
