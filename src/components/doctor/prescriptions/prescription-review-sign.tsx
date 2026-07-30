"use client";

import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "@/i18n/routing";
import { Button } from "@/components/ui/button";
import { signPrescription } from "@/actions/doctor/prescriptions";
import { useOfflineActionGuard } from "@/components/doctor/workspace/offline-guard";
import { AlertTriangle } from "lucide-react";
import type { SafetyCheckResult } from "@/ports/safety-check";

type RxLine = {
  id: string;
  medicationName: string;
  dose: string | null;
  frequency: string | null;
  instructions: string | null;
};

export function PrescriptionReviewSign({
  prescriptionId,
  expectedVersion,
  lines,
  instructions,
  allergies,
  safety,
  aiAssisted,
}: {
  prescriptionId: string;
  expectedVersion: number;
  lines: RxLine[];
  instructions: string | null;
  allergies: string[] | null;
  safety: SafetyCheckResult;
  aiAssisted: boolean;
}) {
  const t = useTranslations("doctor.rx");
  const tc = useTranslations("doctor.common");
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [password, setPassword] = useState("");
  const [interactionAck, setInteractionAck] = useState(false);
  const [allergyDataUnavailableAck, setAllergyDataUnavailableAck] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const { disabled: offlineDisabled } = useOfflineActionGuard();

  const allergyBlocked = safety.allergyMatches.length > 0;
  const needsInteractionAck = safety.highSeverityInteractions.length > 0;
  const needsAllergyUnknownAck = safety.allergyDataUnavailable;

  function sign() {
    setError(null);
    startTransition(async () => {
      const res = await signPrescription({
        prescriptionId,
        expectedVersion,
        password,
        interactionAck,
        allergyDataUnavailableAck,
      });
      if (!res.ok) {
        if (res.code === "SIGN_REQUIREMENTS") setError(t("signFailed"));
        else if (res.code === "ALLERGY_BLOCK") setError(t("allergyBlockTitle"));
        else if (res.code === "SAFETY_ACK_REQUIRED") setError(t("partialCheck"));
        else if (res.code === "CONFLICT") setError(tc("conflict"));
        else setError(t("signFailed"));
        return;
      }
      setSuccess(true);
      router.push("/doctor/prescriptions");
      router.refresh();
    });
  }

  return (
    <div className="space-y-6">
      {aiAssisted ? (
        <p className="rounded-2xl border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          {t("aiDraftNote")}
        </p>
      ) : null}

      {/* Allergies */}
      <div
        className={
          allergies === null
            ? "flex items-start gap-2 rounded-2xl border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-900"
            : allergies.length > 0
              ? "flex items-start gap-2 rounded-2xl border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-900"
              : "flex items-start gap-2 rounded-2xl border border-outline-variant/30 bg-surface-container-low px-4 py-3 text-sm text-on-surface-variant"
        }
      >
        <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
        <div>
          <p className="font-medium">{t("patient")}</p>
          <p>
            {allergies === null
              ? t("allergyUnknownBody")
              : allergies.length > 0
                ? allergies.join(", ")
                : "—"}
          </p>
        </div>
      </div>

      {/* Safety warnings */}
      {allergyBlocked ? (
        <div className="rounded-2xl border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-900" role="alert">
          <p className="font-medium">{t("allergyBlockTitle")}</p>
          <p className="mt-1">{t("allergyBlockBody", { items: safety.allergyMatches.join(", ") })}</p>
        </div>
      ) : null}

      {needsAllergyUnknownAck && !allergyBlocked ? (
        <div className="rounded-2xl border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          <p className="font-medium">{t("allergyUnknownTitle")}</p>
          <p className="mt-1">{t("allergyUnknownBody")}</p>
          <label className="mt-3 flex items-center gap-2">
            <input
              type="checkbox"
              checked={allergyDataUnavailableAck}
              onChange={(e) => setAllergyDataUnavailableAck(e.target.checked)}
              className="h-4 w-4 rounded"
            />
            {t("allergyUnknownAck")}
          </label>
        </div>
      ) : null}

      {needsInteractionAck ? (
        <div className="rounded-2xl border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          <p className="font-medium">{t("interactionTitle")}</p>
          <ul className="mt-2 list-inside list-disc">
            {safety.highSeverityInteractions.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
          <label className="mt-3 flex items-center gap-2">
            <input
              type="checkbox"
              checked={interactionAck}
              onChange={(e) => setInteractionAck(e.target.checked)}
              className="h-4 w-4 rounded"
            />
            {t("interactionAck")}
          </label>
        </div>
      ) : null}

      {safety.partial ? (
        <p className="text-sm text-amber-800">{t("partialCheck")}</p>
      ) : null}

      {/* Medication lines */}
      <ul className="space-y-3">
        {lines.map((line, i) => (
          <li
            key={line.id}
            className="glass-card rounded-2xl border border-outline-variant/20 bg-surface-container-low p-4"
          >
            <p className="font-medium text-primary">
              {i + 1}. {line.medicationName}
            </p>
            {(line.dose || line.frequency) && (
              <p className="mt-1 text-sm text-on-surface-variant">
                {[line.dose, line.frequency].filter(Boolean).join(" · ")}
              </p>
            )}
            {line.instructions ? (
              <p className="mt-1 text-sm text-on-surface-variant">{line.instructions}</p>
            ) : null}
          </li>
        ))}
      </ul>

      {instructions ? (
        <div className="glass-card rounded-2xl border border-outline-variant/20 bg-surface-container-low p-4">
          <p className="text-xs font-medium uppercase text-on-surface-variant">{t("generalInstructions")}</p>
          <p className="mt-1 text-sm text-primary">{instructions}</p>
        </div>
      ) : null}

      {!allergyBlocked ? (
        <div className="glass-card space-y-4 rounded-2xl border border-outline-variant/20 bg-surface-container-low p-5">
          <div>
            <h3 className="font-headline text-lg text-primary">{t("signTitle")}</h3>
            <p className="mt-1 text-sm text-on-surface-variant">{t("signHint")}</p>
          </div>
          <label className="block space-y-1">
            <span className="text-sm font-medium text-on-surface-variant">{t("password")}</span>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="current-password"
              className="h-10 w-full max-w-sm rounded-xl border border-outline-variant/30 bg-surface-container-low px-3 text-sm outline-none focus:border-primary"
            />
          </label>
          {error ? (
            <p className="text-sm text-red-600" role="alert">
              {error}
            </p>
          ) : null}
          {success ? <p className="text-sm text-med-green">{t("signed")}</p> : null}
          <Button
            type="button"
            disabled={
              pending ||
              offlineDisabled ||
              !password ||
              (needsInteractionAck && !interactionAck) ||
              (needsAllergyUnknownAck && !allergyDataUnavailableAck)
            }
            onClick={sign}
          >
            {pending ? t("signing") : t("sign")}
          </Button>
        </div>
      ) : null}
    </div>
  );
}
