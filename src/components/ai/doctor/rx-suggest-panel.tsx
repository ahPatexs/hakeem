"use client";

import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "@/i18n/routing";
import { Button } from "@/components/ui/button";
import { aiSuggestPrescription } from "@/actions/ai/clinical-support";
import { aiAcceptDraft, aiDiscardDraft } from "@/actions/ai/drafts";
import { AlertTriangle, Pill, Sparkles } from "lucide-react";

type RxConflict = {
  kind: "ALLERGY" | "INTERACTION";
  detail: string;
  evidence: string;
};

type RxSuggestion = {
  draftId: string;
  content: {
    lines: Array<{
      medicationName: string;
      dose?: string;
      frequency?: string;
      instructions?: string;
    }>;
    instructions?: string;
  };
  evidence: { chartCategories: string[]; kbSources: string[] };
  conflicts: RxConflict[];
};

export function RxSuggestPanel({
  patientUserId,
  readOnly = false,
}: {
  patientUserId: string;
  readOnly?: boolean;
}) {
  const t = useTranslations("ai.rx");
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [intent, setIntent] = useState("");
  const [suggestion, setSuggestion] = useState<RxSuggestion | null>(null);
  const [noSafeReason, setNoSafeReason] = useState<string | null>(null);
  const [error, setError] = useState<"unavailable" | "generic" | "forbidden" | null>(null);
  const [status, setStatus] = useState<"idle" | "accepted" | "discarded">("idle");

  function mapError(code: string) {
    if (code === "FORBIDDEN") {
      setError("forbidden");
    } else if (
      code === "DEPENDENCY_UNAVAILABLE" ||
      code === "BUDGET_EXHAUSTED" ||
      code === "RATE_LIMITED"
    ) {
      setError("unavailable");
    } else {
      setError("generic");
    }
  }

  function suggest() {
    if (readOnly || pending || !intent.trim()) return;
    setError(null);
    setNoSafeReason(null);
    setSuggestion(null);
    setStatus("idle");
    startTransition(async () => {
      const res = await aiSuggestPrescription({
        patientUserId,
        intent: intent.trim(),
      });
      if (!res.ok) {
        mapError(res.code);
        return;
      }
      if (res.data.noSafeSuggestion) {
        setNoSafeReason(res.data.reason);
        return;
      }
      setSuggestion({
        draftId: res.data.draftId,
        content: res.data.content,
        evidence: res.data.evidence,
        conflicts: res.data.conflicts,
      });
    });
  }

  function accept() {
    if (!suggestion || readOnly || pending) return;
    setError(null);
    startTransition(async () => {
      const res = await aiAcceptDraft({
        draftId: suggestion.draftId,
        edits: {
          lines: suggestion.content.lines,
          instructions: suggestion.content.instructions,
        },
      });
      if (!res.ok) {
        mapError(res.code);
        return;
      }
      setStatus("accepted");
      setSuggestion(null);
      router.push(`/doctor/prescriptions/${res.data.acceptedIntoId}`);
      router.refresh();
    });
  }

  function discard() {
    if (!suggestion || readOnly || pending) return;
    setError(null);
    startTransition(async () => {
      const res = await aiDiscardDraft({ draftId: suggestion.draftId });
      if (!res.ok) {
        mapError(res.code);
        return;
      }
      setStatus("discarded");
      setSuggestion(null);
    });
  }

  const evidenceLine = suggestion
    ? [
        suggestion.evidence.chartCategories.length
          ? `${t("evidenceChart")}: ${suggestion.evidence.chartCategories.join(", ")}`
          : null,
        suggestion.evidence.kbSources.length
          ? `${t("evidenceKb")}: ${suggestion.evidence.kbSources.slice(0, 3).join(", ")}`
          : null,
      ]
        .filter(Boolean)
        .join(" · ")
    : "";

  return (
    <section
      className="space-y-3 rounded-xl border border-outline-variant/20 bg-surface-container-low p-4"
      data-ai-rx-suggest
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-med-green" aria-hidden />
          <h3 className="font-headline text-base text-primary">{t("title")}</h3>
        </div>
        <span className="rounded-full bg-surface-container-high px-2.5 py-0.5 text-xs font-medium text-on-surface-variant">
          {t("aiAssistedLabel")}
        </span>
      </div>

      <p className="text-xs text-on-surface-variant">{t("subtitle")}</p>

      {!readOnly ? (
        <div className="space-y-2">
          <label className="block space-y-1">
            <span className="text-xs font-medium text-on-surface-variant">{t("intentLabel")}</span>
            <textarea
              value={intent}
              onChange={(e) => setIntent(e.target.value)}
              rows={2}
              placeholder={t("intentPlaceholder")}
              className="w-full rounded-lg border border-outline-variant/30 bg-surface px-3 py-2 text-sm text-primary outline-none focus:border-primary"
              aria-label={t("intentLabel")}
            />
          </label>
          <Button
            type="button"
            size="sm"
            variant="soft"
            disabled={pending || !intent.trim()}
            onClick={suggest}
          >
            <Pill className="me-1.5 h-3.5 w-3.5" aria-hidden />
            {t("suggest")}
          </Button>
        </div>
      ) : null}

      {pending ? <p className="text-xs text-on-surface-variant">{t("generating")}</p> : null}

      {error === "unavailable" ? (
        <p className="text-sm text-on-surface-variant" role="status">
          {t("unavailable")}
        </p>
      ) : null}
      {error === "forbidden" ? (
        <p className="text-sm text-red-600" role="alert">
          {t("forbidden")}
        </p>
      ) : null}
      {error === "generic" ? (
        <p className="text-sm text-red-600" role="alert">
          {t("error")}
        </p>
      ) : null}

      {noSafeReason ? (
        <p
          className="rounded-lg border border-amber-300 bg-amber-50 px-3 py-2 text-sm text-amber-950"
          role="status"
          data-ai-rx-no-safe
        >
          {t("noSafeSuggestion")}: {noSafeReason}
        </p>
      ) : null}

      {status === "accepted" ? (
        <p className="text-sm text-med-green" role="status">
          {t("accepted")}
        </p>
      ) : null}
      {status === "discarded" ? (
        <p className="text-sm text-on-surface-variant" role="status">
          {t("discarded")}
        </p>
      ) : null}

      {suggestion?.conflicts.length ? (
        <div
          className="space-y-2 rounded-lg border border-red-300 bg-red-50 px-3 py-2"
          role="alert"
          data-ai-rx-conflicts
        >
          <div className="flex items-center gap-2 text-sm font-medium text-red-800">
            <AlertTriangle className="h-4 w-4 shrink-0" aria-hidden />
            {t("conflictsTitle")}
          </div>
          <ul className="space-y-1.5">
            {suggestion.conflicts.map((c, i) => (
              <li key={`${c.kind}-${i}`} className="text-sm text-red-900">
                <span className="font-medium">
                  {c.kind === "ALLERGY" ? t("conflictAllergy") : t("conflictInteraction")}:
                </span>{" "}
                {c.detail}
                <span className="mt-0.5 block text-xs text-red-800/80">
                  {t("conflictEvidence")}: {c.evidence}
                </span>
              </li>
            ))}
          </ul>
          <p className="text-xs text-red-800/90">{t("conflictsBeforeAccept")}</p>
        </div>
      ) : null}

      {suggestion ? (
        <div className="space-y-2">
          {suggestion.content.lines.map((line, index) => (
            <div
              key={index}
              className="rounded-lg border border-outline-variant/25 bg-surface px-3 py-2 text-sm"
            >
              <p className="font-medium text-primary">{line.medicationName}</p>
              <p className="text-xs text-on-surface-variant">
                {[line.dose, line.frequency, line.instructions].filter(Boolean).join(" · ")}
              </p>
            </div>
          ))}
          {suggestion.content.instructions ? (
            <p className="text-xs text-on-surface-variant">{suggestion.content.instructions}</p>
          ) : null}
        </div>
      ) : null}

      {suggestion && evidenceLine ? (
        <p className="text-xs text-on-surface-variant">{evidenceLine}</p>
      ) : null}

      {suggestion ? (
        <div className="flex flex-wrap gap-2">
          <Button type="button" size="sm" disabled={pending || readOnly} onClick={accept}>
            {t("accept")}
          </Button>
          <Button
            type="button"
            size="sm"
            variant="ghost"
            disabled={pending || readOnly}
            onClick={discard}
          >
            {t("discard")}
          </Button>
        </div>
      ) : null}
    </section>
  );
}
