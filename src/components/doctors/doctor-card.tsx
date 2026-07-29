import Image from "next/image";
import { Star } from "lucide-react";
import { Button } from "@/components/ui/button";
import { buildAppCtaUrl } from "@/lib/cta";
import type { DoctorSummary, Locale } from "@/content/types";
import { Link } from "@/i18n/routing";

export function DoctorCard({
  doctor,
  locale,
  bookLabel,
}: {
  doctor: DoctorSummary;
  locale: Locale;
  bookLabel: string;
}) {
  return (
    <article className="group overflow-hidden rounded-2xl border border-outline-variant/30 bg-white shadow-sm transition-all hover:shadow-lg">
      <div className="relative h-64 overflow-hidden bg-surface-dim">
        {doctor.photo ? (
          <Image
            src={doctor.photo.url}
            alt={doctor.photo.alt}
            fill
            className="object-cover transition-transform duration-500 group-hover:scale-105"
            sizes="(max-width: 768px) 100vw, 33vw"
          />
        ) : null}
        {doctor.rating ? (
          <div className="absolute end-4 top-4 flex items-center gap-1 rounded-full bg-white/90 px-3 py-1 shadow-sm backdrop-blur">
            <Star className="h-[18px] w-[18px] fill-amber-400 text-amber-400" aria-hidden />
            <span className="text-sm font-bold text-on-surface">{doctor.rating.toFixed(1)}</span>
          </div>
        ) : null}
      </div>
      <div className="space-y-4 p-6">
        <div>
          <h4 className="font-headline text-primary">
            <Link href={`/doctors/${doctor.slug}`}>{doctor.name}</Link>
          </h4>
          <p className="text-sm font-semibold text-med-green">{doctor.title}</p>
        </div>
        {doctor.bioSnippet ? (
          <p className="line-clamp-2 text-sm text-on-surface-variant">{doctor.bioSnippet}</p>
        ) : null}
        <a href={buildAppCtaUrl("book", { locale, doctorSlug: doctor.slug, page: "doctor-card" })}>
          <Button variant="soft" className="w-full">
            {bookLabel}
          </Button>
        </a>
      </div>
    </article>
  );
}
