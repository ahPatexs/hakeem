"use client";

import { Bot } from "lucide-react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/routing";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function AiShortcut({ className }: { className?: string }) {
  const t = useTranslations("patient.dashboard.ai");

  return (
    <section
      className={cn(
        "glass-card flex flex-col gap-4 rounded-3xl border border-outline-variant/20 bg-gradient-to-br from-primary/5 to-med-green/5 p-6 shadow-sm sm:flex-row sm:items-center sm:justify-between",
        className,
      )}
    >
      <div className="flex items-start gap-4">
        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-primary/10">
          <Bot className="h-6 w-6 text-primary" aria-hidden />
        </div>
        <div>
          <h2 className="font-headline text-lg text-primary">{t("title")}</h2>
          <p className="mt-1 text-sm text-on-surface-variant">{t("description")}</p>
        </div>
      </div>
      <Button asChild variant="soft" className="rounded-full">
        <Link href="/patient/ai">{t("cta")}</Link>
      </Button>
    </section>
  );
}
