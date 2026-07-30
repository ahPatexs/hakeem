"use client";

import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "@/i18n/routing";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { updateMedicalProfile } from "@/actions/patient/medical-profile";
import type { MedicalProfile } from "@prisma/client";

function listToString(items: string[]) {
  return items.join(", ");
}

function stringToList(value: string) {
  return value
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
}

export function MedicalProfileForm({ profile }: { profile: MedicalProfile | null }) {
  const t = useTranslations("patient.medicalProfile");
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [message, setMessage] = useState<string | null>(null);

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    startTransition(async () => {
      const result = await updateMedicalProfile({
        bloodType: (fd.get("bloodType") as string) || null,
        allergies: stringToList(fd.get("allergies") as string),
        conditions: stringToList(fd.get("conditions") as string),
        currentMedications: stringToList(fd.get("currentMedications") as string),
        notes: (fd.get("notes") as string) || null,
      });
      setMessage(result.ok ? t("saved") : t("error"));
      if (result.ok) router.refresh();
    });
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <section className="glass-card space-y-4 rounded-2xl border border-outline-variant/20 p-6">
        <h2 className="font-headline text-lg text-primary">{t("title")}</h2>
        <p className="text-sm text-on-surface-variant">{t("disclaimer")}</p>
        <div className="grid gap-4">
          <Field label={t("bloodType")} name="bloodType" defaultValue={profile?.bloodType ?? ""} />
          <Field
            label={t("allergies")}
            name="allergies"
            defaultValue={listToString(profile?.allergies ?? [])}
            hint={t("commaSeparated")}
          />
          <Field
            label={t("conditions")}
            name="conditions"
            defaultValue={listToString(profile?.conditions ?? [])}
            hint={t("commaSeparated")}
          />
          <Field
            label={t("medications")}
            name="currentMedications"
            defaultValue={listToString(profile?.currentMedications ?? [])}
            hint={t("commaSeparated")}
          />
          <label className="block space-y-1.5">
            <span className="text-sm font-medium text-on-surface-variant">{t("notes")}</span>
            <textarea
              name="notes"
              rows={4}
              defaultValue={profile?.notes ?? ""}
              className="flex w-full rounded-xl border border-outline-variant/30 bg-background px-3 py-2 text-sm"
            />
          </label>
        </div>
        {message ? <p className="text-sm text-med-green">{message}</p> : null}
        <Button type="submit" variant="soft" disabled={pending}>
          {pending ? t("saving") : t("save")}
        </Button>
      </section>
    </form>
  );
}

function Field({
  label,
  name,
  defaultValue,
  hint,
}: {
  label: string;
  name: string;
  defaultValue?: string;
  hint?: string;
}) {
  return (
    <label className="block space-y-1.5">
      <span className="text-sm font-medium text-on-surface-variant">{label}</span>
      <Input name={name} defaultValue={defaultValue} />
      {hint ? <span className="text-xs text-on-surface-variant">{hint}</span> : null}
    </label>
  );
}
