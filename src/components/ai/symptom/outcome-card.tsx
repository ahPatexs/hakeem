"use client";

import type { ReactNode } from "react";
import { useTranslations } from "next-intl";
import { cn } from "@/lib/utils";
import { EmergencyBanner } from "@/components/ai/chat/emergency-banner";
import type { SymptomOutcomeDto } from "@/lib/ai/symptom";

const OUTCOME_I18N: Record<SymptomOutcomeDto["kind"], string> = {
  SELF_CARE: "outcomeSelfCare",
  SEE_DOCTOR: "outcomeSeeDoctor",
  URGENT: "outcomeUrgent",
  EMERGENCY: "outcomeEmergency",
};

export function OutcomeCard({
  outcome,
  className,
  attachSlot,
}: {
  outcome: SymptomOutcomeDto;
  className?: string;
  attachSlot?: ReactNode;
}) {
  const t = useTranslations("ai.symptom");
  const isEmergency = outcome.kind === "EMERGENCY";

  return (
    <div
      className={cn(
        "space-y-3 rounded-2xl border border-outline-variant/20 bg-surface-container-low p-5",
        className,
      )}
      data-ai="symptom-outcome"
    >
      {isEmergency ? <EmergencyBanner text={outcome.rationale} /> : null}

      <div>
        <p className="text-xs font-medium uppercase tracking-wide text-on-surface-variant">
          {t("outcomeLabel")}
        </p>
        <h2 className="mt-1 font-headline text-xl text-primary">
          {t(OUTCOME_I18N[outcome.kind])}
        </h2>
      </div>

      {!isEmergency ? (
        <p className="text-sm text-on-surface">{outcome.rationale}</p>
      ) : null}

      <p
        className="rounded-xl border border-outline-variant/20 bg-surface-container px-3 py-2 text-xs text-on-surface-variant"
        data-ai="symptom-disclaimer"
      >
        {outcome.disclaimer || t("disclaimer")}
      </p>

      {attachSlot}
    </div>
  );
}
