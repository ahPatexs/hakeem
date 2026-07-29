import { Button } from "@/components/ui/button";
import { buildAppCtaUrl } from "@/lib/cta";
import { Link } from "@/i18n/routing";
import type { Locale } from "@/content/types";

export function CtaSection({
  title,
  subtitle,
  findLabel,
  startLabel,
  locale,
}: {
  title: string;
  subtitle: string;
  findLabel: string;
  startLabel: string;
  locale: Locale;
}) {
  return (
    <section className="mx-auto max-w-7xl px-margin-mobile py-2xl md:px-margin-desktop">
      <div className="relative space-y-8 overflow-hidden rounded-3xl bg-primary p-12 text-center md:p-20">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-primary-container/40 via-transparent to-transparent opacity-40" />
        <h2 className="relative z-10 font-headline text-4xl text-white md:text-5xl">{title}</h2>
        <p className="relative z-10 mx-auto max-w-2xl text-lg text-primary-fixed opacity-90">
          {subtitle}
        </p>
        <div className="relative z-10 flex flex-wrap justify-center gap-6">
          <Link href="/doctors">
            <Button size="lg" className="bg-white text-primary hover:bg-white/90">
              {findLabel}
            </Button>
          </Link>
          <a href={buildAppCtaUrl("register", { locale, page: "home-cta" })}>
            <Button size="lg" variant="secondary">
              {startLabel}
            </Button>
          </a>
        </div>
      </div>
    </section>
  );
}
