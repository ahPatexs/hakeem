"use client";

import { useRef, useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "@/i18n/routing";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { PersonAvatar } from "@/components/portal/person-avatar";
import { updatePatientProfile, uploadPatientPhoto } from "@/actions/patient/profile";
import type { PatientProfile } from "@prisma/client";

export function PersonalForm({
  profile,
  name,
  photoUrl,
}: {
  profile: PatientProfile | null;
  name: string;
  photoUrl?: string | null;
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
      <PatientPhotoUpload name={name} photoUrl={photoUrl} />
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

export function PatientPhotoUpload({
  name,
  photoUrl,
}: {
  name: string;
  photoUrl?: string | null;
}) {
  const t = useTranslations("patient.profile");
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [pending, startTransition] = useTransition();
  const [preview, setPreview] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  function handleFile(file: File | undefined) {
    if (!file) return;
    setError(null);
    setMessage(null);
    setPreview(URL.createObjectURL(file));
    const fd = new FormData();
    fd.set("photo", file);
    startTransition(async () => {
      const result = await uploadPatientPhoto(fd);
      if (!result.ok) {
        setError(t("photoError"));
        setPreview(null);
        return;
      }
      setMessage(t("photoSaved"));
      router.refresh();
    });
  }

  return (
    <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
      <PersonAvatar name={name} photoUrl={preview ?? photoUrl} size="lg" className="h-20 w-20 text-2xl" />
      <div className="space-y-2">
        <p className="text-sm font-medium text-primary">{t("photo")}</p>
        <p className="text-xs text-on-surface-variant">{t("photoHint")}</p>
        <input
          ref={inputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp,image/gif"
          className="sr-only"
          onChange={(e) => handleFile(e.target.files?.[0])}
        />
        <Button
          type="button"
          variant="soft"
          className="rounded-full"
          disabled={pending}
          onClick={() => inputRef.current?.click()}
        >
          {pending ? t("photoUploading") : t("photoUpload")}
        </Button>
        {error ? (
          <p className="text-sm text-red-600" role="alert">
            {error}
          </p>
        ) : null}
        {message ? <p className="text-sm text-med-green">{message}</p> : null}
      </div>
    </div>
  );
}
