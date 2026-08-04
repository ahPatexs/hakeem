"use client";

import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "@/i18n/routing";
import { Button } from "@/components/ui/button";
import {
  aiAcceptDraft,
  aiDiscardDraft,
  aiGenerateConsultationSummary,
  aiGenerateSoapDraft,
} from "@/actions/ai/drafts";
import { ResponseFeedback } from "@/components/ai/feedback/response-feedback";
import { FileText, Sparkles } from "lucide-react";

type SoapPreview = {
  subjective: string;
  objective: string;
  assessment: string;
  plan: string;
};

type SummaryPreview = { body: string };

type ActiveDraft =
  | { kind: "SOAP"; draftId: string; content: SoapPreview; evidence: { chartCategories: string[]; kbSources: string[] } }
  | {
      kind: "CONSULT_SUMMARY";
      draftId: string;
      content: SummaryPreview;
      evidence: { chartCategories: string[]; kbSources: string[] };
    };

export function DraftPanel({
  patientUserId,
  appointmentId,
  readOnly = false,
}: {
  patientUserId: string;
  appointmentId: string;
  readOnly?: boolean;
}) {
  const t = useTranslations("ai.drafts");
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [draft, setDraft] = useState<ActiveDraft | null>(null);
  const [error, setError] = useState<"unavailable" | "generic" | null>(null);
  const [status, setStatus] = useState<"idle" | "accepted" | "discarded">("idle");

  function mapError(code: string) {
    if (
      code === "DEPENDENCY_UNAVAILABLE" ||
      code === "BUDGET_EXHAUSTED" ||
      code === "RATE_LIMITED"
    ) {
      setError("unavailable");
    } else {
      setError("generic");
    }
  }

  function generateSoap() {
    if (readOnly || pending) return;
    setError(null);
    setStatus("idle");
    startTransition(async () => {
      const res = await aiGenerateSoapDraft({ patientUserId, appointmentId });
      if (!res.ok) {
        mapError(res.code);
        return;
      }
      setDraft({
        kind: "SOAP",
        draftId: res.data.draftId,
        content: res.data.content,
        evidence: res.data.evidence,
      });
    });
  }

  function generateSummary() {
    if (readOnly || pending) return;
    setError(null);
    setStatus("idle");
    startTransition(async () => {
      // Locale omitted — server resolves patient preferred locale (FR-019)
      const res = await aiGenerateConsultationSummary({
        patientUserId,
        appointmentId,
      });
      if (!res.ok) {
        mapError(res.code);
        return;
      }
      setDraft({
        kind: "CONSULT_SUMMARY",
        draftId: res.data.draftId,
        content: res.data.content,
        evidence: res.data.evidence,
      });
    });
  }

  function accept() {
    if (!draft || readOnly || pending) return;
    setError(null);
    startTransition(async () => {
      const edits =
        draft.kind === "SOAP"
          ? draft.content
          : { body: draft.content.body };
      const res = await aiAcceptDraft({ draftId: draft.draftId, edits });
      if (!res.ok) {
        mapError(res.code);
        return;
      }
      setStatus("accepted");
      setDraft(null);
      router.refresh();
    });
  }

  function discard() {
    if (!draft || readOnly || pending) return;
    setError(null);
    startTransition(async () => {
      const res = await aiDiscardDraft({ draftId: draft.draftId });
      if (!res.ok) {
        mapError(res.code);
        return;
      }
      setStatus("discarded");
      setDraft(null);
    });
  }

  const evidenceLine = draft
    ? [
        draft.evidence.chartCategories.length
          ? `${t("evidenceChart")}: ${draft.evidence.chartCategories.join(", ")}`
          : null,
        draft.evidence.kbSources.length
          ? `${t("evidenceKb")}: ${draft.evidence.kbSources.slice(0, 3).join(", ")}`
          : null,
      ]
        .filter(Boolean)
        .join(" · ")
    : "";

  return (
    <section
      className="space-y-3 rounded-xl border border-outline-variant/20 bg-surface-container-low p-4"
      data-ai-draft-panel
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
        <div className="flex flex-wrap gap-2">
          <Button type="button" size="sm" variant="soft" disabled={pending} onClick={generateSoap}>
            <FileText className="me-1.5 h-3.5 w-3.5" aria-hidden />
            {t("generateSoap")}
          </Button>
          <Button type="button" size="sm" variant="soft" disabled={pending} onClick={generateSummary}>
            {t("generateSummary")}
          </Button>
        </div>
      ) : null}

      {pending ? <p className="text-xs text-on-surface-variant">{t("generating")}</p> : null}

      {error === "unavailable" ? (
        <p className="text-sm text-on-surface-variant" role="status">
          {t("unavailable")}
        </p>
      ) : null}
      {error === "generic" ? (
        <p className="text-sm text-red-600" role="alert">
          {t("error")}
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

      {draft?.kind === "SOAP" ? (
        <div className="space-y-2">
          {(["subjective", "objective", "assessment", "plan"] as const).map((field) => (
            <label key={field} className="block space-y-1">
              <span className="text-xs font-medium uppercase tracking-wide text-on-surface-variant">
                {t(field)}
              </span>
              <textarea
                value={draft.content[field]}
                onChange={(e) =>
                  setDraft({
                    ...draft,
                    content: { ...draft.content, [field]: e.target.value },
                  })
                }
                rows={field === "assessment" || field === "plan" ? 3 : 2}
                className="w-full rounded-lg border border-outline-variant/30 bg-surface px-3 py-2 text-sm text-primary outline-none focus:border-primary"
                aria-label={t(field)}
              />
            </label>
          ))}
        </div>
      ) : null}

      {draft?.kind === "CONSULT_SUMMARY" ? (
        <label className="block space-y-1">
          <span className="text-xs font-medium uppercase tracking-wide text-on-surface-variant">
            {t("summaryBody")}
          </span>
          <textarea
            value={draft.content.body}
            onChange={(e) =>
              setDraft({
                ...draft,
                content: { body: e.target.value },
              })
            }
            rows={6}
            className="w-full rounded-lg border border-outline-variant/30 bg-surface px-3 py-2 text-sm text-primary outline-none focus:border-primary"
            aria-label={t("summaryBody")}
          />
        </label>
      ) : null}

      {draft && evidenceLine ? (
        <p className="text-xs text-on-surface-variant">{evidenceLine}</p>
      ) : null}

      {draft ? (
        <div className="flex flex-wrap gap-2">
          <Button type="button" size="sm" disabled={pending || readOnly} onClick={accept}>
            {t("accept")}
          </Button>
          <Button type="button" size="sm" variant="ghost" disabled={pending || readOnly} onClick={discard}>
            {t("discard")}
          </Button>
        </div>
      ) : null}

      {draft ? <ResponseFeedback draftId={draft.draftId} /> : null}
    </section>
  );
}
