import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/routing";

export async function Footer() {
  const t = await getTranslations("footer");

  return (
    <footer className="border-t border-outline-variant/20 bg-surface-container-high pb-10 pt-20">
      <div className="mx-auto mb-20 grid max-w-7xl grid-cols-2 gap-gutter px-margin-mobile md:grid-cols-4 md:px-margin-desktop">
        <div className="col-span-2 space-y-6 md:col-span-1">
          <div className="font-headline text-2xl font-bold text-primary">Hakeem</div>
          <p className="text-sm leading-relaxed text-on-surface-variant">{t("tagline")}</p>
          <p className="text-xs font-semibold uppercase tracking-wider text-med-green">{t("leapBadge")}</p>
        </div>

        <div className="space-y-4">
          <h5 className="text-sm font-bold uppercase tracking-widest text-primary">{t("company")}</h5>
          <nav className="flex flex-col gap-2">
            <Link href="/about" className="text-sm text-on-surface-variant hover:text-med-green">
              {t("about")}
            </Link>
            <Link href="/how-it-works" className="text-sm text-on-surface-variant hover:text-med-green">
              {t("howItWorks")}
            </Link>
            <Link href="/faq" className="text-sm text-on-surface-variant hover:text-med-green">
              {t("faq")}
            </Link>
            <Link href="/contact" className="text-sm text-on-surface-variant hover:text-med-green">
              {t("contact")}
            </Link>
            <Link href="/login" className="text-sm text-on-surface-variant hover:text-med-green">
              {t("login")}
            </Link>
            <Link href="/register" className="text-sm text-on-surface-variant hover:text-med-green">
              {t("register")}
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
            {t("leapVisit")}
          </h5>
          <p className="text-sm text-on-surface-variant">{t("leapVisitHint")}</p>
          <Link
            href="/login"
            className="inline-flex rounded-full bg-primary px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-primary/90"
          >
            {t("leapDemoLogin")}
          </Link>
        </div>
      </div>

      <div className="mx-auto max-w-7xl border-t border-outline-variant/20 px-margin-mobile pt-8 text-center md:px-margin-desktop">
        <p className="text-sm text-on-surface-variant opacity-70">{t("copyright")}</p>
      </div>
    </footer>
  );
}
