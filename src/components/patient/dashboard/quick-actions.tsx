"use client";

import { CalendarPlus, Bot, FileText, Pill, Stethoscope, User } from "lucide-react";
import { useTranslations } from "next-intl";
import { ActionTiles } from "@/components/portal/action-tiles";

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
    <section className="space-y-4">
      <h2 className="font-headline text-lg text-primary">{t("title")}</h2>
      <ActionTiles
        actions={ACTIONS.map(({ href, icon, key }) => ({
          href,
          icon,
          label: t(key),
        }))}
      />
    </section>
  );
}
