"use client";

import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { usePathname, useRouter, Link } from "@/i18n/routing";
import { Button } from "@/components/ui/button";
import { THEME_COOKIE, type ThemePreference } from "@/lib/platform/theme";
import { PushDeviceRegistration } from "@/components/patient/settings/push-device-registration";
import { portalCardClass } from "@/components/portal/chrome";
import { cn } from "@/lib/utils";

export type PortalSettingsValues = {
  locale: "EN" | "AR" | null;
  theme: string | null;
  notifyAppointmentEmail: boolean | null;
  notifyClinicalEmail: boolean | null;
  notifyPrescriptionEmail: boolean | null;
  notifyPaymentEmail?: boolean | null;
  notifySystemEmail: boolean | null;
};

type SaveResult = { ok: true } | { ok: false; code?: string };

export function PortalSettingsForm({
  settings,
  namespace,
  showPaymentNotify = false,
  showPush = false,
  onSave,
}: {
  settings: PortalSettingsValues | null;
  namespace: "patient.settings" | "doctor.settings" | "admin.settings";
  showPaymentNotify?: boolean;
  showPush?: boolean;
  onSave: (input: {
    locale: "EN" | "AR";
    theme: ThemePreference;
    notifyAppointmentEmail: boolean;
    notifyClinicalEmail: boolean;
    notifyPrescriptionEmail: boolean;
    notifySystemEmail: boolean;
    notifyPaymentEmail?: boolean;
  }) => Promise<SaveResult>;
}) {
  const t = useTranslations(namespace);
  const router = useRouter();
  const pathname = usePathname();
  const [pending, startTransition] = useTransition();
  const [message, setMessage] = useState<"saved" | "error" | null>(null);

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const locale = fd.get("locale") === "EN" ? "EN" : "AR";
    const theme = (fd.get("theme") as ThemePreference) || "system";
    const payload = {
      locale,
      theme,
      notifyAppointmentEmail: fd.get("notifyAppointmentEmail") === "on",
      notifyClinicalEmail: fd.get("notifyClinicalEmail") === "on",
      notifyPrescriptionEmail: fd.get("notifyPrescriptionEmail") === "on",
      notifySystemEmail: fd.get("notifySystemEmail") === "on",
      ...(showPaymentNotify
        ? { notifyPaymentEmail: fd.get("notifyPaymentEmail") === "on" }
        : {}),
    };

    startTransition(async () => {
      const result = await onSave(payload);
      setMessage(result.ok ? "saved" : "error");
      if (!result.ok) return;
      document.cookie = `${THEME_COOKIE}=${theme}; Path=/; Max-Age=31536000; SameSite=Lax`;
      const dark =
        theme === "dark" ||
        (theme !== "light" && window.matchMedia("(prefers-color-scheme: dark)").matches);
      document.documentElement.classList.toggle("dark", dark);
      const nextLocale = locale === "EN" ? "en" : "ar";
      router.replace(pathname, { locale: nextLocale });
      router.refresh();
    });
  }

  return (
    <div className="space-y-6">
      <form onSubmit={handleSubmit} className={cn(portalCardClass, "space-y-6 p-6")}>
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
          <Toggle
            name="notifyAppointmentEmail"
            label={t("notifyAppointments")}
            defaultChecked={settings?.notifyAppointmentEmail ?? true}
          />
          <Toggle
            name="notifyClinicalEmail"
            label={t("notifyClinical")}
            defaultChecked={settings?.notifyClinicalEmail ?? true}
          />
          <Toggle
            name="notifyPrescriptionEmail"
            label={t("notifyPrescriptions")}
            defaultChecked={settings?.notifyPrescriptionEmail ?? true}
          />
          {showPaymentNotify ? (
            <Toggle
              name="notifyPaymentEmail"
              label={t("notifyPayments")}
              defaultChecked={settings?.notifyPaymentEmail ?? true}
            />
          ) : null}
          <Toggle
            name="notifySystemEmail"
            label={t("notifySystem")}
            defaultChecked={settings?.notifySystemEmail ?? true}
          />
        </fieldset>

        {message ? (
          <p className={cn("text-sm", message === "saved" ? "text-med-green" : "text-red-600")}>
            {t(message)}
          </p>
        ) : null}
        <Button type="submit" disabled={pending}>
          {pending ? t("saving") : t("save")}
        </Button>
      </form>

      {showPush ? <PushDeviceRegistration /> : null}

      <section className={cn(portalCardClass, "space-y-3 p-6")}>
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

function Toggle({
  name,
  label,
  defaultChecked,
}: {
  name: string;
  label: string;
  defaultChecked: boolean;
}) {
  return (
    <label className="flex items-center gap-3 text-sm">
      <input type="checkbox" name={name} defaultChecked={defaultChecked} className="h-4 w-4 rounded" />
      {label}
    </label>
  );
}
