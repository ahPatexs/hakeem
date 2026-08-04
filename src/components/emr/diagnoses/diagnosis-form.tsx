"use client";

import { useMemo, useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "@/i18n/routing";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { emrUpsertDiagnosis } from "@/actions/emr/diagnoses";
import { searchIcd10Catalog } from "@/lib/emr/icd10-catalog";

/** Diagnosis form with ICD-10 catalog combobox + free-text fallback (T141). */
export function DiagnosisForm({
  patientUserId,
  appointmentId,
}: {
  patientUserId: string;
  appointmentId?: string;
}) {
  const t = useTranslations("emr");
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [display, setDisplay] = useState("");
  const [icd10Code, setIcd10Code] = useState("");
  const [icdQuery, setIcdQuery] = useState("");
  const [error, setError] = useState<string | null>(null);

  const suggestions = useMemo(() => searchIcd10Catalog(icdQuery), [icdQuery]);

  function submit() {
    setError(null);
    startTransition(async () => {
      const res = await emrUpsertDiagnosis({
        patientUserId,
        display: display.trim(),
        icd10Code: icd10Code.trim() || undefined,
        appointmentId,
      });
      if (!res.ok) {
        setError(t("error"));
        return;
      }
      setDisplay("");
      setIcd10Code("");
      setIcdQuery("");
      router.refresh();
    });
  }

  return (
    <div className="space-y-3 rounded-xl border border-outline-variant/20 bg-surface-container-low p-4">
      <h3 className="font-headline text-sm text-primary">{t("diagnoses.add")}</h3>
      <label className="block space-y-1">
        <span className="text-xs font-medium text-on-surface-variant">{t("diagnoses.display")}</span>
        <Input value={display} onChange={(e) => setDisplay(e.target.value)} />
      </label>
      <div className="space-y-1">
        <label className="block space-y-1">
          <span className="text-xs font-medium text-on-surface-variant">{t("diagnoses.icd10")}</span>
          <Input
            value={icdQuery || icd10Code}
            onChange={(e) => {
              setIcdQuery(e.target.value);
              setIcd10Code(e.target.value);
            }}
            placeholder={t("diagnoses.icdSearch")}
            role="combobox"
            aria-expanded={suggestions.length > 0}
            aria-controls="icd10-suggestions"
            autoComplete="off"
          />
        </label>
        {icdQuery.trim() ? (
          <ul
            id="icd10-suggestions"
            role="listbox"
            className="max-h-40 overflow-auto rounded-lg border border-outline-variant/20 bg-background text-sm"
          >
            {suggestions.map((s) => (
              <li key={s.code} role="option">
                <button
                  type="button"
                  className="w-full px-3 py-2 text-start hover:bg-surface-container-high"
                  onClick={() => {
                    setIcd10Code(s.code);
                    setIcdQuery(s.code);
                    if (!display.trim()) setDisplay(s.display);
                  }}
                >
                  <span className="font-medium text-primary">{s.code}</span>
                  <span className="ms-2 text-on-surface-variant">{s.display}</span>
                </button>
              </li>
            ))}
            {suggestions.length === 0 ? (
              <li className="px-3 py-2 text-on-surface-variant">{t("diagnoses.icdFreeText")}</li>
            ) : null}
          </ul>
        ) : null}
      </div>
      {error ? (
        <p className="text-sm text-red-600" role="alert">
          {error}
        </p>
      ) : null}
      <Button type="button" variant="soft" size="sm" disabled={pending || !display.trim()} onClick={submit}>
        {pending ? t("loading") : t("diagnoses.save")}
      </Button>
    </div>
  );
}
