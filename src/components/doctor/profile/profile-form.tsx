"use client";

import { useRef, useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "@/i18n/routing";
import { Button } from "@/components/ui/button";
import { PersonAvatar } from "@/components/portal/person-avatar";
import { updateDoctorProfile, uploadDoctorPhoto } from "@/actions/doctor/profile";

export function DoctorProfileForm({
  bio,
  languages,
  timezone,
}: {
  bio: string | null;
  languages: string[];
  timezone: string | null;
}) {
  const t = useTranslations("doctor.profile");
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [message, setMessage] = useState<string | null>(null);

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const langs = String(fd.get("languages") ?? "")
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);
    startTransition(async () => {
      const res = await updateDoctorProfile({
        bio: String(fd.get("bio") ?? "").trim() || undefined,
        languages: langs,
        timezone: String(fd.get("timezone") ?? "").trim() || undefined,
      });
      setMessage(res.ok ? t("saved") : t("error"));
      if (res.ok) router.refresh();
    });
  }

  return (
    <form onSubmit={handleSubmit} className="glass-card space-y-4 rounded-2xl border border-outline-variant/20 bg-surface-container-low p-5">
      <label className="block space-y-1">
        <span className="text-sm font-medium text-on-surface-variant">{t("bio")}</span>
        <textarea
          name="bio"
          rows={4}
          defaultValue={bio ?? ""}
          className="w-full rounded-xl border border-outline-variant/30 bg-surface-container-low px-3 py-2 text-sm outline-none focus:border-primary"
        />
      </label>
      <label className="block space-y-1">
        <span className="text-sm font-medium text-on-surface-variant">{t("languages")}</span>
        <input
          type="text"
          name="languages"
          defaultValue={languages.join(", ")}
          className="h-10 w-full rounded-xl border border-outline-variant/30 bg-surface-container-low px-3 text-sm outline-none focus:border-primary"
        />
      </label>
      <label className="block space-y-1">
        <span className="text-sm font-medium text-on-surface-variant">{t("timezone")}</span>
        <input
          type="text"
          name="timezone"
          defaultValue={timezone ?? ""}
          placeholder="Asia/Riyadh"
          className="h-10 w-full rounded-xl border border-outline-variant/30 bg-surface-container-low px-3 text-sm outline-none focus:border-primary"
        />
      </label>
      {message ? <p className="text-sm text-med-green">{message}</p> : null}
      <Button type="submit" disabled={pending}>
        {pending ? t("save") + "…" : t("save")}
      </Button>
    </form>
  );
}

export function DoctorPhotoUpload({
  name,
  photoUrl,
}: {
  name: string;
  photoUrl?: string | null;
}) {
  const t = useTranslations("doctor.profile");
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
      const result = await uploadDoctorPhoto(fd);
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
