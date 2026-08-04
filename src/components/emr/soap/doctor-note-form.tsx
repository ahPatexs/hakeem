"use client";

import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "@/i18n/routing";
import { Button } from "@/components/ui/button";
import { emrSaveDoctorNote, emrSignDoctorNote } from "@/actions/emr/notes";

export type DoctorNoteFormLabels = {
  addTitle: string;
  body: string;
  save: string;
  sign: string;
  saving: string;
  error: string;
};

/**
 * Client form for clinician free-text notes (T124): save a draft via
 * `emrSaveDoctorNote`, then sign it via `emrSignDoctorNote`.
 * `labels` is optional — falls back to `emr.*` messages when omitted.
 */
export function DoctorNoteForm({
  patientUserId,
  appointmentId,
  labels,
}: {
  patientUserId: string;
  appointmentId?: string;
  labels?: DoctorNoteFormLabels;
}) {
  const t = useTranslations("emr");
  const resolved: DoctorNoteFormLabels = labels ?? {
    addTitle: t("notes.add"),
    body: t("notes.body"),
    save: t("notes.save"),
    sign: t("notes.sign"),
    saving: t("loading"),
    error: t("error"),
  };
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [body, setBody] = useState("");
  const [noteId, setNoteId] = useState<string | undefined>(undefined);
  const [version, setVersion] = useState<number | undefined>(undefined);
  const [error, setError] = useState<string | null>(null);

  function save() {
    setError(null);
    startTransition(async () => {
      const res = await emrSaveDoctorNote({
        patientUserId,
        appointmentId,
        noteId,
        expectedVersion: version,
        body: body.trim(),
      });
      if (!res.ok) {
        setError(resolved.error);
        return;
      }
      setNoteId(res.data.noteId);
      setVersion(res.data.version);
      router.refresh();
    });
  }

  function sign() {
    if (!noteId || version == null) return;
    setError(null);
    startTransition(async () => {
      const res = await emrSignDoctorNote({ noteId, expectedVersion: version });
      if (!res.ok) {
        setError(resolved.error);
        return;
      }
      setBody("");
      setNoteId(undefined);
      setVersion(undefined);
      router.refresh();
    });
  }

  return (
    <div className="space-y-3 rounded-xl border border-outline-variant/20 bg-surface-container-low p-4">
      <h3 className="font-headline text-sm text-primary">{resolved.addTitle}</h3>
      <label className="block space-y-1">
        <span className="text-xs font-medium text-on-surface-variant">{resolved.body}</span>
        <textarea
          rows={3}
          value={body}
          onChange={(e) => setBody(e.target.value)}
          className="w-full rounded-xl border border-outline-variant/30 bg-surface-container-low px-3 py-2 text-sm outline-none focus:border-primary"
        />
      </label>
      {error ? (
        <p className="text-sm text-red-600" role="alert">
          {error}
        </p>
      ) : null}
      <div className="flex flex-wrap gap-2">
        <Button type="button" variant="outline" size="sm" disabled={pending || !body.trim()} onClick={save}>
          {pending ? resolved.saving : resolved.save}
        </Button>
        <Button type="button" size="sm" disabled={pending || !noteId} onClick={sign}>
          {resolved.sign}
        </Button>
      </div>
    </div>
  );
}
