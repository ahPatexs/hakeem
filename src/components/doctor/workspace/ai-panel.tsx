"use client";

import type { ReactNode } from "react";
import { useState } from "react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/routing";
import { Bot } from "lucide-react";
import { DraftPanel } from "@/components/ai/doctor/draft-panel";
import { RxSuggestPanel } from "@/components/ai/doctor/rx-suggest-panel";
import { ClinicalAssistChat } from "@/components/ai/doctor/clinical-assist-chat";
import { AiAssistantShell } from "@/components/platform/ai";

type AiMode = "MEDICAL" | "DOCUMENTATION" | "PRESCRIPTION";

function PatientContextNeeded({
  needAppointment = false,
  fallback,
}: {
  needAppointment?: boolean;
  fallback?: React.ReactNode;
}) {
  const t = useTranslations("doctor.ai");
  if (fallback) return <>{fallback}</>;
  return (
    <div className="rounded-2xl border border-outline-variant/20 bg-surface-container-low p-4 text-sm text-on-surface-variant">
      <p>{needAppointment ? t("needPatientAndAppointment") : t("needPatientContext")}</p>
      <Link
        href="/doctor/patients"
        className="mt-3 inline-block font-semibold text-med-green hover:underline"
      >
        {t("openPatients")}
      </Link>
    </div>
  );
}

/**
 * Doctor workspace / AI hub panel — Module 7 surfaces only (no legacy sendAiMessage).
 */
export function AiPanel({
  patientUserId,
  appointmentId,
  onInsert,
  defaultMode = "MEDICAL",
  compact = false,
  missingPatientSlot,
  missingVisitSlot,
  hideTitle = false,
}: {
  patientUserId?: string;
  appointmentId?: string;
  /** When provided, MEDICAL mode assistant messages get Insert into the SOAP editor. */
  onInsert?: (text: string) => void;
  defaultMode?: AiMode;
  compact?: boolean;
  missingPatientSlot?: ReactNode;
  missingVisitSlot?: ReactNode;
  hideTitle?: boolean;
}) {
  const t = useTranslations("doctor.ai");
  const [mode, setMode] = useState<AiMode>(defaultMode);

  const modes: { key: AiMode; label: string }[] = [
    { key: "MEDICAL", label: t("modeMedical") },
    { key: "DOCUMENTATION", label: t("modeDocumentation") },
    { key: "PRESCRIPTION", label: t("modePrescription") },
  ];

  const feature =
    mode === "PRESCRIPTION"
      ? "doctorPrescription"
      : mode === "DOCUMENTATION"
        ? "doctorDocumentation"
        : "doctorDocumentation";

  return (
    <AiAssistantShell feature={feature} className="flex h-full flex-col gap-3">
      {!hideTitle ? (
        <div className="flex items-center gap-2">
          <Bot className="h-5 w-5 text-med-green" aria-hidden />
          <h3 className="font-headline text-lg text-primary">{t("title")}</h3>
        </div>
      ) : null}

      <div className="flex flex-wrap gap-1" role="tablist" aria-label={t("title")}>
        {modes.map((m) => (
          <button
            key={m.key}
            type="button"
            role="tab"
            aria-selected={mode === m.key}
            onClick={() => setMode(m.key)}
            className={
              mode === m.key
                ? "rounded-full bg-primary px-3 py-1 text-xs font-medium text-on-primary"
                : "rounded-full border border-outline-variant/30 px-3 py-1 text-xs font-medium text-on-surface-variant hover:bg-surface-container-high"
            }
          >
            {m.label}
          </button>
        ))}
      </div>

      {mode === "DOCUMENTATION" ? (
        patientUserId && appointmentId ? (
          <DraftPanel patientUserId={patientUserId} appointmentId={appointmentId} />
        ) : patientUserId ? (
          <PatientContextNeeded needAppointment fallback={missingVisitSlot} />
        ) : (
          <PatientContextNeeded fallback={missingPatientSlot} />
        )
      ) : null}

      {mode === "PRESCRIPTION" ? (
        patientUserId ? (
          <RxSuggestPanel patientUserId={patientUserId} />
        ) : (
          <PatientContextNeeded fallback={missingPatientSlot} />
        )
      ) : null}

      {mode === "MEDICAL" ? (
        patientUserId ? (
          <ClinicalAssistChat
            patientUserId={patientUserId}
            appointmentId={appointmentId}
            onInsert={onInsert}
            compact={compact}
          />
        ) : (
          <PatientContextNeeded fallback={missingPatientSlot} />
        )
      ) : null}
    </AiAssistantShell>
  );
}
