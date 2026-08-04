"use client";

import type { ReactNode } from "react";
import { useTranslations } from "next-intl";
import { cn } from "@/lib/utils";

type Feature = "patient" | "doctorDocumentation" | "doctorPrescription";

type Props = {
  feature: Feature;
  children: ReactNode;
  className?: string;
};

export function AiAssistantShell({ feature, children, className }: Props) {
  const t = useTranslations("platform.ai");
  return (
    <section className={cn("space-y-3", className)} data-platform-ai={feature}>
      <p className="rounded-xl border border-outline-variant/20 bg-surface-container-low px-3 py-2 text-xs text-on-surface-variant">
        {t("disclaimer")}
      </p>
      {children}
    </section>
  );
}
