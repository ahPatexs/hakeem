"use client";

import { useEffect, useState, useTransition } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Link } from "@/i18n/routing";
import { Button } from "@/components/ui/button";
import { AuthAlert } from "@/components/auth/auth-alert";
import { AuthField } from "@/components/auth/auth-field";
import { verifyEmail, resendVerificationEmail } from "@/actions/auth/verify-email";

export function VerifyEmailPanel({
  token,
  email,
}: {
  token?: string;
  email?: string;
}) {
  const t = useTranslations("auth");
  const locale = useLocale() as "en" | "ar";
  const [status, setStatus] = useState<"idle" | "success" | "error">("idle");
  const [message, setMessage] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [pending, startTransition] = useTransition();

  useEffect(() => {
    if (!token) return;
    startTransition(async () => {
      const result = await verifyEmail({ token });
      if (result.ok) {
        setStatus("success");
        setMessage(result.message ?? t("emailVerified"));
      } else {
        setStatus("error");
        setMessage(t(`errors.${result.code}` as "errors.TOKEN_INVALID"));
      }
    });
  }, [token, t]);

  function onResend(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setFieldErrors({});
    const value = String(new FormData(e.currentTarget).get("email") ?? email ?? "");
    startTransition(async () => {
      const result = await resendVerificationEmail({ email: value, locale });
      if (!result.ok) {
        setStatus("error");
        if (result.code === "VALIDATION_ERROR") {
          setFieldErrors({ email: t("errors.VALIDATION_ERROR") });
        }
        setMessage(t(`errors.${result.code}` as "errors.RATE_LIMITED"));
        return;
      }
      setStatus("success");
      setMessage(result.message ?? t("verifyResent"));
    });
  }

  return (
    <div className="space-y-4">
      {message ? (
        <AuthAlert variant={status === "error" ? "error" : "success"}>{message}</AuthAlert>
      ) : (
        <AuthAlert variant="info">{token ? t("verifying") : t("verifyPending")}</AuthAlert>
      )}
      {status === "success" && token ? (
        <Button asChild variant="auth" className="w-full">
          <Link href="/login">{t("signIn")}</Link>
        </Button>
      ) : null}
      <form onSubmit={onResend} className="space-y-3" noValidate>
        <AuthField
          id="verify-email"
          name="email"
          label={t("email")}
          type="email"
          defaultValue={email}
          required
          autoComplete="email"
          error={fieldErrors.email}
        />
        <Button type="submit" variant="authOutline" className="w-full" disabled={pending}>
          {pending ? t("loading") : t("resendVerification")}
        </Button>
      </form>
    </div>
  );
}
