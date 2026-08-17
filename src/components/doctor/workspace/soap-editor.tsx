"use client";

import { useCallback, useEffect, useImperativeHandle, useRef, useState, useTransition, forwardRef } from "react";
import { useLocale, useTranslations } from "next-intl";
import { useRouter } from "@/i18n/routing";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/doctor/shared";
import { saveSoapDraft, finalizeSoap, amendSoap } from "@/actions/doctor/soap";
import { useOfflineActionGuard } from "@/components/doctor/workspace/offline-guard";

export interface SoapEditorHandle {
  /** Append AI-suggested text into the Plan section (explicit review required). */
  insertText: (text: string) => void;
}

type SoapState = {
  noteId?: string;
  version: number;
  status: "DRAFT" | "FINAL" | "NONE";
  subjective: string;
  objective: string;
  assessment: string;
  plan: string;
  aiAssisted: boolean;
};

export const SoapEditor = forwardRef<
  SoapEditorHandle,
  {
    appointmentId: string;
    initial: {
      noteId?: string;
      version?: number;
      status?: "DRAFT" | "FINAL";
      subjective?: string;
      objective?: string;
      assessment?: string;
      plan?: string;
      aiAssisted?: boolean;
      signedAt?: string | null;
    };
    readOnly?: boolean;
  }
>(function SoapEditor({ appointmentId, initial, readOnly = false }, ref) {
  const t = useTranslations("doctor.soap");
  const tc = useTranslations("doctor.common");
  const locale = useLocale();
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const { disabled: offlineDisabled } = useOfflineActionGuard();

  const [state, setState] = useState<SoapState>({
    noteId: initial.noteId,
    version: initial.version ?? 1,
    status: initial.status ?? "NONE",
    subjective: initial.subjective ?? "",
    objective: initial.objective ?? "",
    assessment: initial.assessment ?? "",
    plan: initial.plan ?? "",
    aiAssisted: initial.aiAssisted ?? false,
  });
  const [savedAt, setSavedAt] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [finalizeOpen, setFinalizeOpen] = useState(false);
  const [amendOpen, setAmendOpen] = useState(false);
  const [amendReason, setAmendReason] = useState("");
  const dirty = useRef(false);

  useImperativeHandle(ref, () => ({
    insertText: (text: string) => {
      dirty.current = true;
      setState((s) => ({
        ...s,
        aiAssisted: true,
        plan: s.plan ? `${s.plan}\n${text}` : text,
      }));
    },
  }));

  const doSave = useCallback(() => {
    setError(null);
    startTransition(async () => {
      const res = await saveSoapDraft({
        appointmentId,
        noteId: state.status === "DRAFT" ? state.noteId : undefined,
        expectedVersion: state.status === "DRAFT" ? state.version : undefined,
        subjective: state.subjective,
        objective: state.objective,
        assessment: state.assessment,
        plan: state.plan,
        aiAssisted: state.aiAssisted,
      });
      if (!res.ok) {
        setError(res.code === "CONFLICT" ? t("conflict") : t("error"));
        return;
      }
      dirty.current = false;
      setState((s) => ({ ...s, noteId: res.data.noteId, version: res.data.version, status: "DRAFT" }));
      setSavedAt(
        new Date(res.data.savedAt).toLocaleTimeString(locale === "ar" ? "ar-SA" : "en-US", {
          hour: "2-digit",
          minute: "2-digit",
        }),
      );
    });
  }, [appointmentId, state, locale, t]);

  // Draft protection: warn before navigating away with unsaved edits (FR-013)
  useEffect(() => {
    const handler = (e: BeforeUnloadEvent) => {
      if (dirty.current) e.preventDefault();
    };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, []);

  const isFinal = state.status === "FINAL";
  const disabled = readOnly || pending || offlineDisabled || (isFinal && !amendOpen);
  const canFinalize = Boolean(state.noteId) && state.status === "DRAFT" && !dirty.current;

  function field(key: "subjective" | "objective" | "assessment" | "plan", label: string, required = false) {
    return (
      <div>
        <label htmlFor={`soap-${key}`} className="text-sm font-medium text-primary">
          {label}
          {required ? <span className="text-red-600"> *</span> : null}
        </label>
        <textarea
          id={`soap-${key}`}
          value={state[key]}
          disabled={disabled}
          rows={key === "subjective" ? 4 : 3}
          onChange={(e) => {
            dirty.current = true;
            setState((s) => ({ ...s, [key]: e.target.value }));
          }}
          className="mt-1 w-full rounded-xl border border-outline-variant/30 bg-surface-container-low p-3 text-sm outline-none focus:border-primary disabled:opacity-60"
        />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="font-headline text-lg text-primary">
          {t("title")}{" "}
          <span className="text-xs font-normal text-on-surface-variant">
            {t("version", { version: state.version })}
            {state.aiAssisted ? ` · ${tc("aiAssisted")}` : ""}
          </span>
        </h3>
        {savedAt ? <p className="text-xs text-med-green">{t("savedAt", { time: savedAt })}</p> : null}
      </div>

      {field("subjective", t("subjective"))}
      {field("objective", t("objective"))}
      {field("assessment", t("assessment"), true)}
      {field("plan", t("plan"), true)}
      {!isFinal && !readOnly ? (
        <p className="text-xs text-on-surface-variant">{t("patientReleaseHint")}</p>
      ) : null}

      {error ? (
        <p className="text-sm text-red-600" role="alert">
          {error}
        </p>
      ) : null}

      {!isFinal && !readOnly ? (
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" disabled={pending} onClick={doSave}>
            {pending ? tc("saving") : t("saveDraft")}
          </Button>
          <Button
            disabled={pending || offlineDisabled || !state.assessment.trim() || !state.plan.trim()}
            onClick={() => {
              if (dirty.current) {
                doSave();
              }
              setFinalizeOpen(true);
            }}
          >
            {t("finalize")}
          </Button>
        </div>
      ) : null}

      {isFinal && !readOnly ? (
        <Button variant="outline" onClick={() => setAmendOpen(true)}>
          {t("amend")}
        </Button>
      ) : null}

      <ConfirmDialog
        open={finalizeOpen}
        onOpenChange={setFinalizeOpen}
        title={t("finalizeTitle")}
        description={
          !state.subjective.trim() || !state.objective.trim()
            ? `${t("finalizeDescription")} ${t("emptyWarning")}`
            : t("finalizeDescription")
        }
        confirmLabel={t("finalizeConfirm")}
        cancelLabel={tc("cancel")}
        loading={pending || !canFinalize}
        onConfirm={() => {
          if (!state.noteId) return;
          startTransition(async () => {
            const res = await finalizeSoap({ noteId: state.noteId!, expectedVersion: state.version });
            if (!res.ok) {
              setError(res.code === "CONFLICT" ? t("conflict") : t("requiredAP"));
              return;
            }
            setState((s) => ({ ...s, status: "FINAL" }));
            router.refresh();
          });
        }}
      />

      {amendOpen ? (
        <div className="glass-card space-y-3 rounded-2xl border border-outline-variant/20 bg-surface-container-low p-4">
          <h4 className="font-medium text-primary">{t("amendTitle")}</h4>
          <label htmlFor="amend-reason" className="text-sm font-medium text-primary">
            {t("amendReason")} <span className="text-red-600">*</span>
          </label>
          <textarea
            id="amend-reason"
            value={amendReason}
            rows={2}
            onChange={(e) => setAmendReason(e.target.value)}
            className="w-full rounded-xl border border-outline-variant/30 bg-background p-3 text-sm outline-none focus:border-primary"
          />
          <div className="flex gap-2">
            <Button
              disabled={pending || amendReason.trim().length < 3}
              onClick={() => {
                if (!state.noteId) return;
                startTransition(async () => {
                  const res = await amendSoap({
                    noteId: state.noteId!,
                    reason: amendReason,
                    subjective: state.subjective,
                    objective: state.objective,
                    assessment: state.assessment,
                    plan: state.plan,
                  });
                  if (!res.ok) {
                    setError(t("error"));
                    return;
                  }
                  setAmendOpen(false);
                  setAmendReason("");
                  router.refresh();
                });
              }}
            >
              {t("amendConfirm")}
            </Button>
            <Button variant="ghost" onClick={() => setAmendOpen(false)}>
              {tc("cancel")}
            </Button>
          </div>
        </div>
      ) : null}

    </div>
  );
});
