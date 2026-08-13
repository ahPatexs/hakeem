"use client";

import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { AuthAlert } from "@/components/auth/auth-alert";
import { AuthField } from "@/components/auth/auth-field";
import { changePassword } from "@/actions/auth/password";

export function ChangePasswordForm() {
  const t = useTranslations("auth");
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [pending, startTransition] = useTransition();

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    const fd = new FormData(e.currentTarget);
    const newPassword = String(fd.get("newPassword") ?? "");
    const confirmPassword = String(fd.get("confirmPassword") ?? "");

    if (newPassword !== confirmPassword) {
      setFieldErrors({ confirmPassword: t("passwordsDoNotMatch") });
      return;
    }

    setFieldErrors({});
    const form = e.currentTarget;
    startTransition(async () => {
      const result = await changePassword({
        currentPassword: String(fd.get("currentPassword") ?? ""),
        newPassword,
      });
      if (!result.ok) {
        if (result.code === "PASSWORD_POLICY") {
          setFieldErrors({ newPassword: t("errors.PASSWORD_POLICY") });
        } else if (result.code === "INVALID_CREDENTIALS") {
          setFieldErrors({ currentPassword: t("errors.INVALID_CREDENTIALS") });
        }
        setError(t(`errors.${result.code}` as "errors.INVALID_CREDENTIALS"));
        return;
      }
      setError(null);
      setMessage(result.message ?? t("passwordUpdated"));
      form.reset();
    });
  }

  return (
    <form onSubmit={onSubmit} className="glass-card space-y-4 rounded-2xl p-6" noValidate>
      {message ? <AuthAlert variant="success">{message}</AuthAlert> : null}
      {error ? <AuthAlert variant="error">{error}</AuthAlert> : null}
      <AuthField
        id="currentPassword"
        name="currentPassword"
        label={t("currentPassword")}
        type="password"
        required
        autoComplete="current-password"
        error={fieldErrors.currentPassword}
      />
      <AuthField
        id="newPassword"
        name="newPassword"
        label={t("newPassword")}
        type="password"
        required
        autoComplete="new-password"
        hint={t("passwordHint")}
        error={fieldErrors.newPassword}
      />
      <AuthField
        id="confirmPassword"
        name="confirmPassword"
        label={t("confirmPassword")}
        type="password"
        required
        autoComplete="new-password"
        error={fieldErrors.confirmPassword}
      />
      <Button type="submit" disabled={pending} className="w-full">
        {pending ? t("loading") : t("updatePassword")}
      </Button>
    </form>
  );
}
