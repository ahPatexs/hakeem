"use client";

import { useState, useTransition } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Link } from "@/i18n/routing";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { AuthAlert } from "@/components/auth/auth-alert";
import { requestPasswordReset, resetPassword } from "@/actions/auth/password";

export function ForgotPasswordForm() {
  const t = useTranslations("auth");
  const locale = useLocale() as "en" | "ar";
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    const email = String(new FormData(e.currentTarget).get("email") ?? "");
    startTransition(async () => {
      const result = await requestPasswordReset({ email, locale });
      if (!result.ok) {
        setError(t(`errors.${result.code}` as "errors.RATE_LIMITED"));
        return;
      }
      setMessage(result.message ?? t("resetSent"));
    });
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      {message ? <AuthAlert variant="success">{message}</AuthAlert> : null}
      {error ? <AuthAlert variant="error">{error}</AuthAlert> : null}
      <div className="space-y-2">
        <label htmlFor="email" className="text-sm font-medium text-primary">
          {t("email")}
        </label>
        <Input id="email" name="email" type="email" required />
      </div>
      <Button type="submit" className="w-full" disabled={pending}>
        {pending ? t("loading") : t("sendResetLink")}
      </Button>
      <p className="text-center text-sm">
        <Link href="/login" className="text-primary hover:underline">
          {t("backToLogin")}
        </Link>
      </p>
    </form>
  );
}

export function ResetPasswordForm({ token }: { token: string }) {
  const t = useTranslations("auth");
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    const password = String(new FormData(e.currentTarget).get("password") ?? "");
    startTransition(async () => {
      const result = await resetPassword({ token, password });
      if (!result.ok) {
        setError(t(`errors.${result.code}` as "errors.TOKEN_INVALID"));
        return;
      }
      setMessage(result.message ?? t("passwordUpdated"));
    });
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      {message ? (
        <AuthAlert variant="success">
          {message}{" "}
          <Link href="/login" className="font-semibold underline">
            {t("signIn")}
          </Link>
        </AuthAlert>
      ) : null}
      {error ? <AuthAlert variant="error">{error}</AuthAlert> : null}
      <div className="space-y-2">
        <label htmlFor="password" className="text-sm font-medium text-primary">
          {t("newPassword")}
        </label>
        <Input id="password" name="password" type="password" required autoComplete="new-password" />
        <p className="text-xs text-on-surface-variant">{t("passwordHint")}</p>
      </div>
      <Button type="submit" className="w-full" disabled={pending || Boolean(message)}>
        {pending ? t("loading") : t("updatePassword")}
      </Button>
    </form>
  );
}
