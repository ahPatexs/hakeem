"use client";

import { useState } from "react";
import { Link } from "@/i18n/routing";
import { PortalNav } from "@/components/patient/shell/portal-nav";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Menu } from "lucide-react";
import { cn } from "@/lib/utils";

export function PortalSidebar({ className }: { className?: string }) {
  return (
    <aside
      className={cn(
        "hidden w-64 shrink-0 flex-col border-e border-outline-variant/20 bg-surface-container-low lg:flex",
        className,
      )}
    >
      <div className="border-b border-outline-variant/20 px-5 py-6">
        <Link href="/patient" className="font-headline text-xl font-bold text-primary">
          Hakeem
        </Link>
        <p className="mt-1 text-xs font-medium text-med-green">Patient Portal</p>
      </div>
      <div className="flex-1 overflow-y-auto px-3 py-4">
        <PortalNav />
      </div>
    </aside>
  );
}

export function PortalMobileNav() {
  const [open, setOpen] = useState(false);

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button variant="ghost" size="icon" className="lg:hidden" aria-label="Open menu">
          <Menu className="h-5 w-5 text-primary" />
        </Button>
      </SheetTrigger>
      <SheetContent className="bg-surface-container-low p-0">
        <div className="border-b border-outline-variant/20 px-6 py-5">
          <Link href="/patient" className="font-headline text-xl font-bold text-primary" onClick={() => setOpen(false)}>
            Hakeem
          </Link>
          <p className="mt-1 text-xs font-medium text-med-green">Patient Portal</p>
        </div>
        <div className="px-3 py-4">
          <PortalNav onNavigate={() => setOpen(false)} />
        </div>
      </SheetContent>
    </Sheet>
  );
}
