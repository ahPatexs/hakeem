"use client";

import { useState } from "react";
import { Link } from "@/i18n/routing";
import { useLocale, useTranslations } from "next-intl";
import { PortalNav } from "@/components/patient/shell/portal-nav";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { CalendarPlus, LogOut, Menu } from "lucide-react";
import { cn } from "@/lib/utils";
import { logoutAction } from "@/actions/auth/login";

function BrandBlock({ onNavigate }: { onNavigate?: () => void }) {
  const t = useTranslations("patient.shell");
  return (
    <div className="border-b border-outline-variant/20 px-5 py-6">
      <Link href="/patient" className="block" onClick={onNavigate}>
        <span className="font-headline text-xl font-bold leading-none text-primary">Hakeem</span>
        <span className="mt-1.5 block text-[10px] font-semibold uppercase tracking-wider text-on-surface-variant">
          {t("portalLabel")}
        </span>
      </Link>
    </div>
  );
}

function SidebarFooter({ onNavigate }: { onNavigate?: () => void }) {
  const t = useTranslations("patient.shell");
  const locale = useLocale();
  return (
    <div className="space-y-2 border-t border-outline-variant/20 p-4">
      <Button asChild className="w-full rounded-xl">
        <Link href="/patient/appointments/book" onClick={onNavigate}>
          <CalendarPlus className="h-4 w-4" aria-hidden />
          {t("bookCta")}
        </Link>
      </Button>
      <form action={logoutAction.bind(null, locale)}>
        <Button type="submit" variant="outline" className="w-full rounded-xl">
          <LogOut className="h-4 w-4" aria-hidden />
          {t("signOut")}
        </Button>
      </form>
    </div>
  );
}

export function PortalSidebar({ className }: { className?: string }) {
  return (
    <aside className={cn("portal-sidebar", className)}>
      <BrandBlock />
      <div className="flex-1 overflow-y-auto py-3">
        <PortalNav />
      </div>
      <SidebarFooter />
    </aside>
  );
}

export function PortalMobileNav() {
  const [open, setOpen] = useState(false);
  const t = useTranslations("patient.shell");

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button variant="ghost" size="icon" className="rounded-full lg:hidden" aria-label={t("openMenu")}>
          <Menu className="h-5 w-5 text-primary" />
        </Button>
      </SheetTrigger>
      <SheetContent className="bg-surface-container-lowest p-0">
        <BrandBlock onNavigate={() => setOpen(false)} />
        <div className="py-3">
          <PortalNav onNavigate={() => setOpen(false)} />
        </div>
        <SidebarFooter onNavigate={() => setOpen(false)} />
      </SheetContent>
    </Sheet>
  );
}