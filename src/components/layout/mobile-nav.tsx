"use client";

import { useTranslations } from "next-intl";
import { Menu } from "lucide-react";
import { Link } from "@/i18n/routing";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { buildAppCtaUrl } from "@/lib/cta";
import type { Locale } from "@/content/types";

const links = [
  { href: "/", key: "home" as const },
  { href: "/services", key: "services" as const },
  { href: "/doctors", key: "doctors" as const },
  { href: "/ai-assistant", key: "ai" as const },
  { href: "/about", key: "about" as const },
];

export function MobileNav({ locale }: { locale: Locale }) {
  const t = useTranslations("nav");

  return (
    <Sheet>
      <SheetTrigger asChild>
        <Button variant="ghost" size="icon" className="md:hidden" aria-label={t("menu")}>
          <Menu className="h-6 w-6 text-primary" />
        </Button>
      </SheetTrigger>
      <SheetContent>
        <nav className="mt-10 flex flex-col gap-4">
          {links.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="text-lg font-semibold text-primary"
            >
              {t(link.key)}
            </Link>
          ))}
          <a href={buildAppCtaUrl("login", { locale, page: "nav" })} className="text-primary">
            {t("login")}
          </a>
          <a href={buildAppCtaUrl("register", { locale, page: "nav" })}>
            <Button className="w-full rounded-full">{t("getStarted")}</Button>
          </a>
        </nav>
      </SheetContent>
    </Sheet>
  );
}
