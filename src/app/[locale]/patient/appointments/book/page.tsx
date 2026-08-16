import { setRequestLocale, getTranslations } from "next-intl/server";
import { CalendarDays, Stethoscope } from "lucide-react";
import { Link } from "@/i18n/routing";
import { AppointmentPageHeader } from "@/components/patient/appointments/appointment-chrome";

export default async function BookAppointmentPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ symptomSessionId?: string }>;
}) {
  const { locale } = await params;
  const sp = await searchParams;
  setRequestLocale(locale);
  const t = await getTranslations("patient.appointments");

  const doctorsHref = sp.symptomSessionId
    ? `/patient/doctors?symptomSessionId=${encodeURIComponent(sp.symptomSessionId)}`
    : "/patient/doctors";

  return (
    <div className="space-y-8">
      <AppointmentPageHeader
        title={t("bookTitle")}
        subtitle={t("bookHint")}
        showBook={false}
        showTabs={false}
      />

      <div className="grid gap-4 sm:grid-cols-2">
        <Link
          href={doctorsHref}
          className="glass-card group rounded-3xl border border-outline-variant/20 p-6 shadow-sm transition hover:border-med-green/30 hover:shadow-md"
        >
          <span className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-primary group-hover:bg-med-green/10 group-hover:text-med-green">
            <Stethoscope className="h-5 w-5" aria-hidden />
          </span>
          <h2 className="font-headline mt-4 text-lg text-primary">{t("findDoctor")}</h2>
          <p className="mt-1 text-sm text-on-surface-variant">{t("findDoctorHint")}</p>
        </Link>
        <Link
          href="/patient/appointments/upcoming"
          className="glass-card group rounded-3xl border border-outline-variant/20 p-6 shadow-sm transition hover:border-med-green/30 hover:shadow-md"
        >
          <span className="flex h-12 w-12 items-center justify-center rounded-full bg-med-green/10 text-med-green">
            <CalendarDays className="h-5 w-5" aria-hidden />
          </span>
          <h2 className="font-headline mt-4 text-lg text-primary">{t("viewUpcoming")}</h2>
          <p className="mt-1 text-sm text-on-surface-variant">{t("viewUpcomingHint")}</p>
        </Link>
      </div>

      <section className="rounded-3xl border border-outline-variant/20 bg-surface-container-lowest p-6 shadow-sm">
        <h2 className="font-headline text-lg text-primary">{t("stepsTitle")}</h2>
        <ol className="mt-4 grid gap-4 sm:grid-cols-3">
          {[t("step1"), t("step2"), t("step3")].map((step, index) => (
            <li key={step} className="flex gap-3">
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary text-sm font-bold text-white">
                {index + 1}
              </span>
              <p className="pt-1 text-sm font-medium text-on-surface-variant">{step}</p>
            </li>
          ))}
        </ol>
      </section>
    </div>
  );
}
