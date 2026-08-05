"use client";

import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "@/i18n/routing";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { updatePatientProfile } from "@/actions/patient/profile";
import type { PatientProfile } from "@prisma/client";

export function PersonalForm({
  profile,
  name,
}: {
  profile: PatientProfile | null;
  name: string;
}) {
  const t = useTranslations("patient.profile");
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [message, setMessage] = useState<string | null>(null);

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const dob = fd.get("dateOfBirth") as string;
    startTransition(async () => {
      const result = await updatePatientProfile({
        name: String(fd.get("name") ?? "").trim(),
        phone: (fd.get("phone") as string) || null,
        dateOfBirth: dob ? new Date(dob).toISOString() : null,
        sexAtBirth: (fd.get("sexAtBirth") as string) || null,
        addressLine1: (fd.get("addressLine1") as string) || null,
        city: (fd.get("city") as string) || null,
        region: (fd.get("region") as string) || null,
      });
      setMessage(result.ok ? t("saved") : t("error"));
      if (result.ok) router.refresh();
    });
  }

  const dobValue = profile?.dateOfBirth
    ? new Date(profile.dateOfBirth).toISOString().slice(0, 10)
    : "";

  return (
    <form onSubmit={handleSubmit} className="glass-card space-y-4 rounded-2xl border border-outline-variant/20 p-6">
      <h2 className="font-headline text-lg text-primary">{t("personalTitle")}</h2>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label={t("fullName")} name="name" defaultValue={name} required className="sm:col-span-2" />
        <Field label={t("phone")} name="phone" defaultValue={profile?.phone ?? ""} />
        <Field label={t("dateOfBirth")} name="dateOfBirth" type="date" defaultValue={dobValue} />
        <Field label={t("sexAtBirth")} name="sexAtBirth" defaultValue={profile?.sexAtBirth ?? ""} />
        <Field label={t("address")} name="addressLine1" defaultValue={profile?.addressLine1 ?? ""} />
        <Field label={t("city")} name="city" defaultValue={profile?.city ?? ""} />
        <Field label={t("region")} name="region" defaultValue={profile?.region ?? ""} />
      </div>
      {message ? <p className="text-sm text-med-green">{message}</p> : null}
      <Button type="submit" variant="soft" disabled={pending}>
        {pending ? t("saving") : t("save")}
      </Button>
    </form>
  );
}

function Field({
  label,
  name,
  type = "text",
  defaultValue,
  required,
  className,
}: {
  label: string;
  name: string;
  type?: string;
  defaultValue?: string;
  required?: boolean;
  className?: string;
}) {
  return (
    <label className={`block space-y-1.5 ${className ?? ""}`}>
      <span className="text-sm font-medium text-on-surface-variant">{label}</span>
      <Input name={name} type={type} defaultValue={defaultValue} required={required} />
    </label>
  );
}
