import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/routing";
import { NewsletterForm } from "@/components/forms/newsletter-form";
import { Share2, Globe } from "lucide-react";

export async function Footer() {
  const t = await getTranslations("footer");

  return (
    <footer className="border-t border-outline-variant/20 bg-surface-container-high pb-10 pt-20">
      <div className="mx-auto mb-20 grid max-w-7xl grid-cols-2 gap-gutter px-margin-mobile md:grid-cols-4 md:px-margin-desktop">
        <div className="col-span-2 space-y-6 md:col-span-1">
          <div className="font-headline text-2xl font-bold text-primary">Hakeem</div>
          <p className="text-sm leading-relaxed text-on-surface-variant">{t("tagline")}</p>
          <div className="flex gap-4">
            <a
              href="#"
              aria-label="Share"
              className="flex h-10 w-10 items-center justify-center rounded-full bg-white text-primary shadow-sm transition-all hover:bg-primary hover:text-white"
            >
              <Share2 className="h-4 w-4" />
            </a>
            <a
              href="#"
              aria-label="Website"
              className="flex h-10 w-10 items-center justify-center rounded-full bg-white text-primary shadow-sm transition-all hover:bg-primary hover:text-white"
            >
              <Globe className="h-4 w-4" />
            </a>
          </div>
        </div>

        <div className="space-y-4">
          <h5 className="text-sm font-bold uppercase tracking-widest text-primary">{t("company")}</h5>
          <nav className="flex flex-col gap-2">
            <Link href="/about" className="text-sm text-on-surface-variant hover:text-med-green">
              {t("about")}
            </Link>
            <Link href="/contact" className="text-sm text-on-surface-variant hover:text-med-green">
              {t("contact")}
            </Link>
            <Link href="/blog" className="text-sm text-on-surface-variant hover:text-med-green">
              {t("newsroom")}
            </Link>
          </nav>
        </div>

        <div className="space-y-4">
          <h5 className="text-sm font-bold uppercase tracking-widest text-primary">{t("legal")}</h5>
          <nav className="flex flex-col gap-2">
            <Link
              href="/privacy-policy"
              className="text-sm text-on-surface-variant hover:text-med-green"
            >
              {t("privacy")}
            </Link>
            <Link href="/terms" className="text-sm text-on-surface-variant hover:text-med-green">
              {t("terms")}
            </Link>
          </nav>
        </div>

        <div className="col-span-2 space-y-4 md:col-span-1">
          <h5 className="text-sm font-bold uppercase tracking-widest text-primary">
            {t("newsletter")}
          </h5>
          <p className="text-sm text-on-surface-variant">{t("newsletterHint")}</p>
          <NewsletterForm />
        </div>
      </div>

      <div className="mx-auto max-w-7xl border-t border-outline-variant/20 px-margin-mobile pt-8 text-center md:px-margin-desktop">
        <p className="text-sm text-on-surface-variant opacity-70">{t("copyright")}</p>
      </div>
    </footer>
  );
}
