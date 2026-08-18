"use client";

import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "@/i18n/routing";
import { Button } from "@/components/ui/button";
import { savePrescriptionDraft } from "@/actions/doctor/prescriptions";
import { Plus, Trash2 } from "lucide-react";

type LineState = {
  medicationName: string;
  dose: string;
  frequency: string;
  instructions: string;
};

type InitialRx = {
  prescriptionId?: string;
  version?: number;
  instructions?: string;
  aiAssisted?: boolean;
  lines?: Array<{
    medicationName: string;
    dose?: string | null;
    frequency?: string | null;
    instructions?: string | null;
  }>;
};

const emptyLine = (): LineState => ({
  medicationName: "",
  dose: "",
  frequency: "",
  instructions: "",
});

export function PrescriptionForm({
  patientUserId,
  appointmentId,
  initial,
}: {
  patientUserId: string;
  appointmentId?: string;
  initial?: InitialRx;
}) {
  const t = useTranslations("doctor.rx");
  const tc = useTranslations("doctor.common");
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [instructions, setInstructions] = useState(initial?.instructions ?? "");
  const [lines, setLines] = useState<LineState[]>(
    initial?.lines?.length
      ? initial.lines.map((l) => ({
          medicationName: l.medicationName,
          dose: l.dose ?? "",
          frequency: l.frequency ?? "",
          instructions: l.instructions ?? "",
        }))
      : [emptyLine()],
  );

  function updateLine(index: number, patch: Partial<LineState>) {
    setLines((prev) => prev.map((l, i) => (i === index ? { ...l, ...patch } : l)));
  }

  function addLine() {
    setLines((prev) => [...prev, emptyLine()]);
  }

  function removeLine(index: number) {
    setLines((prev) => (prev.length <= 1 ? prev : prev.filter((_, i) => i !== index)));
  }

  function save() {
    setError(null);
    const payloadLines = lines
      .map((l) => ({
        medicationName: l.medicationName.trim(),
        dose: l.dose.trim() || undefined,
        frequency: l.frequency.trim() || undefined,
        instructions: l.instructions.trim() || undefined,
      }))
      .filter((l) => l.medicationName.length > 0);

    if (payloadLines.length === 0) {
      setError(t("needMedication"));
      return;
    }

    startTransition(async () => {
      const payload = {
        prescriptionId: initial?.prescriptionId,
        expectedVersion: initial?.version,
        patientUserId,
        appointmentId,
        instructions,
        aiAssisted: initial?.aiAssisted ?? false,
        lines: payloadLines,
      };
      const res = await savePrescriptionDraft(payload);
      if (!res.ok) {
        if (res.code === "CONFLICT") setError(tc("conflict"));
        else if (res.code === "VALIDATION_ERROR") setError(t("validationError"));
        else if (res.code === "NOT_FOUND") setError(t("saveNotFound"));
        else setError(tc("loadError"));
        return;
      }
      router.push(`/doctor/prescriptions/${res.data.prescriptionId}`);
    });
  }

  return (
    <div className="space-y-6">
      {initial?.aiAssisted ? (
        <p className="rounded-2xl border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          {t("aiDraftNote")}
        </p>
      ) : null}

      <div className="space-y-4">
        {lines.map((line, index) => (
          <fieldset
            key={index}
            className="glass-card space-y-3 rounded-2xl border border-outline-variant/20 bg-surface-container-low p-4"
          >
            <legend className="flex w-full items-center justify-between px-1 text-sm font-medium text-primary">
              <span>
                {t("line")} {index + 1}
              </span>
              {lines.length > 1 ? (
                <button
                  type="button"
                  onClick={() => removeLine(index)}
                  className="inline-flex items-center gap-1 text-xs text-red-600 hover:underline"
                  aria-label={t("removeLine")}
                >
                  <Trash2 className="h-3.5 w-3.5" aria-hidden />
                  {t("removeLine")}
                </button>
              ) : null}
            </legend>
            <label className="block space-y-1">
              <span className="text-xs font-medium text-on-surface-variant">{t("medicationName")}</span>
              <input
                type="text"
                required
                value={line.medicationName}
                onChange={(e) => updateLine(index, { medicationName: e.target.value })}
                className="h-10 w-full rounded-xl border border-outline-variant/30 bg-surface-container-low px-3 text-sm outline-none focus:border-primary"
              />
            </label>
            <div className="grid gap-3 sm:grid-cols-2">
              <label className="block space-y-1">
                <span className="text-xs font-medium text-on-surface-variant">{t("dose")}</span>
                <input
                  type="text"
                  value={line.dose}
                  onChange={(e) => updateLine(index, { dose: e.target.value })}
                  className="h-10 w-full rounded-xl border border-outline-variant/30 bg-surface-container-low px-3 text-sm outline-none focus:border-primary"
                />
              </label>
              <label className="block space-y-1">
                <span className="text-xs font-medium text-on-surface-variant">{t("frequency")}</span>
                <input
                  type="text"
                  value={line.frequency}
                  onChange={(e) => updateLine(index, { frequency: e.target.value })}
                  className="h-10 w-full rounded-xl border border-outline-variant/30 bg-surface-container-low px-3 text-sm outline-none focus:border-primary"
                />
              </label>
            </div>
            <label className="block space-y-1">
              <span className="text-xs font-medium text-on-surface-variant">{t("lineInstructions")}</span>
              <textarea
                rows={2}
                value={line.instructions}
                onChange={(e) => updateLine(index, { instructions: e.target.value })}
                className="w-full rounded-xl border border-outline-variant/30 bg-surface-container-low px-3 py-2 text-sm outline-none focus:border-primary"
              />
            </label>
          </fieldset>
        ))}
      </div>

      <Button type="button" variant="outline" size="sm" onClick={addLine}>
        <Plus className="me-1.5 h-4 w-4" aria-hidden />
        {t("addLine")}
      </Button>

      <label className="block space-y-1">
        <span className="text-sm font-medium text-on-surface-variant">{t("generalInstructions")}</span>
        <textarea
          rows={3}
          value={instructions}
          onChange={(e) => setInstructions(e.target.value)}
          className="w-full rounded-xl border border-outline-variant/30 bg-surface-container-low px-3 py-2 text-sm outline-none focus:border-primary"
        />
      </label>

      {error ? (
        <p className="text-sm text-red-600" role="alert">
          {error}
        </p>
      ) : null}

      <div className="flex flex-wrap gap-3">
        <Button type="button" disabled={pending} onClick={save}>
          {pending ? tc("saving") : t("saveDraft")}
        </Button>
      </div>
    </div>
  );
}
