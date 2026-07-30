"use client";

import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { AuthAlert } from "@/components/auth/auth-alert";
import { changePassword } from "@/actions/auth/password";

export function ChangePasswordForm() {
  const t = useTranslations("auth");
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    startTransition(async () => {
      const result = await changePassword({
        currentPassword: String(fd.get("currentPassword") ?? ""),
        newPassword: String(fd.get("newPassword") ?? ""),
      });
      if (!result.ok) {
        setError(t(`errors.${result.code}` as "errors.INVALID_CREDENTIALS"));
        return;
      }
      setError(null);
      setMessage(result.message ?? t("passwordUpdated"));
    });
  }

  return (
    <form onSubmit={onSubmit} className="glass-card space-y-4 rounded-2xl p-6">
      {message ? <AuthAlert variant="success">{message}</AuthAlert> : null}
      {error ? <AuthAlert variant="error">{error}</AuthAlert> : null}
      <Input name="currentPassword" type="password" placeholder={t("currentPassword")} required />
      <Input name="newPassword" type="password" placeholder={t("newPassword")} required />
      <p className="text-xs text-on-surface-variant">{t("passwordHint")}</p>
      <Button type="submit" disabled={pending} className="w-full">
        {pending ? t("loading") : t("updatePassword")}
      </Button>
    </form>
  );
}
