"use client";

import { useMemo, useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "@/i18n/routing";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  aiAdminPublishPrompt,
  aiAdminRollbackPrompt,
  aiAdminSavePromptDraft,
} from "@/actions/ai/admin";
import type { TemplateWithVersions } from "@/lib/ai/prompts";

export function PromptEditor({
  templates,
  safetyLayerEn,
}: {
  templates: TemplateWithVersions[];
  safetyLayerEn: string;
}) {
  const t = useTranslations("ai.admin.prompts");
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [selectedId, setSelectedId] = useState(templates[0]?.id ?? "");
  const selected = useMemo(
    () => templates.find((tpl) => tpl.id === selectedId) ?? templates[0],
    [templates, selectedId],
  );

  const published = selected?.versions.find((v) => v.status === "PUBLISHED");
  const latestDraft = selected?.versions.find((v) => v.status === "DRAFT");

  const [bodyEn, setBodyEn] = useState(latestDraft?.bodyEn ?? published?.bodyEn ?? "");
  const [bodyAr, setBodyAr] = useState(latestDraft?.bodyAr ?? published?.bodyAr ?? "");
  const [changeNote, setChangeNote] = useState("");
  const [rollbackReason, setRollbackReason] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  function selectTemplate(id: string) {
    setSelectedId(id);
    const tpl = templates.find((x) => x.id === id);
    const pub = tpl?.versions.find((v) => v.status === "PUBLISHED");
    const draft = tpl?.versions.find((v) => v.status === "DRAFT");
    setBodyEn(draft?.bodyEn ?? pub?.bodyEn ?? "");
    setBodyAr(draft?.bodyAr ?? pub?.bodyAr ?? "");
    setChangeNote("");
    setRollbackReason("");
    setMessage(null);
    setError(null);
  }

  function onSaveDraft(e: React.FormEvent) {
    e.preventDefault();
    if (!selected) return;
    setMessage(null);
    setError(null);
    startTransition(async () => {
      const res = await aiAdminSavePromptDraft({
        templateId: selected.id,
        bodyEn,
        bodyAr,
        changeNote: changeNote || undefined,
      });
      if (!res.ok) {
        setError(t("saveError"));
        return;
      }
      setMessage(t("draftSaved", { version: res.data.version }));
      router.refresh();
    });
  }

  function onPublish(versionId: string) {
    if (!window.confirm(t("publishConfirm"))) return;
    setMessage(null);
    setError(null);
    startTransition(async () => {
      const res = await aiAdminPublishPrompt({ versionId });
      if (!res.ok) {
        setError(t("publishError"));
        return;
      }
      setMessage(t("published"));
      router.refresh();
    });
  }

  function onRollback(toVersion: number) {
    if (!selected) return;
    if (!rollbackReason.trim()) {
      setError(t("rollbackReasonRequired"));
      return;
    }
    if (!window.confirm(t("rollbackConfirm", { version: toVersion }))) return;
    setMessage(null);
    setError(null);
    startTransition(async () => {
      const res = await aiAdminRollbackPrompt({
        templateId: selected.id,
        toVersion,
        reason: rollbackReason.trim(),
      });
      if (!res.ok) {
        setError(t("rollbackError"));
        return;
      }
      setMessage(t("rolledBack"));
      setRollbackReason("");
      router.refresh();
    });
  }

  if (templates.length === 0) {
    return <p className="text-sm text-on-surface-variant">{t("empty")}</p>;
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap gap-2">
        {templates.map((tpl) => (
          <button
            key={tpl.id}
            type="button"
            onClick={() => selectTemplate(tpl.id)}
            className={`rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${
              selected?.id === tpl.id
                ? "bg-primary text-on-primary"
                : "bg-surface-container-high text-on-surface-variant hover:text-primary"
            }`}
          >
            {tpl.feature}
          </button>
        ))}
      </div>

      {selected ? (
        <>
          <div className="rounded-xl border border-outline-variant/20 p-4">
            <h2 className="font-headline text-lg text-primary">{t("safetyTitle")}</h2>
            <p className="mb-2 text-xs text-on-surface-variant">{t("safetyHint")}</p>
            <pre className="max-h-40 overflow-auto whitespace-pre-wrap rounded-lg bg-surface-container-low p-3 text-xs text-on-surface-variant">
              {safetyLayerEn}
            </pre>
          </div>

          <form
            onSubmit={onSaveDraft}
            className="space-y-4 rounded-xl border border-outline-variant/20 p-4"
          >
            <h2 className="font-headline text-lg text-primary">
              {t("editorTitle", { feature: selected.feature })}
            </h2>
            {published ? (
              <p className="text-sm text-on-surface-variant">
                {t("liveVersion", { version: published.version })}
              </p>
            ) : (
              <p className="text-sm text-warm-coral">{t("noPublished")}</p>
            )}

            <div className="space-y-2">
              <Label htmlFor="body-en">{t("bodyEn")}</Label>
              <textarea
                id="body-en"
                className="min-h-32 w-full rounded-lg border border-outline-variant/30 bg-surface px-3 py-2 text-sm"
                value={bodyEn}
                onChange={(e) => setBodyEn(e.target.value)}
                required
                dir="ltr"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="body-ar">{t("bodyAr")}</Label>
              <textarea
                id="body-ar"
                className="min-h-32 w-full rounded-lg border border-outline-variant/30 bg-surface px-3 py-2 text-sm"
                value={bodyAr}
                onChange={(e) => setBodyAr(e.target.value)}
                required
                dir="rtl"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="change-note">{t("changeNote")}</Label>
              <Input
                id="change-note"
                value={changeNote}
                onChange={(e) => setChangeNote(e.target.value)}
                placeholder={t("changeNotePlaceholder")}
              />
            </div>

            {error ? <p className="text-sm text-warm-coral">{error}</p> : null}
            {message ? <p className="text-sm text-med-green">{message}</p> : null}

            <Button type="submit" disabled={pending}>
              {pending ? t("saving") : t("saveDraft")}
            </Button>
          </form>

          <div className="space-y-3">
            <h3 className="font-headline text-base text-primary">{t("historyTitle")}</h3>
            <div className="space-y-2">
              <Label htmlFor="rollback-reason">{t("rollbackReason")}</Label>
              <Input
                id="rollback-reason"
                value={rollbackReason}
                onChange={(e) => setRollbackReason(e.target.value)}
                placeholder={t("rollbackReasonPlaceholder")}
              />
            </div>
            <ul className="space-y-2">
              {selected.versions.map((v) => (
                <li
                  key={v.id}
                  className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-outline-variant/20 p-3 text-sm"
                >
                  <div>
                    <p className="font-medium text-primary">
                      {t("versionLabel", { version: v.version })} · {v.status}
                    </p>
                    {v.changeNote ? (
                      <p className="text-on-surface-variant">{v.changeNote}</p>
                    ) : null}
                  </div>
                  <div className="flex gap-2">
                    {v.status === "DRAFT" ? (
                      <Button
                        type="button"
                        size="sm"
                        disabled={pending}
                        onClick={() => onPublish(v.id)}
                      >
                        {t("publish")}
                      </Button>
                    ) : null}
                    {v.status === "ARCHIVED" ? (
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        disabled={pending}
                        onClick={() => onRollback(v.version)}
                      >
                        {t("rollback")}
                      </Button>
                    ) : null}
                  </div>
                </li>
              ))}
            </ul>
          </div>
        </>
      ) : null}
    </div>
  );
}
