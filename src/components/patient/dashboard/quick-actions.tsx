"use client";

import { CalendarPlus, Bot, FileText, Pill, Stethoscope, User } from "lucide-react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/routing";
import { Button } from "@/components/ui/button";

const ACTIONS = [
  { href: "/patient/appointments/book", icon: CalendarPlus, key: "book" as const },
  { href: "/patient/doctors", icon: Stethoscope, key: "findDoctor" as const },
  { href: "/patient/ai", icon: Bot, key: "aiChat" as const },
  { href: "/patient/records", icon: FileText, key: "records" as const },
  { href: "/patient/prescriptions", icon: Pill, key: "prescriptions" as const },
  { href: "/patient/profile", icon: User, key: "profile" as const },
];

export function QuickActions() {
  const t = useTranslations("patient.dashboard.quickActions");

  return (
    <section className="glass-card rounded-2xl border border-outline-variant/20 bg-surface-container-low p-5">
      <h2 className="font-headline text-lg text-primary">{t("title")}</h2>
      <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        {ACTIONS.map(({ href, icon: Icon, key }) => (
          <Button key={key} asChild variant="outline" className="h-auto flex-col gap-2 py-4">
            <Link href={href}>
              <Icon className="h-5 w-5" aria-hidden />
              <span className="text-xs">{t(key)}</span>
            </Link>
          </Button>
        ))}
      </div>
    </section>
  );
}
