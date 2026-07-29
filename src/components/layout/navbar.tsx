import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/routing";
import { Button } from "@/components/ui/button";
import { LocaleSwitcher } from "@/components/layout/locale-switcher";
import { MobileNav } from "@/components/layout/mobile-nav";
import { buildAppCtaUrl } from "@/lib/cta";
import type { Locale } from "@/content/types";

const links = [
  { href: "/", key: "home" as const },
  { href: "/services", key: "services" as const },
  { href: "/doctors", key: "doctors" as const },
  { href: "/ai-assistant", key: "ai" as const },
];

export async function Navbar({ locale }: { locale: Locale }) {
  const t = await getTranslations("nav");

  return (
    <header className="fixed top-0 z-50 w-full border-b border-outline-variant/30 bg-white/90 shadow-sm backdrop-blur-md">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-margin-mobile py-4 md:px-margin-desktop">
        <Link href="/" className="flex items-center gap-3" aria-label="Hakeem">
          {/* eslint-disable-next-line @next/next/no-img-element -- local transparent SVG logo */}
          <img src="/images/logo.svg" alt="Hakeem" width={140} height={40} className="h-10 w-auto" />
        </Link>

        <nav className="hidden items-center gap-8 md:flex" aria-label="Primary">
          {links.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="font-medium text-on-surface-variant transition-colors hover:text-primary"
            >
              {t(link.key)}
            </Link>
          ))}
        </nav>

        <div className="flex items-center gap-2 md:gap-4">
          <LocaleSwitcher />
          <a
            href={buildAppCtaUrl("login", { locale, page: "nav" })}
            className="hidden rounded-lg px-4 py-2 font-medium text-primary transition-all hover:bg-primary-fixed/30 md:inline-block"
          >
            {t("login")}
          </a>
          <a href={buildAppCtaUrl("register", { locale, page: "nav" })} className="hidden md:inline-block">
            <Button className="rounded-full px-6">{t("getStarted")}</Button>
          </a>
          <MobileNav locale={locale} />
        </div>
      </div>
    </header>
  );
}
