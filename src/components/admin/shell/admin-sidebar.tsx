"use client";

import { useState } from "react";
import { Link } from "@/i18n/routing";
import { useTranslations } from "next-intl";
import { AdminNav } from "@/components/admin/shell/admin-nav";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Menu } from "lucide-react";
import { cn } from "@/lib/utils";
import { BrandMark } from "@/components/portal/brand-mark";

function BrandBlock({ onNavigate }: { onNavigate?: () => void }) {
  const t = useTranslations("admin.shell");
  return (
    <div className="px-4 pb-4 pt-6">
      <Link href="/admin" className="flex items-center gap-3" onClick={onNavigate}>
        <BrandMark />
        <span className="min-w-0">
          <span className="flex items-center gap-2">
            <span className="font-headline text-lg font-bold leading-none text-primary">Hakeem</span>
            <span className="rounded-md bg-primary px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-on-primary">
              {t("badge")}
            </span>
          </span>
          <span className="mt-1 block text-[10px] font-semibold uppercase tracking-wider text-on-surface-variant">
            {t("portalLabel")}
          </span>
        </span>
      </Link>
    </div>
  );
}

export function AdminSidebar({ className }: { className?: string }) {
  return (
    <aside className={cn("portal-sidebar", className)}>
      <BrandBlock />
      <div className="flex-1 overflow-y-auto py-3">
        <AdminNav />
      </div>
    </aside>
  );
}

export function AdminMobileNav() {
  const [open, setOpen] = useState(false);
  const t = useTranslations("admin.shell");

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
          <AdminNav onNavigate={() => setOpen(false)} />
        </div>
      </SheetContent>
    </Sheet>
  );
}
