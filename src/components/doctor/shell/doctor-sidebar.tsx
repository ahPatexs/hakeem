"use client";

import { useState } from "react";
import { Link } from "@/i18n/routing";
import { useTranslations } from "next-intl";
import { DoctorNav } from "@/components/doctor/shell/doctor-nav";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Menu, Plus } from "lucide-react";
import { cn } from "@/lib/utils";

function BrandBlock({ onNavigate }: { onNavigate?: () => void }) {
  const t = useTranslations("doctor.shell");
  return (
    <div className="border-b border-outline-variant/20 px-5 py-6">
      <Link href="/doctor" className="block" onClick={onNavigate}>
        <span className="font-headline text-xl font-bold leading-none text-primary">Hakeem</span>
        <span className="mt-1.5 block text-[10px] font-semibold uppercase tracking-wider text-on-surface-variant">
          {t("portalLabel")}
        </span>
      </Link>
    </div>
  );
}

export function DoctorSidebar({ className }: { className?: string }) {
  const t = useTranslations("doctor.shell");
  return (
    <aside className={cn("portal-sidebar", className)}>
      <BrandBlock />
      <div className="flex-1 overflow-y-auto py-3">
        <DoctorNav />
      </div>
      <div className="border-t border-outline-variant/20 p-4">
        <Button asChild className="w-full rounded-xl">
          <Link href="/doctor/queue">
            <Plus className="h-4 w-4" aria-hidden />
            {t("newConsultCta")}
          </Link>
        </Button>
      </div>
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
        <div className="border-t border-outline-variant/20 p-4">
          <Button asChild className="w-full rounded-xl">
            <Link href="/doctor/queue" onClick={() => setOpen(false)}>
              <Plus className="h-4 w-4" aria-hidden />
              {t("newConsultCta")}
            </Link>
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}