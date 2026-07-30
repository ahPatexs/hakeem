"use client";

import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "@/i18n/routing";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/doctor/shared";
import { saveSummaryDraft, finalizeSummary } from "@/actions/doctor/soap";

export function SummaryEditor({
  appointmentId,
  initial,
  readOnly = false,
}: {
  appointmentId: string;
  initial: { summaryId?: string; version?: number; status?: "DRAFT" | "FINAL"; body?: string };
  readOnly?: boolean;
}) {
  const t = useTranslations("doctor.summary");
  const tc = useTranslations("doctor.common");
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  const [summaryId, setSummaryId] = useState(initial.summaryId);
  const [version, setVersion] = useState(initial.version ?? 1);
  const [status, setStatus] = useState<"DRAFT" | "FINAL" | "NONE">(initial.status ?? "NONE");
  const [body, setBody] = useState(initial.body ?? "");
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [finalizeOpen, setFinalizeOpen] = useState(false);

  const isFinal = status === "FINAL";

  function save(onDone?: (id: string, v: number) => void) {
    setError(null);
    startTransition(async () => {
      const res = await saveSummaryDraft({
        appointmentId,
        summaryId: status === "DRAFT" ? summaryId : undefined,
        expectedVersion: status === "DRAFT" ? version : undefined,
        body,
      });
      if (!res.ok) {
        setError(res.code === "CONFLICT" ? tc("conflict") : t("error"));
        return;
      }
      setSummaryId(res.data.summaryId);
      setVersion(res.data.version);
      setStatus("DRAFT");
      setSaved(true);
      onDone?.(res.data.summaryId, res.data.version);
    });
  }

  return (
    <div className="space-y-4">
      <h3 className="font-headline text-lg text-primary">{t("title")}</h3>
      <textarea
        value={body}
        disabled={readOnly || isFinal || pending}
        rows={8}
        placeholder={t("placeholder")}
        onChange={(e) => {
          setSaved(false);
          setBody(e.target.value);
        }}
        className="w-full rounded-xl border border-outline-variant/30 bg-surface-container-low p-3 text-sm outline-none focus:border-primary disabled:opacity-60"
      />
      {error ? (
        <p className="text-sm text-red-600" role="alert">
          {error}
        </p>
      ) : null}
      {saved && !isFinal ? <p className="text-xs text-med-green">{tc("saved")}</p> : null}
      {isFinal ? <p className="text-sm font-medium text-med-green">{t("finalized")}</p> : null}

      {!isFinal && !readOnly ? (
        <div className="flex gap-2">
          <Button variant="outline" disabled={pending} onClick={() => save()}>
            {pending ? tc("saving") : t("saveDraft")}
          </Button>
          <Button
            disabled={pending || !body.trim()}
            onClick={() =>
              save((id, v) => {
                setSummaryId(id);
                setVersion(v);
                setFinalizeOpen(true);
              })
            }
          >
            {t("finalize")}
          </Button>
        </div>
      ) : null}

      <ConfirmDialog
        open={finalizeOpen}
        onOpenChange={setFinalizeOpen}
        title={t("finalizeTitle")}
        description={t("finalizeDescription")}
        confirmLabel={t("finalizeConfirm")}
        cancelLabel={tc("cancel")}
        loading={pending}
        onConfirm={() => {
          if (!summaryId) return;
          startTransition(async () => {
            const res = await finalizeSummary({ summaryId, expectedVersion: version });
            if (!res.ok) {
              setError(res.code === "SIGN_REQUIREMENTS" ? t("requiredBody") : t("error"));
              return;
            }
            setStatus("FINAL");
            router.refresh();
          });
        }}
      />
    </div>
  );
}
