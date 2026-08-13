"use client";

import { useState, useTransition } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Link } from "@/i18n/routing";
import { Button } from "@/components/ui/button";
import { AuthAlert } from "@/components/auth/auth-alert";
import { AuthField } from "@/components/auth/auth-field";
import { requestPasswordReset, resetPassword } from "@/actions/auth/password";

export function ForgotPasswordForm() {
  const t = useTranslations("auth");
  const locale = useLocale() as "en" | "ar";
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [pending, startTransition] = useTransition();

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setFieldErrors({});
    const email = String(new FormData(e.currentTarget).get("email") ?? "");
    startTransition(async () => {
      const result = await requestPasswordReset({ email, locale });
      if (!result.ok) {
        if (result.code === "VALIDATION_ERROR") {
          setFieldErrors({ email: t("errors.VALIDATION_ERROR") });
        }
        setError(t(`errors.${result.code}` as "errors.RATE_LIMITED"));
        return;
      }
      setMessage(result.message ?? t("resetSent"));
    });
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4" noValidate>
      {message ? <AuthAlert variant="success">{message}</AuthAlert> : null}
      {error ? <AuthAlert variant="error">{error}</AuthAlert> : null}
      <AuthField
        id="email"
        name="email"
        label={t("email")}
        type="email"
        required
        autoComplete="email"
        error={fieldErrors.email}
      />
      <Button type="submit" variant="auth" className="w-full" disabled={pending || Boolean(message)}>
        {pending ? t("loading") : t("sendResetLink")}
      </Button>
      <p className="text-center text-sm">
        <Link href="/login" className="hover:underline">
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
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [pending, startTransition] = useTransition();

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    const fd = new FormData(e.currentTarget);
    const password = String(fd.get("password") ?? "");
    const confirmPassword = String(fd.get("confirmPassword") ?? "");

    if (password !== confirmPassword) {
      setFieldErrors({ confirmPassword: t("passwordsDoNotMatch") });
      return;
    }

    setFieldErrors({});
    startTransition(async () => {
      const result = await resetPassword({ token, password });
      if (!result.ok) {
        if (result.code === "PASSWORD_POLICY") {
          setFieldErrors({ password: t("errors.PASSWORD_POLICY") });
        }
        setError(t(`errors.${result.code}` as "errors.TOKEN_INVALID"));
        return;
      }
      setMessage(result.message ?? t("passwordUpdated"));
    });
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4" noValidate>
      {message ? (
        <AuthAlert variant="success">
          {message}{" "}
          <Link href="/login" className="font-semibold underline">
            {t("signIn")}
          </Link>
        </AuthAlert>
      ) : null}
      {error ? <AuthAlert variant="error">{error}</AuthAlert> : null}
      <AuthField
        id="password"
        name="password"
        label={t("newPassword")}
        type="password"
        required
        autoComplete="new-password"
        hint={t("passwordHint")}
        error={fieldErrors.password}
        disabled={Boolean(message)}
      />
      <AuthField
        id="confirmPassword"
        name="confirmPassword"
        label={t("confirmPassword")}
        type="password"
        required
        autoComplete="new-password"
        error={fieldErrors.confirmPassword}
        disabled={Boolean(message)}
      />
      <Button type="submit" variant="auth" className="w-full" disabled={pending || Boolean(message)}>
        {pending ? t("loading") : t("updatePassword")}
      </Button>
    </form>
  );
}
