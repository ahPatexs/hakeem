"use client";

import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { useRouter, Link } from "@/i18n/routing";
import { Button } from "@/components/ui/button";
import { updateDoctorSettings } from "@/actions/doctor/profile";
import type { PortalSettings } from "@prisma/client";

export function DoctorSettingsForm({ settings }: { settings: PortalSettings | null }) {
  const t = useTranslations("doctor.settings");
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [message, setMessage] = useState<string | null>(null);

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    startTransition(async () => {
      const res = await updateDoctorSettings({
        locale: fd.get("locale") as "EN" | "AR",
        theme: fd.get("theme") as "system" | "light" | "dark",
        notifyAppointmentEmail: fd.get("notifyAppointmentEmail") === "on",
        notifyClinicalEmail: fd.get("notifyClinicalEmail") === "on",
        notifyPrescriptionEmail: fd.get("notifyPrescriptionEmail") === "on",
        notifySystemEmail: fd.get("notifySystemEmail") === "on",
      });
      setMessage(res.ok ? t("saved") : t("error"));
      if (res.ok) router.refresh();
    });
  }

  return (
    <div className="space-y-6">
      <form onSubmit={handleSubmit} className="glass-card space-y-6 rounded-2xl border border-outline-variant/20 bg-surface-container-low p-6">
        <h2 className="font-headline text-lg text-primary">{t("preferences")}</h2>
        <label className="block space-y-1.5">
          <span className="text-sm font-medium text-on-surface-variant">{t("locale")}</span>
          <select
            name="locale"
            defaultValue={settings?.locale ?? "AR"}
            className="flex h-10 w-full rounded-xl border border-outline-variant/30 bg-surface-container-low px-3 text-sm"
          >
            <option value="AR">{t("localeAr")}</option>
            <option value="EN">{t("localeEn")}</option>
          </select>
        </label>
        <label className="block space-y-1.5">
          <span className="text-sm font-medium text-on-surface-variant">{t("theme")}</span>
          <select
            name="theme"
            defaultValue={settings?.theme ?? "system"}
            className="flex h-10 w-full rounded-xl border border-outline-variant/30 bg-surface-container-low px-3 text-sm"
          >
            <option value="system">{t("themeSystem")}</option>
            <option value="light">{t("themeLight")}</option>
            <option value="dark">{t("themeDark")}</option>
          </select>
        </label>

        <fieldset className="space-y-3">
          <legend className="text-sm font-medium text-on-surface-variant">{t("notifications")}</legend>
          <Toggle name="notifyAppointmentEmail" label={t("notifyAppointments")} defaultChecked={settings?.notifyAppointmentEmail ?? true} />
          <Toggle name="notifyClinicalEmail" label={t("notifyClinical")} defaultChecked={settings?.notifyClinicalEmail ?? true} />
          <Toggle name="notifyPrescriptionEmail" label={t("notifyPrescriptions")} defaultChecked={settings?.notifyPrescriptionEmail ?? true} />
          <Toggle name="notifySystemEmail" label={t("notifySystem")} defaultChecked={settings?.notifySystemEmail ?? true} />
        </fieldset>

        {message ? <p className="text-sm text-med-green">{message}</p> : null}
        <Button type="submit" disabled={pending}>
          {pending ? t("save") + "…" : t("save")}
        </Button>
      </form>

      <section className="glass-card space-y-3 rounded-2xl border border-outline-variant/20 bg-surface-container-low p-6">
        <h2 className="font-headline text-lg text-primary">{t("security")}</h2>
        <p className="text-sm text-on-surface-variant">{t("securityHint")}</p>
        <div className="flex flex-wrap gap-3">
          <Button asChild variant="outline">
            <Link href="/account/change-password">{t("changePassword")}</Link>
          </Button>
          <Button asChild variant="outline">
            <Link href="/account/sessions">{t("manageSessions")}</Link>
          </Button>
        </div>
      </section>
    </div>
  );
}

function Toggle({ name, label, defaultChecked }: { name: string; label: string; defaultChecked: boolean }) {
  return (
    <label className="flex items-center gap-3 text-sm">
      <input type="checkbox" name={name} defaultChecked={defaultChecked} className="h-4 w-4 rounded" />
      {label}
    </label>
  );
}
