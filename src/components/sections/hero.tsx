import Image from "next/image";
import { getTranslations } from "next-intl/server";
import { Button } from "@/components/ui/button";
import { buildAppCtaUrl } from "@/lib/cta";
import type { Locale } from "@/content/types";

const HERO_IMAGE =
  "https://lh3.googleusercontent.com/aida-public/AB6AXuC-FaBB_R_vQ35LI2GmdGHv-JoNpVCkaXUk1H9444Bar9R-RH6kRnVk5VuHenIG6r0ZjH6GbMh9WcX8SMLFK4Jo9NA6qjvtKCgHDlokMMfsbiwPcxu_1mwx19f0IKileoWJ4ILC-op5_Er-jYzMRENZXTCOwH2VwR9XVZofKa-sg3A7UpFqzbokleYr1aU6sVpccsgCkWWPGzYOIL3IG6ZiRDKkawc9Owl3bEeYFc6XYrOI5P7U8nDvlzxYv540ggYcw1X3qoYlzVk";

export async function Hero({ locale }: { locale: Locale }) {
  const t = await getTranslations("home");
  const workflow = [t("workflow1"), t("workflow2"), t("workflow3"), t("workflow4"), t("workflow5")];

  return (
    <section className="relative flex min-h-[90vh] items-center overflow-hidden bg-background">
      <div className="absolute inset-0 z-0">
        <Image
          src={HERO_IMAGE}
          alt={t("heroAlt")}
          fill
          priority
          fetchPriority="high"
          className="object-cover object-right"
          sizes="100vw"
        />
        <div className="absolute inset-0 w-1/2 bg-gradient-to-r from-white via-white/80 to-transparent" />
      </div>

      <div className="relative z-10 mx-auto grid w-full max-w-7xl items-center gap-8 px-margin-mobile pt-20 md:px-margin-desktop lg:grid-cols-12">
        <div className="space-y-8 py-12 lg:col-span-5 lg:pe-12">
          <div className="inline-flex items-center gap-2 rounded-full border border-primary/10 bg-primary/5 px-3 py-1 text-xs font-semibold tracking-wider text-primary">
            <span className="inline-block h-2 w-2 animate-pulse rounded-full bg-med-green" aria-hidden />
            {t("badge")}
          </div>
          <h1 className="font-headline text-3xl leading-[1.2] text-primary md:text-4xl lg:text-5xl">
            {t("headlineBefore")} <br />
            <span className="mt-1 block text-2xl font-semibold text-med-green md:text-3xl lg:text-4xl">
              {t("headlineAccent")}
            </span>
          </h1>
          <p className="max-w-lg text-lg leading-relaxed text-on-surface-variant">{t("subhead")}</p>
          <div className="flex flex-wrap gap-4 pt-2">
            <a href={buildAppCtaUrl("book", { locale, page: "home-hero" })}>
              <Button size="lg">{t("ctaPrimary")}</Button>
            </a>
            <a href={`/${locale}/ai-assistant`}>
              <Button size="lg" variant="outline">
                {t("ctaSecondary")}
              </Button>
            </a>
          </div>
        </div>

        <div className="relative hidden flex-col items-center justify-center gap-8 xl:col-span-2 xl:flex">
          <div className="relative flex flex-col items-center gap-6">
            <div className="absolute bottom-0 top-0 w-px bg-gradient-to-b from-med-green/0 via-med-green/40 to-med-green/0 shadow-[0_0_15px_rgba(0,168,132,0.5)]" />
            {workflow.map((label) => (
              <div
                key={label}
                className="glass-card relative z-10 rounded-full border-white/40 px-3 py-1.5 text-[9px] font-bold text-primary shadow-sm backdrop-blur-md"
              >
                {label}
              </div>
            ))}
          </div>
        </div>

        <div className="flex justify-center py-12 lg:col-span-7 lg:justify-end xl:col-span-5">
          <div className="glass-card floating-ui w-full max-w-md origin-right scale-90 rounded-[24px] border-white/80 p-6 shadow-2xl xl:scale-75">
            <div className="mb-6 flex items-center justify-between border-b border-on-surface/5 pb-4">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-med-green text-white">
                  <span aria-hidden>✦</span>
                </div>
                <div>
                  <h3 className="font-headline text-sm text-primary">{t("aiPanelTitle")}</h3>
                  <p className="flex items-center gap-1 text-[10px] text-on-surface-variant">
                    <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-red-500" />
                    {t("aiPanelStatus")}
                  </p>
                </div>
              </div>
            </div>
            <div className="space-y-4">
              <div className="rounded-xl border border-white/50 bg-white/40 p-3">
                <p className="mb-2 text-[10px] font-bold uppercase tracking-wider text-on-surface-variant">
                  {t("liveTranscript")}
                </p>
                <p className="text-[11px] italic leading-relaxed text-on-surface">
                  {t("transcriptSample")}
                </p>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-xl border border-white/50 bg-white/40 p-3">
                  <p className="mb-2 text-[10px] font-bold uppercase tracking-wider text-on-surface-variant">
                    {t("symptoms")}
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    <span className="rounded-full bg-med-green/10 px-2 py-0.5 text-[9px] font-bold text-med-green">
                      {t("symptom1")}
                    </span>
                    <span className="rounded-full bg-med-green/10 px-2 py-0.5 text-[9px] font-bold text-med-green">
                      {t("symptom2")}
                    </span>
                  </div>
                </div>
                <div className="rounded-xl border border-white/50 bg-white/40 p-3">
                  <p className="mb-2 text-[10px] font-bold uppercase tracking-wider text-on-surface-variant">
                    {t("diagnosis")}
                  </p>
                  <p className="mb-1 text-[10px] font-bold text-primary">{t("diagnosisLabel")}</p>
                  <div className="h-1 w-full overflow-hidden rounded-full bg-surface-container">
                    <div className="h-full w-[82%] bg-primary" />
                  </div>
                  <p className="mt-1 text-right text-[8px] font-bold text-primary">{t("diagnosisMatch")}</p>
                </div>
              </div>
              <div className="rounded-xl border border-white/50 bg-white/40 p-3">
                <p className="mb-2 text-[10px] font-bold uppercase tracking-wider text-on-surface-variant">
                  {t("suggestedMeds")}
                </p>
                <div className="flex items-center justify-between text-[11px]">
                  <span className="font-medium">{t("medName")}</span>
                  <span className="text-on-surface-variant">{t("medDose")}</span>
                </div>
              </div>
              <div className="rounded-xl border border-primary/10 bg-primary/5 p-3">
                <p className="mb-2 text-[10px] font-bold uppercase tracking-wider text-primary">
                  {t("soapPreview")}
                </p>
                <div className="space-y-1">
                  <div className="h-1.5 w-full rounded-full bg-primary/10" />
                  <div className="h-1.5 w-3/4 rounded-full bg-primary/10" />
                </div>
              </div>
              <Button className="w-full rounded-xl text-xs font-bold">{t("saveEmr")}</Button>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
