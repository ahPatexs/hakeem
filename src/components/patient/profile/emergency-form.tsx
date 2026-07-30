"use client";

import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "@/i18n/routing";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { updatePatientProfile } from "@/actions/patient/profile";
import type { PatientProfile } from "@prisma/client";

export function EmergencyForm({ profile }: { profile: PatientProfile | null }) {
  const t = useTranslations("patient.profile");
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [message, setMessage] = useState<string | null>(null);

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    startTransition(async () => {
      const result = await updatePatientProfile({
        emergencyContactName: (fd.get("emergencyContactName") as string) || null,
        emergencyContactPhone: (fd.get("emergencyContactPhone") as string) || null,
      });
      setMessage(result.ok ? t("saved") : t("error"));
      if (result.ok) router.refresh();
    });
  }

  return (
    <form onSubmit={handleSubmit} className="glass-card space-y-4 rounded-2xl border border-outline-variant/20 p-6">
      <h2 className="font-headline text-lg text-primary">{t("emergencyTitle")}</h2>
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="block space-y-1.5">
          <span className="text-sm font-medium text-on-surface-variant">{t("emergencyName")}</span>
          <Input name="emergencyContactName" defaultValue={profile?.emergencyContactName ?? ""} />
        </label>
        <label className="block space-y-1.5">
          <span className="text-sm font-medium text-on-surface-variant">{t("emergencyPhone")}</span>
          <Input name="emergencyContactPhone" defaultValue={profile?.emergencyContactPhone ?? ""} />
        </label>
      </div>
      {message ? <p className="text-sm text-med-green">{message}</p> : null}
      <Button type="submit" variant="soft" disabled={pending}>
        {pending ? t("saving") : t("save")}
      </Button>
    </form>
  );
}

export function InsuranceForm({ profile }: { profile: PatientProfile | null }) {
  const t = useTranslations("patient.profile");
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [message, setMessage] = useState<string | null>(null);

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    startTransition(async () => {
      const result = await updatePatientProfile({
        insuranceProvider: (fd.get("insuranceProvider") as string) || null,
        insurancePolicyNumber: (fd.get("insurancePolicyNumber") as string) || null,
      });
      setMessage(result.ok ? t("saved") : t("error"));
      if (result.ok) router.refresh();
    });
  }

  return (
    <form onSubmit={handleSubmit} className="glass-card space-y-4 rounded-2xl border border-outline-variant/20 p-6">
      <h2 className="font-headline text-lg text-primary">{t("insuranceTitle")}</h2>
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="block space-y-1.5">
          <span className="text-sm font-medium text-on-surface-variant">{t("insuranceProvider")}</span>
          <Input name="insuranceProvider" defaultValue={profile?.insuranceProvider ?? ""} />
        </label>
        <label className="block space-y-1.5">
          <span className="text-sm font-medium text-on-surface-variant">{t("insurancePolicy")}</span>
          <Input name="insurancePolicyNumber" defaultValue={profile?.insurancePolicyNumber ?? ""} />
        </label>
      </div>
      {message ? <p className="text-sm text-med-green">{message}</p> : null}
      <Button type="submit" variant="soft" disabled={pending}>
        {pending ? t("saving") : t("save")}
      </Button>
    </form>
  );
}
