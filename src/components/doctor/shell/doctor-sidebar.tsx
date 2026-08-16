"use client";

import { useState } from "react";
import { Link } from "@/i18n/routing";
import { useLocale, useTranslations } from "next-intl";
import { DoctorNav } from "@/components/doctor/shell/doctor-nav";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { LogOut, Menu, Plus } from "lucide-react";
import { cn } from "@/lib/utils";
import { BrandMark } from "@/components/portal/brand-mark";
import { logoutAction } from "@/actions/auth/login";

function BrandBlock({ onNavigate }: { onNavigate?: () => void }) {
  const t = useTranslations("doctor.shell");
  return (
    <div className="px-4 pb-4 pt-6">
      <Link href="/doctor" className="flex items-center gap-3" onClick={onNavigate}>
        <BrandMark />
        <span className="min-w-0">
          <span className="block font-headline text-lg font-bold leading-none text-primary">Hakeem</span>
          <span className="mt-1 block text-[10px] font-semibold uppercase tracking-wider text-on-surface-variant">
            {t("portalLabel")}
          </span>
        </span>
      </Link>
    </div>
  );
}

function SidebarFooter({ onNavigate }: { onNavigate?: () => void }) {
  const t = useTranslations("doctor.shell");
  const locale = useLocale();
  return (
    <div className="space-y-2 border-t border-outline-variant/20 p-4">
      <Button asChild className="w-full rounded-full">
        <Link href="/doctor/queue" onClick={onNavigate}>
          <Plus className="h-4 w-4" aria-hidden />
          {t("newConsultCta")}
        </Link>
      </Button>
      <form action={logoutAction.bind(null, locale)}>
        <Button type="submit" variant="outline" className="w-full rounded-full">
          <LogOut className="h-4 w-4" aria-hidden />
          {t("signOut")}
        </Button>
      </form>
    </div>
  );
}

export function DoctorSidebar({ className }: { className?: string }) {
  return (
    <aside className={cn("portal-sidebar", className)}>
      <BrandBlock />
      <div className="flex-1 overflow-y-auto py-3">
        <DoctorNav />
      </div>
      <SidebarFooter />
    </aside>
  );
}

export function DoctorMobileNav() {
  const [open, setOpen] = useState(false);
  const t = useTranslations("doctor.shell");

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
          <DoctorNav onNavigate={() => setOpen(false)} />
        </div>
        <SidebarFooter onNavigate={() => setOpen(false)} />
      </SheetContent>
    </Sheet>
  );
}
