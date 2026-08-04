"use client";

import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "@/i18n/routing";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  emrUpsertAllergy,
  emrSoftDeleteAllergy,
  emrUpsertCondition,
  emrSoftDeleteCondition,
  emrUpdateLifestyle,
  emrUpdateEmergencyInfo,
  emrUpsertImmunization,
  emrSoftDeleteImmunization,
  emrUpsertFamilyHistory,
  emrSoftDeleteFamilyHistory,
} from "@/actions/emr/history";
import type {
  HistoryAllergyItem,
  HistoryConditionItem,
  HistoryLifestyle,
  HistoryImmunizationItem,
  HistoryFamilyItem,
} from "./history-sections";

type EmergencyForm = {
  contactName?: string | null;
  contactPhone?: string | null;
  criticalAlertsText?: string | null;
} | null;

/**
 * Patient/clinician EMR history editors (T120/T121).
 * Writes go to typed EMR tables — not legacy MedicalProfile string arrays.
 */
export function HistoryEditor({
  patientUserId,
  allergies,
  conditions,
  lifestyle,
  emergency,
  immunizations = [],
  familyHistory = [],
  source = "PATIENT_REPORTED",
  allowCriticalFlag = false,
}: {
  patientUserId: string;
  allergies: HistoryAllergyItem[];
  conditions: HistoryConditionItem[];
  lifestyle: HistoryLifestyle;
  emergency: EmergencyForm;
  immunizations?: HistoryImmunizationItem[];
  familyHistory?: HistoryFamilyItem[];
  source?: "PATIENT_REPORTED" | "CLINICIAN_ATTESTED";
  allowCriticalFlag?: boolean;
}) {
  const t = useTranslations("emr");
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [okMsg, setOkMsg] = useState<string | null>(null);

  const [allergySubstance, setAllergySubstance] = useState("");
  const [allergyReaction, setAllergyReaction] = useState("");
  const [conditionDisplay, setConditionDisplay] = useState("");
  const [vaccineName, setVaccineName] = useState("");
  const [familyRelation, setFamilyRelation] = useState("");
  const [familyCondition, setFamilyCondition] = useState("");
  const [smoking, setSmoking] = useState(lifestyle?.smoking ?? "");
  const [alcohol, setAlcohol] = useState(lifestyle?.alcohol ?? "");
  const [activity, setActivity] = useState(lifestyle?.activity ?? "");
  const [lifeNotes, setLifeNotes] = useState(lifestyle?.notes ?? "");
  const [contactName, setContactName] = useState(emergency?.contactName ?? "");
  const [contactPhone, setContactPhone] = useState(emergency?.contactPhone ?? "");
  const [criticalText, setCriticalText] = useState(emergency?.criticalAlertsText ?? "");

  const patientEditable = (itemSource: string) =>
    source === "CLINICIAN_ATTESTED" || itemSource === "PATIENT_REPORTED";

  const run = (fn: () => Promise<void>) => {
    setError(null);
    setOkMsg(null);
    startTransition(async () => {
      try {
        await fn();
        setOkMsg(t("history.saved"));
        router.refresh();
      } catch {
        setError(t("error"));
      }
    });
  };

  return (
    <section className="space-y-6 rounded-xl border border-outline-variant/20 bg-surface-container-low p-5">
      <h2 className="font-headline text-lg text-primary">{t("history.editTitle")}</h2>
      <p className="text-sm text-on-surface-variant">{t("history.editHint")}</p>

      {error ? (
        <p className="text-sm text-warm-coral" role="alert">
          {error}
        </p>
      ) : null}
      {okMsg ? <p className="text-sm text-med-green">{okMsg}</p> : null}

      {/* Allergies */}
      <div className="space-y-3">
        <h3 className="text-xs font-medium uppercase tracking-wide text-on-surface-variant">
          {t("history.allergies")}
        </h3>
        <ul className="divide-y divide-outline-variant/15">
          {allergies.map((a) => (
            <li key={a.id} className="flex items-center justify-between gap-3 py-2">
              <span className="text-sm text-primary">
                {a.substance}
                {a.criticalFlag ? (
                  <span className="ms-2 text-xs text-warm-coral">{t("criticalAlerts.title")}</span>
                ) : null}
              </span>
              {patientEditable(a.source) ? (
                <button
                  type="button"
                  disabled={pending}
                  className="text-xs text-warm-coral underline disabled:opacity-50"
                  onClick={() =>
                    run(async () => {
                      const result = await emrSoftDeleteAllergy({
                        patientUserId,
                        id: a.id,
                        source,
                      });
                      if (!result.ok) throw new Error(result.code);
                    })
                  }
                >
                  {t("history.remove")}
                </button>
              ) : (
                <span className="text-xs text-on-surface-variant">{t("history.sourceClinician")}</span>
              )}
            </li>
          ))}
        </ul>
        <div className="flex flex-wrap gap-2">
          <Input
            value={allergySubstance}
            onChange={(e) => setAllergySubstance(e.target.value)}
            placeholder={t("history.allergySubstance")}
            className="max-w-xs"
          />
          <Input
            value={allergyReaction}
            onChange={(e) => setAllergyReaction(e.target.value)}
            placeholder={t("history.allergyReaction")}
            className="max-w-xs"
          />
          <Button
            type="button"
            variant="soft"
            disabled={pending || !allergySubstance.trim()}
            onClick={() =>
              run(async () => {
                const result = await emrUpsertAllergy({
                  patientUserId,
                  substance: allergySubstance.trim(),
                  reaction: allergyReaction.trim() || null,
                  source,
                  criticalFlag: allowCriticalFlag ? false : undefined,
                });
                if (!result.ok) throw new Error(result.code);
                setAllergySubstance("");
                setAllergyReaction("");
              })
            }
          >
            {t("history.addAllergy")}
          </Button>
        </div>
      </div>

      {/* Conditions */}
      <div className="space-y-3">
        <h3 className="text-xs font-medium uppercase tracking-wide text-on-surface-variant">
          {t("history.conditions")}
        </h3>
        <ul className="divide-y divide-outline-variant/15">
          {conditions.map((c) => (
            <li key={c.id} className="flex items-center justify-between gap-3 py-2">
              <span className="text-sm text-primary">{c.display}</span>
              {patientEditable(c.source) ? (
                <button
                  type="button"
                  disabled={pending}
                  className="text-xs text-warm-coral underline disabled:opacity-50"
                  onClick={() =>
                    run(async () => {
                      const result = await emrSoftDeleteCondition({
                        patientUserId,
                        id: c.id,
                        source,
                      });
                      if (!result.ok) throw new Error(result.code);
                    })
                  }
                >
                  {t("history.remove")}
                </button>
              ) : (
                <span className="text-xs text-on-surface-variant">{t("history.sourceClinician")}</span>
              )}
            </li>
          ))}
        </ul>
        <div className="flex flex-wrap gap-2">
          <Input
            value={conditionDisplay}
            onChange={(e) => setConditionDisplay(e.target.value)}
            placeholder={t("history.conditionDisplay")}
            className="max-w-sm"
          />
          <Button
            type="button"
            variant="soft"
            disabled={pending || !conditionDisplay.trim()}
            onClick={() =>
              run(async () => {
                const result = await emrUpsertCondition({
                  patientUserId,
                  display: conditionDisplay.trim(),
                  source,
                  status: "ACTIVE",
                });
                if (!result.ok) throw new Error(result.code);
                setConditionDisplay("");
              })
            }
          >
            {t("history.addCondition")}
          </Button>
        </div>
      </div>

      {/* Immunizations */}
      <div className="space-y-3">
        <h3 className="text-xs font-medium uppercase tracking-wide text-on-surface-variant">
          {t("history.immunizations")}
        </h3>
        <ul className="divide-y divide-outline-variant/15">
          {immunizations.map((im) => (
            <li key={im.id} className="flex items-center justify-between gap-3 py-2">
              <span className="text-sm text-primary">{im.vaccineName}</span>
              {patientEditable(im.source) ? (
                <button
                  type="button"
                  disabled={pending}
                  className="text-xs text-warm-coral underline disabled:opacity-50"
                  onClick={() =>
                    run(async () => {
                      const result = await emrSoftDeleteImmunization({
                        patientUserId,
                        id: im.id,
                        source,
                      });
                      if (!result.ok) throw new Error(result.code);
                    })
                  }
                >
                  {t("history.remove")}
                </button>
              ) : (
                <span className="text-xs text-on-surface-variant">{t("history.sourceClinician")}</span>
              )}
            </li>
          ))}
        </ul>
        <div className="flex flex-wrap gap-2">
          <Input
            value={vaccineName}
            onChange={(e) => setVaccineName(e.target.value)}
            placeholder={t("history.vaccineName")}
            className="max-w-sm"
          />
          <Button
            type="button"
            variant="soft"
            disabled={pending || !vaccineName.trim()}
            onClick={() =>
              run(async () => {
                const result = await emrUpsertImmunization({
                  patientUserId,
                  vaccineName: vaccineName.trim(),
                  source,
                });
                if (!result.ok) throw new Error(result.code);
                setVaccineName("");
              })
            }
          >
            {t("history.addImmunization")}
          </Button>
        </div>
      </div>

      {/* Family history */}
      <div className="space-y-3">
        <h3 className="text-xs font-medium uppercase tracking-wide text-on-surface-variant">
          {t("history.family")}
        </h3>
        <ul className="divide-y divide-outline-variant/15">
          {familyHistory.map((f) => (
            <li key={f.id} className="flex items-center justify-between gap-3 py-2">
              <span className="text-sm text-primary">
                {f.relation}: {f.conditionDisplay}
              </span>
              <button
                type="button"
                disabled={pending}
                className="text-xs text-warm-coral underline disabled:opacity-50"
                onClick={() =>
                  run(async () => {
                    const result = await emrSoftDeleteFamilyHistory({
                      patientUserId,
                      id: f.id,
                      source,
                    });
                    if (!result.ok) throw new Error(result.code);
                  })
                }
              >
                {t("history.remove")}
              </button>
            </li>
          ))}
        </ul>
        <div className="flex flex-wrap gap-2">
          <Input
            value={familyRelation}
            onChange={(e) => setFamilyRelation(e.target.value)}
            placeholder={t("history.familyRelation")}
            className="max-w-xs"
          />
          <Input
            value={familyCondition}
            onChange={(e) => setFamilyCondition(e.target.value)}
            placeholder={t("history.familyCondition")}
            className="max-w-sm"
          />
          <Button
            type="button"
            variant="soft"
            disabled={pending || !familyRelation.trim() || !familyCondition.trim()}
            onClick={() =>
              run(async () => {
                const result = await emrUpsertFamilyHistory({
                  patientUserId,
                  relation: familyRelation.trim(),
                  conditionDisplay: familyCondition.trim(),
                  source,
                });
                if (!result.ok) throw new Error(result.code);
                setFamilyRelation("");
                setFamilyCondition("");
              })
            }
          >
            {t("history.addFamily")}
          </Button>
        </div>
      </div>

      {/* Lifestyle */}
      <div className="space-y-3">
        <h3 className="text-xs font-medium uppercase tracking-wide text-on-surface-variant">
          {t("history.lifestyle")}
        </h3>
        <div className="grid gap-3 sm:grid-cols-2">
          <Input value={smoking} onChange={(e) => setSmoking(e.target.value)} placeholder={t("history.smoking")} />
          <Input value={alcohol} onChange={(e) => setAlcohol(e.target.value)} placeholder={t("history.alcohol")} />
          <Input value={activity} onChange={(e) => setActivity(e.target.value)} placeholder={t("history.activity")} />
          <Input value={lifeNotes} onChange={(e) => setLifeNotes(e.target.value)} placeholder={t("history.notes")} />
        </div>
        <Button
          type="button"
          variant="soft"
          disabled={pending}
          onClick={() =>
            run(async () => {
              const result = await emrUpdateLifestyle({
                patientUserId,
                smoking: smoking || null,
                alcohol: alcohol || null,
                activity: activity || null,
                notes: lifeNotes || null,
              });
              if (!result.ok) throw new Error(result.code);
            })
          }
        >
          {t("history.saveLifestyle")}
        </Button>
      </div>

      {/* Emergency */}
      <div className="space-y-3">
        <h3 className="text-xs font-medium uppercase tracking-wide text-on-surface-variant">
          {t("history.emergency")}
        </h3>
        <div className="grid gap-3 sm:grid-cols-2">
          <Input
            value={contactName}
            onChange={(e) => setContactName(e.target.value)}
            placeholder={t("history.emergencyContactName")}
          />
          <Input
            value={contactPhone}
            onChange={(e) => setContactPhone(e.target.value)}
            placeholder={t("history.emergencyContactPhone")}
          />
          <Input
            value={criticalText}
            onChange={(e) => setCriticalText(e.target.value)}
            placeholder={t("history.emergencyCriticalAlerts")}
            className="sm:col-span-2"
          />
        </div>
        <Button
          type="button"
          variant="soft"
          disabled={pending}
          onClick={() =>
            run(async () => {
              const result = await emrUpdateEmergencyInfo({
                patientUserId,
                contactName: contactName || null,
                contactPhone: contactPhone || null,
                criticalAlertsText: criticalText || null,
              });
              if (!result.ok) throw new Error(result.code);
            })
          }
        >
          {t("history.saveEmergency")}
        </Button>
      </div>
    </section>
  );
}
