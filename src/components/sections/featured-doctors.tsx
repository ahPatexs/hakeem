import { ChevronRight } from "lucide-react";
import { Link } from "@/i18n/routing";
import { DoctorCard } from "@/components/doctors/doctor-card";
import type { DoctorSummary, Locale } from "@/content/types";

export function FeaturedDoctors({
  title,
  subtitle,
  viewAllLabel,
  bookLabel,
  doctors,
  locale,
}: {
  title: string;
  subtitle: string;
  viewAllLabel: string;
  bookLabel: string;
  doctors: DoctorSummary[];
  locale: Locale;
}) {
  return (
    <section className="mx-auto max-w-7xl px-margin-mobile py-2xl md:px-margin-desktop" id="doctors">
      <div className="mb-12 flex flex-col items-end justify-between gap-4 md:flex-row">
        <div className="space-y-2 self-start">
          <h2 className="font-headline text-headline-lg text-primary">{title}</h2>
          <p className="text-on-surface-variant">{subtitle}</p>
        </div>
        <Link
          href="/doctors"
          className="flex items-center gap-2 font-semibold text-primary hover:underline"
        >
          {viewAllLabel}
          <ChevronRight className="h-5 w-5 rtl:rotate-180" aria-hidden />
        </Link>
      </div>
      <div className="grid gap-gutter md:grid-cols-3">
        {doctors.map((doctor) => (
          <DoctorCard key={doctor.slug} doctor={doctor} locale={locale} bookLabel={bookLabel} />
        ))}
      </div>
    </section>
  );
}
